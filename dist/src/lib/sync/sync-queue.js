"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncQueue = void 0;
const local_database_service_js_1 = require("../database/local-database-service.js");
const err_js_1 = require("../../error/err.js");
class SyncQueue {
    constructor() {
        this.operations = new Map();
        this.isProcessing = false;
        this.localDb = local_database_service_js_1.LocalDatabaseService.getInstance();
        // Tier queues
        this.operations.set("critical", []);
        this.operations.set("important", []);
        this.operations.set("administrative", []);
    }
    /**
     * Initialize the queue by loading operations from persistent storage
     */
    async initialize() {
        try {
            console.log("SyncQueue: Initializing queue...");
            await this.createQueueTable();
            // Load pending operations from database
            await this.loadPersistedOperations();
            console.log("SyncQueue: Initialization complete");
        }
        catch (error) {
            throw new err_js_1.SyncError("Failed to initialize sync queue", "queue_init", (0, err_js_1.normalizeError)(error));
        }
    }
    /**
     * Add operation to the queue
     */
    async addOperation(operation, tier) {
        const queuedOp = {
            ...operation,
            tier,
            retryCount: 0,
        };
        const tierQueue = this.operations.get(tier);
        tierQueue.push(queuedOp);
        await this.persistOperation(queuedOp);
        console.log(`SyncQueue: Added ${tier} operation for ${operation.tableName}:${operation.recordId}`);
    }
    /**
     * Process all queued operations
     */
    async processQueue(remoteDb) {
        if (this.isProcessing) {
            return { success: false, error: "Queue processing already in progress" };
        }
        this.isProcessing = true;
        try {
            console.log("SyncQueue: Processing queue...");
            let totalPushed = 0;
            let totalPulled = 0;
            const tiers = ["critical", "important", "administrative"];
            for (const tier of tiers) {
                const result = await this.processTierQueue(tier, remoteDb);
                totalPushed += result.pushedRecords || 0;
                totalPulled += result.pulledRecords || 0;
            }
            await this.cleanupCompletedOperations();
            console.log(`SyncQueue: Processed queue - pushed: ${totalPushed}, pulled: ${totalPulled}`);
            return {
                success: true,
                pushedRecords: totalPushed,
                pulledRecords: totalPulled,
            };
        }
        catch (error) {
            console.error("SyncQueue: Queue processing failed:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Queue processing failed",
            };
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Get count of pending operations by tier
     */
    getPendingCount(tier) {
        if (tier) {
            return this.operations.get(tier)?.length || 0;
        }
        // Return total count across all tiers
        return Array.from(this.operations.values()).reduce((total, queue) => total + queue.length, 0);
    }
    /**
     * Get all pending operations for inspection
     */
    getPendingOperations() {
        const allOps = [];
        for (const queue of this.operations.values()) {
            allOps.push(...queue);
        }
        return allOps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    /**
     * Clear all operations (useful for testing or emergency reset)
     */
    async clearQueue() {
        console.log("SyncQueue: Clearing all operations...");
        // Clear in-memory queues
        for (const queue of this.operations.values()) {
            queue.length = 0;
        }
        // Clear persistent storage
        try {
            await this.localDb.runRawSQL("DELETE FROM sync_queue");
            console.log("SyncQueue: Queue cleared");
        }
        catch (error) {
            console.error("SyncQueue: Failed to clear persistent queue:", error);
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log("SyncQueue: Cleaning up...");
        // Save any remaining operations
        for (const tier of this.operations.keys()) {
            const queue = this.operations.get(tier);
            for (const op of queue) {
                await this.persistOperation(op);
            }
        }
        console.log("SyncQueue: Cleanup completed");
    }
    async createQueueTable() {
        try {
            await this.localDb.runRawSQL(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT NOT NULL,
          tier TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          next_retry_at TEXT,
          last_error TEXT,
          timestamp TEXT NOT NULL
        )
      `);
        }
        catch (error) {
            throw new err_js_1.SyncError("Failed to create sync queue table", "queue_table", (0, err_js_1.normalizeError)(error));
        }
    }
    async loadPersistedOperations() {
        try {
            const now = new Date().toISOString();
            // Load operations that are ready to retry (past their retry time)
            const operations = (await this.localDb.executeRawSQL(`
          SELECT * FROM sync_queue 
          WHERE next_retry_at IS NULL OR next_retry_at <= ?
          ORDER BY timestamp ASC
        `, [now]));
            for (const op of operations) {
                const queuedOp = {
                    id: op.id,
                    type: op.type,
                    tableName: op.table_name,
                    recordId: op.record_id,
                    data: JSON.parse(op.data),
                    timestamp: op.timestamp,
                    tier: op.tier,
                    retryCount: op.retry_count,
                    nextRetryAt: op.next_retry_at || undefined,
                    lastError: op.last_error || undefined,
                };
                const tierQueue = this.operations.get(queuedOp.tier);
                tierQueue.push(queuedOp);
            }
            console.log(`SyncQueue: Loaded ${operations.length} persisted operations`);
        }
        catch (error) {
            console.error("SyncQueue: Failed to load persisted operations:", error);
        }
    }
    async persistOperation(operation) {
        try {
            await this.localDb.runRawSQL(`
        INSERT OR REPLACE INTO sync_queue 
        (id, type, table_name, record_id, data, tier, retry_count, next_retry_at, last_error, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                operation.id,
                operation.type,
                operation.tableName,
                operation.recordId,
                JSON.stringify(operation.data),
                operation.tier,
                operation.retryCount,
                operation.nextRetryAt || null,
                operation.lastError || null,
                operation.timestamp,
            ]);
        }
        catch (error) {
            console.error("SyncQueue: Failed to persist operation:", error);
        }
    }
    async processTierQueue(tier, remoteDb) {
        const queue = this.operations.get(tier);
        if (queue.length === 0) {
            return { success: true, pushedRecords: 0, pulledRecords: 0 };
        }
        console.log(`SyncQueue: Processing ${queue.length} ${tier} operations`);
        let pushedRecords = 0;
        let pulledRecords = 0;
        const completedOps = [];
        const batchSize = this.getBatchSize(tier);
        for (let i = 0; i < queue.length; i += batchSize) {
            const batch = queue.slice(i, i + batchSize);
            for (const operation of batch) {
                try {
                    const result = await this.processOperation(operation, remoteDb);
                    if (result.success) {
                        pushedRecords += result.pushedRecords || 0;
                        pulledRecords += result.pulledRecords || 0;
                        completedOps.push(operation.id);
                    }
                    else {
                        await this.handleOperationFailure(operation, result.error || "Unknown error");
                    }
                }
                catch (error) {
                    await this.handleOperationFailure(operation, error.message);
                }
            }
        }
        // Remove completed operations from queue
        for (const opId of completedOps) {
            const index = queue.findIndex((op) => op.id === opId);
            if (index >= 0) {
                queue.splice(index, 1);
                // Remove from persistent storage
                await this.localDb.runRawSQL("DELETE FROM sync_queue WHERE id = ?", [
                    opId,
                ]);
            }
        }
        return {
            success: true,
            pushedRecords,
            pulledRecords,
        };
    }
    async processOperation(operation, remoteDb) {
        console.log(`SyncQueue: Processing ${operation.type} operation for ${operation.tableName}:${operation.recordId}`);
        switch (operation.type) {
            case "push":
                return this.processPushOperation(operation, remoteDb);
            case "pull":
                return this.processPullOperation(operation, remoteDb);
            case "conflict_resolution":
                return this.processConflictResolution(operation, remoteDb);
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }
    async processPushOperation(operation, remoteDb) {
        try {
            if (operation.tableName === "quiz_attempts") {
                await remoteDb.syncQuizAttempt(operation.data);
                await this.localDb.runRawSQL("UPDATE quiz_attempts SET synced = 1, sync_attempted_at = ?, sync_error = NULL WHERE id = ?", [new Date().toISOString(), operation.recordId]);
                return { success: true, pushedRecords: 1 };
            }
            console.warn(`SyncQueue: Push operation for ${operation.tableName} not implemented`);
            return {
                success: false,
                error: `Push operation for ${operation.tableName} not implemented`,
            };
        }
        catch (error) {
            throw new Error(`Push operation failed: ${error.message}`);
        }
    }
    async processPullOperation(operation, remoteDb) {
        try {
            // Pull operations would fetch data from remote and update local
            // Implementation depends on specific table and operation requirements
            console.warn(`SyncQueue: Pull operation for ${operation.tableName} not implemented`);
            return {
                success: false,
                error: `Pull operation for ${operation.tableName} not implemented`,
            };
        }
        catch (error) {
            throw new Error(`Pull operation failed: ${error.message}`);
        }
    }
    async processConflictResolution(operation, remoteDb) {
        try {
            // Conflict resolution would apply predetermined rules
            // Implementation depends on conflict type and table
            console.warn(`SyncQueue: Conflict resolution for ${operation.tableName} not implemented`);
            return {
                success: false,
                error: `Conflict resolution for ${operation.tableName} not implemented`,
            };
        }
        catch (error) {
            throw new Error(`Conflict resolution failed: ${error.message}`);
        }
    }
    async handleOperationFailure(operation, error) {
        operation.retryCount++;
        operation.lastError = error;
        const maxRetries = this.getMaxRetries(operation.tier);
        if (operation.retryCount >= maxRetries) {
            console.error(`SyncQueue: Operation ${operation.id} exceeded max retries, removing from queue`);
            // Remove from queue and persistent storage
            const queue = this.operations.get(operation.tier);
            const index = queue.findIndex((op) => op.id === operation.id);
            if (index >= 0) {
                queue.splice(index, 1);
            }
            await this.localDb.runRawSQL("DELETE FROM sync_queue WHERE id = ?", [
                operation.id,
            ]);
            // Log the failure
            await this.localDb.runRawSQL(`
        INSERT INTO sync_log (id, operation_type, table_name, record_id, status, error_message, attempted_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                `failed_${operation.id}`,
                operation.type,
                operation.tableName,
                operation.recordId,
                "failed",
                `Max retries exceeded: ${error}`,
                new Date().toISOString(),
            ]);
        }
        else {
            // Schedule retry with exponential backoff
            const retryDelays = this.getRetryDelays(operation.tier);
            const delayIndex = Math.min(operation.retryCount - 1, retryDelays.length - 1);
            const delay = retryDelays[delayIndex];
            operation.nextRetryAt = new Date(Date.now() + delay).toISOString();
            console.log(`SyncQueue: Scheduling retry ${operation.retryCount}/${maxRetries} for operation ${operation.id} in ${delay}ms`);
            // Update persistent storage
            await this.persistOperation(operation);
        }
    }
    getBatchSize(tier) {
        const batchSizes = {
            critical: 10,
            important: 25,
            administrative: 50,
        };
        return batchSizes[tier];
    }
    getMaxRetries(tier) {
        const maxRetries = {
            critical: 10,
            important: 5,
            administrative: 3,
        };
        return maxRetries[tier];
    }
    getRetryDelays(tier) {
        const retryDelays = {
            critical: [1000, 2000, 4000, 8000, 16000],
            important: [5000, 15000, 45000, 135000],
            administrative: [60000, 300000, 900000],
        };
        return retryDelays[tier];
    }
    async cleanupCompletedOperations() {
        try {
            await this.localDb.runRawSQL(`
        DELETE FROM sync_log 
        WHERE id NOT IN (
          SELECT id FROM sync_log 
          WHERE status = 'success' 
          ORDER BY completed_at DESC 
          LIMIT 1000
        ) AND status = 'success'
      `);
        }
        catch (error) {
            console.error("SyncQueue: Failed to cleanup completed operations:", error);
        }
    }
}
exports.SyncQueue = SyncQueue;
