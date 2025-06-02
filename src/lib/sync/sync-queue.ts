import { LocalDatabaseService } from "@/lib/database/local-database-service";
import { RemoteDatabaseService } from "@/lib/database/remote-database-service";
import { SyncError } from "@/lib/error";
import type { SyncOperation, SyncResult, QuizAttempt } from "@/types";
import type { SyncTier } from "./sync-engine";

interface QueuedOperation<T = Record<string, unknown>>
  extends SyncOperation<T> {
  tier: SyncTier;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
}

interface PersistedQueueOperation {
  id: string;
  type: string;
  table_name: string;
  record_id: string;
  data: string;
  tier: string;
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  timestamp: string;
}

export class SyncQueue {
  private localDb: LocalDatabaseService;
  private operations: Map<SyncTier, QueuedOperation[]> = new Map();
  private isProcessing = false;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();

    // Initialize tier queues
    this.operations.set("critical", []);
    this.operations.set("important", []);
    this.operations.set("administrative", []);
  }

  /**
   * Initialize the queue by loading operations from persistent storage
   */
  async initialize(): Promise<void> {
    try {
      console.log("SyncQueue: Initializing queue...");

      // Create queue table if it doesn't exist
      await this.createQueueTable();

      // Load pending operations from database
      await this.loadPersistedOperations();

      console.log("SyncQueue: Initialization complete");
    } catch (error) {
      throw new SyncError(
        "Failed to initialize sync queue",
        "queue_init",
        error as Error
      );
    }
  }

  /**
   * Add operation to the queue
   */
  async addOperation<T extends Record<string, unknown>>(
    operation: SyncOperation<T>,
    tier: SyncTier
  ): Promise<void> {
    const queuedOp: QueuedOperation<T> = {
      ...operation,
      tier,
      retryCount: 0,
    };

    // Add to in-memory queue (cast to base type for storage)
    const tierQueue = this.operations.get(tier)!;
    tierQueue.push(queuedOp as QueuedOperation);

    // Persist to database
    await this.persistOperation(queuedOp);

    console.log(
      `SyncQueue: Added ${tier} operation for ${operation.tableName}:${operation.recordId}`
    );
  }

  /**
   * Process all queued operations
   */
  async processQueue(remoteDb: RemoteDatabaseService): Promise<SyncResult> {
    if (this.isProcessing) {
      return { success: false, error: "Queue processing already in progress" };
    }

    this.isProcessing = true;

    try {
      console.log("SyncQueue: Processing queue...");

      let totalPushed = 0;
      let totalPulled = 0;

      // Process queues in priority order
      const tiers: SyncTier[] = ["critical", "important", "administrative"];

      for (const tier of tiers) {
        const result = await this.processTierQueue(tier, remoteDb);
        totalPushed += result.pushedRecords || 0;
        totalPulled += result.pulledRecords || 0;
      }

      // Clean up completed operations
      await this.cleanupCompletedOperations();

      console.log(
        `SyncQueue: Processed queue - pushed: ${totalPushed}, pulled: ${totalPulled}`
      );

      return {
        success: true,
        pushedRecords: totalPushed,
        pulledRecords: totalPulled,
      };
    } catch (error) {
      console.error("SyncQueue: Queue processing failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Queue processing failed",
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get count of pending operations by tier
   */
  getPendingCount(tier?: SyncTier): number {
    if (tier) {
      return this.operations.get(tier)?.length || 0;
    }

    // Return total count across all tiers
    return Array.from(this.operations.values()).reduce(
      (total, queue) => total + queue.length,
      0
    );
  }

  /**
   * Get all pending operations for inspection
   */
  getPendingOperations(): QueuedOperation[] {
    const allOps: QueuedOperation[] = [];

    for (const queue of this.operations.values()) {
      allOps.push(...queue);
    }

    return allOps.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Clear all operations (useful for testing or emergency reset)
   */
  async clearQueue(): Promise<void> {
    console.log("SyncQueue: Clearing all operations...");

    // Clear in-memory queues
    for (const queue of this.operations.values()) {
      queue.length = 0;
    }

    // Clear persistent storage
    try {
      await this.localDb.runRawSQL("DELETE FROM sync_queue");
      console.log("SyncQueue: Queue cleared");
    } catch (error) {
      console.error("SyncQueue: Failed to clear persistent queue:", error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log("SyncQueue: Cleaning up...");

    // Save any remaining operations
    for (const tier of this.operations.keys()) {
      const queue = this.operations.get(tier)!;
      for (const op of queue) {
        await this.persistOperation(op);
      }
    }

    console.log("SyncQueue: Cleanup completed");
  }

  // Private Methods

  private async createQueueTable(): Promise<void> {
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
    } catch (error) {
      throw new SyncError(
        "Failed to create sync queue table",
        "queue_table",
        error as Error
      );
    }
  }

  private async loadPersistedOperations(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Load operations that are ready to retry (past their retry time)
      const operations = (await this.localDb.executeRawSQL(
        `
        SELECT * FROM sync_queue 
        WHERE next_retry_at IS NULL OR next_retry_at <= ?
        ORDER BY timestamp ASC
      `,
        [now]
      )) as PersistedQueueOperation[];

      for (const op of operations) {
        const queuedOp: QueuedOperation = {
          id: op.id,
          type: op.type as "push" | "pull" | "conflict_resolution",
          tableName: op.table_name,
          recordId: op.record_id,
          data: JSON.parse(op.data),
          timestamp: op.timestamp,
          tier: op.tier as SyncTier,
          retryCount: op.retry_count,
          nextRetryAt: op.next_retry_at || undefined,
          lastError: op.last_error || undefined,
        };

        const tierQueue = this.operations.get(queuedOp.tier)!;
        tierQueue.push(queuedOp);
      }

      console.log(
        `SyncQueue: Loaded ${operations.length} persisted operations`
      );
    } catch (error) {
      console.error("SyncQueue: Failed to load persisted operations:", error);
    }
  }

  private async persistOperation<T extends Record<string, unknown>>(
    operation: QueuedOperation<T>
  ): Promise<void> {
    try {
      await this.localDb.runRawSQL(
        `
        INSERT OR REPLACE INTO sync_queue 
        (id, type, table_name, record_id, data, tier, retry_count, next_retry_at, last_error, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
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
        ]
      );
    } catch (error) {
      console.error("SyncQueue: Failed to persist operation:", error);
    }
  }

  private async processTierQueue(
    tier: SyncTier,
    remoteDb: RemoteDatabaseService
  ): Promise<SyncResult> {
    const queue = this.operations.get(tier)!;

    if (queue.length === 0) {
      return { success: true, pushedRecords: 0, pulledRecords: 0 };
    }

    console.log(`SyncQueue: Processing ${queue.length} ${tier} operations`);

    let pushedRecords = 0;
    let pulledRecords = 0;
    const completedOps: string[] = [];

    // Process operations in batches
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
          } else {
            // Handle retry logic
            await this.handleOperationFailure(
              operation,
              result.error || "Unknown error"
            );
          }
        } catch (error) {
          await this.handleOperationFailure(
            operation,
            (error as Error).message
          );
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

  private async processOperation(
    operation: QueuedOperation,
    remoteDb: RemoteDatabaseService
  ): Promise<SyncResult> {
    console.log(
      `SyncQueue: Processing ${operation.type} operation for ${operation.tableName}:${operation.recordId}`
    );

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

  private async processPushOperation(
    operation: QueuedOperation,
    remoteDb: RemoteDatabaseService
  ): Promise<SyncResult> {
    try {
      // For quiz attempts, use the remote service's sync method
      if (operation.tableName === "quiz_attempts") {
        await remoteDb.syncQuizAttempt(operation.data as QuizAttempt);

        // Mark as synced in local database
        await this.localDb.runRawSQL(
          "UPDATE quiz_attempts SET synced = 1, sync_attempted_at = ?, sync_error = NULL WHERE id = ?",
          [new Date().toISOString(), operation.recordId]
        );

        return { success: true, pushedRecords: 1 };
      }

      // Handle other table types as needed
      console.warn(
        `SyncQueue: Push operation for ${operation.tableName} not implemented`
      );
      return {
        success: false,
        error: `Push operation for ${operation.tableName} not implemented`,
      };
    } catch (error) {
      throw new Error(`Push operation failed: ${(error as Error).message}`);
    }
  }

  private async processPullOperation(
    operation: QueuedOperation,
    remoteDb: RemoteDatabaseService
  ): Promise<SyncResult> {
    try {
      // Pull operations would fetch data from remote and update local
      // Implementation depends on specific table and operation requirements
      console.warn(
        `SyncQueue: Pull operation for ${operation.tableName} not implemented`
      );
      return {
        success: false,
        error: `Pull operation for ${operation.tableName} not implemented`,
      };
    } catch (error) {
      throw new Error(`Pull operation failed: ${(error as Error).message}`);
    }
  }

  private async processConflictResolution(
    operation: QueuedOperation,
    remoteDb: RemoteDatabaseService
  ): Promise<SyncResult> {
    try {
      // Conflict resolution would apply predetermined rules
      // Implementation depends on conflict type and table
      console.warn(
        `SyncQueue: Conflict resolution for ${operation.tableName} not implemented`
      );
      return {
        success: false,
        error: `Conflict resolution for ${operation.tableName} not implemented`,
      };
    } catch (error) {
      throw new Error(
        `Conflict resolution failed: ${(error as Error).message}`
      );
    }
  }

  private async handleOperationFailure(
    operation: QueuedOperation,
    error: string
  ): Promise<void> {
    operation.retryCount++;
    operation.lastError = error;

    const maxRetries = this.getMaxRetries(operation.tier);

    if (operation.retryCount >= maxRetries) {
      console.error(
        `SyncQueue: Operation ${operation.id} exceeded max retries, removing from queue`
      );

      // Remove from queue and persistent storage
      const queue = this.operations.get(operation.tier)!;
      const index = queue.findIndex((op) => op.id === operation.id);
      if (index >= 0) {
        queue.splice(index, 1);
      }

      await this.localDb.runRawSQL("DELETE FROM sync_queue WHERE id = ?", [
        operation.id,
      ]);

      // Log the failure
      await this.localDb.runRawSQL(
        `
        INSERT INTO sync_log (id, operation_type, table_name, record_id, status, error_message, attempted_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          `failed_${operation.id}`,
          operation.type,
          operation.tableName,
          operation.recordId,
          "failed",
          `Max retries exceeded: ${error}`,
          new Date().toISOString(),
        ]
      );
    } else {
      // Schedule retry with exponential backoff
      const retryDelays = this.getRetryDelays(operation.tier);
      const delayIndex = Math.min(
        operation.retryCount - 1,
        retryDelays.length - 1
      );
      const delay = retryDelays[delayIndex];

      operation.nextRetryAt = new Date(Date.now() + delay).toISOString();

      console.log(
        `SyncQueue: Scheduling retry ${operation.retryCount}/${maxRetries} for operation ${operation.id} in ${delay}ms`
      );

      // Update persistent storage
      await this.persistOperation(operation);
    }
  }

  private getBatchSize(tier: SyncTier): number {
    const batchSizes = {
      critical: 10,
      important: 25,
      administrative: 50,
    };
    return batchSizes[tier];
  }

  private getMaxRetries(tier: SyncTier): number {
    const maxRetries = {
      critical: 10,
      important: 5,
      administrative: 3,
    };
    return maxRetries[tier];
  }

  private getRetryDelays(tier: SyncTier): number[] {
    const retryDelays = {
      critical: [1000, 2000, 4000, 8000, 16000],
      important: [5000, 15000, 45000, 135000],
      administrative: [60000, 300000, 900000],
    };
    return retryDelays[tier];
  }

  private async cleanupCompletedOperations(): Promise<void> {
    try {
      // Remove old completed operations from sync_log (keep only last 1000)
      await this.localDb.runRawSQL(`
        DELETE FROM sync_log 
        WHERE id NOT IN (
          SELECT id FROM sync_log 
          WHERE status = 'success' 
          ORDER BY completed_at DESC 
          LIMIT 1000
        ) AND status = 'success'
      `);
    } catch (error) {
      console.error(
        "SyncQueue: Failed to cleanup completed operations:",
        error
      );
    }
  }
}
