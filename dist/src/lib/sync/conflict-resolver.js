"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolver = void 0;
const local_database_service_js_1 = require("../database/local-database-service.js");
class ConflictResolver {
    constructor() {
        this.strategies = new Map();
        this.localDb = local_database_service_js_1.LocalDatabaseService.getInstance();
        this.initializeStrategies();
    }
    /**
     * Initialize conflict resolution strategies for different data types
     */
    initializeStrategies() {
        // Quiz attempts: User data always wins (immutable principle)
        this.strategies.set("quiz_attempts", {
            tableName: "quiz_attempts",
            rule: "local_wins",
            preserveUserData: true,
        });
        // Users: Remote wins (admin-controlled)
        this.strategies.set("users", {
            tableName: "users",
            rule: "remote_wins",
            preserveUserData: false,
        });
        // Subjects: Remote wins (admin-controlled)
        this.strategies.set("subjects", {
            tableName: "subjects",
            rule: "remote_wins",
            preserveUserData: false,
        });
        // Questions: Remote wins (admin-controlled)
        this.strategies.set("questions", {
            tableName: "questions",
            rule: "remote_wins",
            preserveUserData: false,
        });
    }
    /**
     * Detect conflicts between local and remote records
     */
    async detectConflicts(tableName, localRecord, remoteRecord) {
        // No conflict if one record doesn't exist
        if (!localRecord || !remoteRecord) {
            return null;
        }
        // No conflict if records are identical
        if (this.recordsAreIdentical(localRecord, remoteRecord)) {
            return null;
        }
        // Special handling for quiz attempts
        if (tableName === "quiz_attempts") {
            return this.detectQuizAttemptConflict(localRecord, remoteRecord);
        }
        // Generic conflict detection based on timestamps
        return this.detectTimestampConflict(tableName, localRecord, remoteRecord);
    }
    /**
     * Resolve a detected conflict
     */
    async resolveConflict(conflict, remoteDb) {
        try {
            const strategy = this.strategies.get(conflict.tableName);
            if (!strategy) {
                throw new Error(`No resolution strategy for table: ${conflict.tableName}`);
            }
            console.log(`ConflictResolver: Resolving ${conflict.conflictType} for ${conflict.tableName}:${conflict.recordId} using ${strategy.rule}`);
            switch (strategy.rule) {
                case "local_wins":
                    return await this.applyLocalWins(conflict, remoteDb);
                case "remote_wins":
                    return await this.applyRemoteWins(conflict);
                case "timestamp_wins":
                    return await this.applyTimestampWins(conflict, remoteDb);
                case "merge_data":
                    return await this.applyMergeData(conflict, remoteDb);
                default:
                    throw new Error(`Unknown resolution rule: ${strategy.rule}`);
            }
        }
        catch (error) {
            console.error("ConflictResolver: Resolution failed:", error);
            return {
                success: false,
                resolution: "error",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Get conflict resolution strategy for a table
     */
    getStrategy(tableName) {
        return this.strategies.get(tableName);
    }
    /**
     * Update or add a resolution strategy
     */
    setStrategy(tableName, strategy) {
        this.strategies.set(tableName, strategy);
    }
    // Private Methods
    recordsAreIdentical(localRecord, remoteRecord) {
        // Compare key fields that matter for sync
        const keyFields = ["updatedAt", "answers", "score", "submitted"];
        for (const field of keyFields) {
            if (localRecord[field] !== remoteRecord[field]) {
                return false;
            }
        }
        return true;
    }
    detectQuizAttemptConflict(localRecord, remoteRecord) {
        // Special rule: If local quiz is submitted, it always wins
        if (localRecord.submitted && !remoteRecord.submitted) {
            return null; // No conflict - local submitted attempt takes precedence
        }
        // If both are submitted, check timestamps
        if (localRecord.submitted && remoteRecord.submitted) {
            const localTime = new Date(localRecord.submittedAt || localRecord.updatedAt).getTime();
            const remoteTime = new Date(remoteRecord.submittedAt || remoteRecord.updatedAt).getTime();
            if (Math.abs(localTime - remoteTime) < 1000) {
                // Within 1 second
                return null; // Close enough, no conflict
            }
            return {
                id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tableName: "quiz_attempts",
                recordId: localRecord.id,
                localRecord,
                remoteRecord,
                conflictType: "update_conflict",
                timestamp: new Date().toISOString(),
            };
        }
        // If neither is submitted, merge answers
        if (!localRecord.submitted && !remoteRecord.submitted) {
            const localAnswers = localRecord.answers
                ? JSON.parse(localRecord.answers)
                : {};
            const remoteAnswers = remoteRecord.answers
                ? JSON.parse(remoteRecord.answers)
                : {};
            // Check if there are conflicting answers
            for (const questionId of Object.keys(localAnswers)) {
                if (remoteAnswers[questionId] &&
                    localAnswers[questionId] !== remoteAnswers[questionId]) {
                    return {
                        id: `conflict_${Date.now()}_${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                        tableName: "quiz_attempts",
                        recordId: localRecord.id,
                        localRecord,
                        remoteRecord,
                        conflictType: "update_conflict",
                        timestamp: new Date().toISOString(),
                    };
                }
            }
        }
        return null; // No conflict detected
    }
    detectTimestampConflict(tableName, localRecord, remoteRecord) {
        const localTime = new Date(localRecord.updatedAt).getTime();
        const remoteTime = new Date(remoteRecord.updatedAt).getTime();
        // If times are very close (within 1 second), consider them the same
        if (Math.abs(localTime - remoteTime) < 1000) {
            return null;
        }
        // If modification times differ significantly, we have a conflict
        return {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tableName,
            recordId: localRecord.id,
            localRecord,
            remoteRecord,
            conflictType: "update_conflict",
            timestamp: new Date().toISOString(),
        };
    }
    async applyLocalWins(conflict, remoteDb) {
        try {
            // Local record wins - push to remote
            if (conflict.tableName === "quiz_attempts") {
                await remoteDb.syncQuizAttempt(conflict.localRecord);
            }
            // Log the resolution
            await this.logConflictResolution(conflict, "local_wins", "Local record preserved");
            return {
                success: true,
                resolution: "local_wins - Local changes preserved, remote updated",
            };
        }
        catch (error) {
            throw new Error(`Failed to apply local wins: ${error.message}`);
        }
    }
    async applyRemoteWins(conflict) {
        try {
            // Remote record wins - update local
            const tableName = conflict.tableName;
            const recordId = conflict.recordId;
            const remoteRecord = conflict.remoteRecord;
            switch (tableName) {
                case "users":
                    await this.updateLocalUser(recordId, remoteRecord);
                    break;
                case "subjects":
                    await this.updateLocalSubject(recordId, remoteRecord);
                    break;
                case "questions":
                    await this.updateLocalQuestion(recordId, remoteRecord);
                    break;
                default:
                    throw new Error(`Remote wins not implemented for table: ${tableName}`);
            }
            // Log the resolution
            await this.logConflictResolution(conflict, "remote_wins", "Remote record applied");
            return {
                success: true,
                resolution: "remote_wins - Remote changes applied locally",
            };
        }
        catch (error) {
            throw new Error(`Failed to apply remote wins: ${error.message}`);
        }
    }
    async applyTimestampWins(conflict, remoteDb) {
        const localRecord = conflict.localRecord;
        const remoteRecord = conflict.remoteRecord;
        const localTime = new Date(localRecord.updatedAt).getTime();
        const remoteTime = new Date(remoteRecord.updatedAt).getTime();
        if (localTime > remoteTime) {
            return await this.applyLocalWins(conflict, remoteDb);
        }
        else {
            return await this.applyRemoteWins(conflict);
        }
    }
    async applyMergeData(conflict, remoteDb) {
        try {
            // Implement merge logic based on table type
            if (conflict.tableName === "quiz_attempts") {
                return await this.mergeQuizAttempts(conflict, remoteDb);
            }
            // For other tables, fall back to timestamp-based resolution
            return await this.applyTimestampWins(conflict, remoteDb);
        }
        catch (error) {
            throw new Error(`Failed to merge data: ${error.message}`);
        }
    }
    async mergeQuizAttempts(conflict, remoteDb) {
        const localRecord = conflict.localRecord;
        const remoteRecord = conflict.remoteRecord;
        // If local is submitted, local wins
        if (localRecord.submitted) {
            return await this.applyLocalWins(conflict, remoteDb);
        }
        // If remote is submitted, remote wins
        if (remoteRecord.submitted) {
            return await this.applyRemoteWins(conflict);
        }
        // Both are in progress - merge answers with local precedence
        const localAnswers = localRecord.answers
            ? JSON.parse(localRecord.answers)
            : {};
        const remoteAnswers = remoteRecord.answers
            ? JSON.parse(remoteRecord.answers)
            : {};
        // Merge answers - local answers take precedence
        const mergedAnswers = { ...remoteAnswers, ...localAnswers };
        // Update local record with merged data
        await this.localDb.runRawSQL("UPDATE quiz_attempts SET answers = ?, updated_at = ? WHERE id = ?", [
            JSON.stringify(mergedAnswers),
            new Date().toISOString(),
            conflict.recordId,
        ]);
        // Sync merged result to remote - use the full local record with updated answers
        const updatedRecord = {
            ...localRecord,
            answers: JSON.stringify(mergedAnswers),
            updatedAt: new Date().toISOString(),
        };
        await remoteDb.syncQuizAttempt(updatedRecord);
        // Log the resolution
        await this.logConflictResolution(conflict, "merge_data", "Quiz answers merged");
        return {
            success: true,
            resolution: "merge_data - Quiz answers merged with local precedence",
        };
    }
    async updateLocalUser(recordId, remoteRecord) {
        await this.localDb.runRawSQL(`
      UPDATE users 
      SET name = ?, class = ?, gender = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `, [
            remoteRecord.name,
            remoteRecord.class,
            remoteRecord.gender,
            new Date().toISOString(),
            remoteRecord.isActive,
            recordId,
        ]);
    }
    async updateLocalSubject(recordId, remoteRecord) {
        await this.localDb.runRawSQL(`
      UPDATE subjects 
      SET name = ?, description = ?, class = ?, total_questions = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `, [
            remoteRecord.name,
            remoteRecord.description,
            remoteRecord.class,
            remoteRecord.totalQuestions,
            new Date().toISOString(),
            remoteRecord.isActive,
            recordId,
        ]);
    }
    async updateLocalQuestion(recordId, remoteRecord) {
        await this.localDb.runRawSQL(`
      UPDATE questions 
      SET text = ?, options = ?, answer = ?, question_order = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `, [
            remoteRecord.text,
            JSON.stringify(remoteRecord.options),
            remoteRecord.answer,
            remoteRecord.questionOrder,
            new Date().toISOString(),
            remoteRecord.isActive,
            recordId,
        ]);
    }
    async logConflictResolution(conflict, strategy, description) {
        try {
            await this.localDb.runRawSQL(`
        INSERT INTO sync_log (id, operation_type, table_name, record_id, status, error_message, attempted_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                `resolution_${conflict.id}`,
                "conflict_resolution",
                conflict.tableName,
                conflict.recordId,
                "success",
                `${strategy}: ${description}`,
                new Date().toISOString(),
                new Date().toISOString(),
            ]);
        }
        catch (error) {
            console.error("ConflictResolver: Failed to log resolution:", error);
        }
    }
}
exports.ConflictResolver = ConflictResolver;
