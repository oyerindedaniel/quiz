import { LocalDatabaseService } from "../database/local-database-service.js";
import { RemoteDatabaseService } from "../database/remote-database-service.js";
import type { SyncConflict, QuizAttempt } from "../../types/app.js";

export type ConflictResolutionRule =
  | "local_wins"
  | "remote_wins"
  | "timestamp_wins"
  | "merge_data";

export interface ConflictResolutionStrategy {
  tableName: string;
  rule: ConflictResolutionRule;
  preserveUserData: boolean;
}

interface QuizAttemptRecord extends Record<string, unknown> {
  id: string;
  submitted: boolean;
  answers?: string;
  submittedAt?: string;
  updatedAt: string;
}

interface DatabaseRecord extends Record<string, unknown> {
  id: string;
  updatedAt: string;
}

export class ConflictResolver {
  private localDb: LocalDatabaseService;
  private strategies: Map<string, ConflictResolutionStrategy> = new Map();

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
    this.initializeStrategies();
  }

  /**
   * Initialize conflict resolution strategies for different data types
   */
  private initializeStrategies(): void {
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
  async detectConflicts<T extends Record<string, unknown>>(
    tableName: string,
    localRecord: T | null,
    remoteRecord: T | null
  ): Promise<SyncConflict<T> | null> {
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
      return this.detectQuizAttemptConflict(
        localRecord as unknown as QuizAttemptRecord,
        remoteRecord as unknown as QuizAttemptRecord
      ) as unknown as SyncConflict<T> | null;
    }

    // Generic conflict detection based on timestamps
    return this.detectTimestampConflict(
      tableName,
      localRecord as unknown as DatabaseRecord,
      remoteRecord as unknown as DatabaseRecord
    ) as unknown as SyncConflict<T> | null;
  }

  /**
   * Resolve a detected conflict
   */
  async resolveConflict<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>,
    remoteDb: RemoteDatabaseService
  ): Promise<{ success: boolean; resolution: string; error?: string }> {
    try {
      const strategy = this.strategies.get(conflict.tableName);

      if (!strategy) {
        throw new Error(
          `No resolution strategy for table: ${conflict.tableName}`
        );
      }

      console.log(
        `ConflictResolver: Resolving ${conflict.conflictType} for ${conflict.tableName}:${conflict.recordId} using ${strategy.rule}`
      );

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
    } catch (error) {
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
  getStrategy(tableName: string): ConflictResolutionStrategy | undefined {
    return this.strategies.get(tableName);
  }

  /**
   * Update or add a resolution strategy
   */
  setStrategy(tableName: string, strategy: ConflictResolutionStrategy): void {
    this.strategies.set(tableName, strategy);
  }

  // Private Methods

  private recordsAreIdentical<T extends Record<string, unknown>>(
    localRecord: T,
    remoteRecord: T
  ): boolean {
    // Compare key fields that matter for sync
    const keyFields = ["updatedAt", "answers", "score", "submitted"];

    for (const field of keyFields) {
      if (localRecord[field] !== remoteRecord[field]) {
        return false;
      }
    }

    return true;
  }

  private detectQuizAttemptConflict(
    localRecord: QuizAttemptRecord,
    remoteRecord: QuizAttemptRecord
  ): SyncConflict<QuizAttemptRecord> | null {
    // Special rule: If local quiz is submitted, it always wins
    if (localRecord.submitted && !remoteRecord.submitted) {
      return null; // No conflict - local submitted attempt takes precedence
    }

    // If both are submitted, check timestamps
    if (localRecord.submitted && remoteRecord.submitted) {
      const localTime = new Date(
        (localRecord.submittedAt as string) || localRecord.updatedAt
      ).getTime();
      const remoteTime = new Date(
        (remoteRecord.submittedAt as string) || remoteRecord.updatedAt
      ).getTime();

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
        ? JSON.parse(localRecord.answers as string)
        : {};
      const remoteAnswers = remoteRecord.answers
        ? JSON.parse(remoteRecord.answers as string)
        : {};

      // Check if there are conflicting answers
      for (const questionId of Object.keys(localAnswers)) {
        if (
          remoteAnswers[questionId] &&
          localAnswers[questionId] !== remoteAnswers[questionId]
        ) {
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

  private detectTimestampConflict(
    tableName: string,
    localRecord: DatabaseRecord,
    remoteRecord: DatabaseRecord
  ): SyncConflict<DatabaseRecord> | null {
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

  private async applyLocalWins<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>,
    remoteDb: RemoteDatabaseService
  ): Promise<{ success: boolean; resolution: string }> {
    try {
      // Local record wins - push to remote
      if (conflict.tableName === "quiz_attempts") {
        await remoteDb.syncQuizAttempt(
          conflict.localRecord as unknown as QuizAttempt
        );
      }

      // Log the resolution
      await this.logConflictResolution(
        conflict,
        "local_wins",
        "Local record preserved"
      );

      return {
        success: true,
        resolution: "local_wins - Local changes preserved, remote updated",
      };
    } catch (error) {
      throw new Error(
        `Failed to apply local wins: ${(error as Error).message}`
      );
    }
  }

  private async applyRemoteWins<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>
  ): Promise<{ success: boolean; resolution: string }> {
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
          throw new Error(
            `Remote wins not implemented for table: ${tableName}`
          );
      }

      // Log the resolution
      await this.logConflictResolution(
        conflict,
        "remote_wins",
        "Remote record applied"
      );

      return {
        success: true,
        resolution: "remote_wins - Remote changes applied locally",
      };
    } catch (error) {
      throw new Error(
        `Failed to apply remote wins: ${(error as Error).message}`
      );
    }
  }

  private async applyTimestampWins<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>,
    remoteDb: RemoteDatabaseService
  ): Promise<{ success: boolean; resolution: string }> {
    const localRecord = conflict.localRecord as unknown as DatabaseRecord;
    const remoteRecord = conflict.remoteRecord as unknown as DatabaseRecord;

    const localTime = new Date(localRecord.updatedAt).getTime();
    const remoteTime = new Date(remoteRecord.updatedAt).getTime();

    if (localTime > remoteTime) {
      return await this.applyLocalWins(conflict, remoteDb);
    } else {
      return await this.applyRemoteWins(conflict);
    }
  }

  private async applyMergeData<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>,
    remoteDb: RemoteDatabaseService
  ): Promise<{ success: boolean; resolution: string }> {
    try {
      // Implement merge logic based on table type
      if (conflict.tableName === "quiz_attempts") {
        return await this.mergeQuizAttempts(
          conflict as unknown as SyncConflict<QuizAttemptRecord>,
          remoteDb
        );
      }

      // For other tables, fall back to timestamp-based resolution
      return await this.applyTimestampWins(conflict, remoteDb);
    } catch (error) {
      throw new Error(`Failed to merge data: ${(error as Error).message}`);
    }
  }

  private async mergeQuizAttempts(
    conflict: SyncConflict<QuizAttemptRecord>,
    remoteDb: RemoteDatabaseService
  ): Promise<{ success: boolean; resolution: string }> {
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
      ? JSON.parse(localRecord.answers as string)
      : {};
    const remoteAnswers = remoteRecord.answers
      ? JSON.parse(remoteRecord.answers as string)
      : {};

    // Merge answers - local answers take precedence
    const mergedAnswers = { ...remoteAnswers, ...localAnswers };

    // Update local record with merged data
    await this.localDb.runRawSQL(
      "UPDATE quiz_attempts SET answers = ?, updated_at = ? WHERE id = ?",
      [
        JSON.stringify(mergedAnswers),
        new Date().toISOString(),
        conflict.recordId,
      ]
    );

    // Sync merged result to remote - use the full local record with updated answers
    const updatedRecord: QuizAttempt = {
      ...(localRecord as unknown as QuizAttempt),
      answers: JSON.stringify(mergedAnswers),
      updatedAt: new Date().toISOString(),
    };
    await remoteDb.syncQuizAttempt(updatedRecord);

    // Log the resolution
    await this.logConflictResolution(
      conflict,
      "merge_data",
      "Quiz answers merged"
    );

    return {
      success: true,
      resolution: "merge_data - Quiz answers merged with local precedence",
    };
  }

  private async updateLocalUser(
    recordId: string,
    remoteRecord: Record<string, unknown>
  ): Promise<void> {
    await this.localDb.runRawSQL(
      `
      UPDATE users 
      SET name = ?, class = ?, gender = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `,
      [
        remoteRecord.name,
        remoteRecord.class,
        remoteRecord.gender,
        new Date().toISOString(),
        remoteRecord.isActive,
        recordId,
      ]
    );
  }

  private async updateLocalSubject(
    recordId: string,
    remoteRecord: Record<string, unknown>
  ): Promise<void> {
    await this.localDb.runRawSQL(
      `
      UPDATE subjects 
      SET name = ?, description = ?, class = ?, total_questions = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `,
      [
        remoteRecord.name,
        remoteRecord.description,
        remoteRecord.class,
        remoteRecord.totalQuestions,
        new Date().toISOString(),
        remoteRecord.isActive,
        recordId,
      ]
    );
  }

  private async updateLocalQuestion(
    recordId: string,
    remoteRecord: Record<string, unknown>
  ): Promise<void> {
    await this.localDb.runRawSQL(
      `
      UPDATE questions 
      SET text = ?, options = ?, answer = ?, question_order = ?, updated_at = ?, is_active = ?
      WHERE id = ?
    `,
      [
        remoteRecord.text,
        JSON.stringify(remoteRecord.options),
        remoteRecord.answer,
        remoteRecord.questionOrder,
        new Date().toISOString(),
        remoteRecord.isActive,
        recordId,
      ]
    );
  }

  private async logConflictResolution<T extends Record<string, unknown>>(
    conflict: SyncConflict<T>,
    strategy: string,
    description: string
  ): Promise<void> {
    try {
      await this.localDb.runRawSQL(
        `
        INSERT INTO sync_log (id, operation_type, table_name, record_id, status, error_message, attempted_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          `resolution_${conflict.id}`,
          "conflict_resolution",
          conflict.tableName,
          conflict.recordId,
          "success",
          `${strategy}: ${description}`,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      console.error("ConflictResolver: Failed to log resolution:", error);
    }
  }
}
