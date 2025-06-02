import { LocalDatabaseService } from "@/lib/database/local-database-service";
import { RemoteDatabaseService } from "@/lib/database/remote-database-service";
import { CSVImportService } from "@/lib/import/csv-import-service";
import { SyncEngine } from "@/lib/sync/sync-engine";
import type {
  User,
  Subject,
  Question,
  QuizAttempt,
  NewUser,
  NewSubject,
  NewQuestion,
  NewQuizAttempt,
} from "@/lib/database/local-schema";
import { ImportResult } from "@/types";

export class MainDatabaseService {
  private localDb: LocalDatabaseService;
  private remoteDb: RemoteDatabaseService | null = null;
  private csvImporter: CSVImportService;
  private syncEngine: SyncEngine;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
    this.csvImporter = new CSVImportService();
    this.syncEngine = SyncEngine.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      await this.localDb.initialize();
      console.log("Main process: Local database service initialized");

      // (optional - for sync functionality)
      try {
        if (process.env.NEON_DATABASE_URL) {
          this.remoteDb = RemoteDatabaseService.getInstance();
          await this.remoteDb.initialize(process.env.NEON_DATABASE_URL);
          console.log("Main process: Remote database service initialized");
        }
      } catch (error) {
        console.warn(
          "Main process: Remote database unavailable:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      // Initialize sync engine
      try {
        await this.syncEngine.initialize(this.remoteDb || undefined);
        console.log("Main process: Sync engine initialized");
      } catch (error) {
        console.warn(
          "Main process: Sync engine initialization failed:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    } catch (error) {
      console.error("Main process: Database initialization failed:", error);
      throw error;
    }
  }

  // Raw SQL operations (routed through LocalDatabaseService)
  async executeRawSQL(sql: string, params: unknown[] = []): Promise<unknown[]> {
    try {
      return await this.localDb.executeRawSQL(sql, params);
    } catch (error) {
      console.error("Raw SQL execution error:", error);
      throw error;
    }
  }

  async runRawSQL(sql: string, params: unknown[] = []): Promise<unknown> {
    try {
      return await this.localDb.runRawSQL(sql, params);
    } catch (error) {
      console.error("Raw SQL run error:", error);
      throw error;
    }
  }

  async backupDatabase(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.localDb.backupDatabase(backupPath);
    } catch (error) {
      console.error("Database backup error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // User operations (Local - primary operations)
  async findUserByStudentCode(studentCode: string): Promise<User | null> {
    return this.localDb.findUserByStudentCode(studentCode);
  }

  async createUser(
    userData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    return this.localDb.createUser(userData);
  }

  // Subject operations (Local - primary operations)
  async findSubjectByCode(subjectCode: string): Promise<Subject | null> {
    return this.localDb.findSubjectByCode(subjectCode);
  }

  async createSubject(
    subjectData: Omit<NewSubject, "createdAt" | "updatedAt">
  ): Promise<void> {
    return this.localDb.createSubject(subjectData);
  }

  // Question operations (Local - primary operations)
  async getQuestionsForSubject(subjectId: string): Promise<Question[]> {
    return this.localDb.getQuestionsForSubject(subjectId);
  }

  async createQuestion(
    questionData: Omit<NewQuestion, "createdAt" | "updatedAt">
  ): Promise<void> {
    return this.localDb.createQuestion(questionData);
  }

  // Quiz attempt operations (Local - primary operations)
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<QuizAttempt | null> {
    return this.localDb.findIncompleteAttempt(userId, subjectId);
  }

  async createQuizAttempt(
    attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt">
  ): Promise<string> {
    return this.localDb.createQuizAttempt(attemptData);
  }

  async getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
    return this.localDb.getQuizAttempt(attemptId);
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    return this.localDb.updateQuizAnswer(attemptId, questionId, answer);
  }

  async submitQuiz(
    attemptId: string,
    score: number,
    sessionDuration: number
  ): Promise<void> {
    try {
      await this.localDb.submitQuizAttempt(attemptId, score, sessionDuration);
      console.log("Quiz submitted successfully:", {
        attemptId,
        score,
        sessionDuration,
      });

      // Trigger critical sync for quiz submission
      try {
        await this.syncEngine.triggerSync("quiz_submission");
      } catch (syncError) {
        console.warn("Quiz sync failed (data saved locally):", syncError);
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      throw new Error("Failed to submit quiz");
    }
  }

  // CSV Import operations
  async importCSVQuestions(csvContent: string): Promise<ImportResult> {
    return this.csvImporter.importQuestionsFromCSV(csvContent);
  }

  // Database management
  async checkIntegrity(): Promise<boolean> {
    return this.localDb.checkDatabaseIntegrity();
  }

  // Remote database access (for sync operations)
  getRemoteDatabase(): RemoteDatabaseService | null {
    return this.remoteDb;
  }

  isRemoteAvailable(): boolean {
    return this.remoteDb?.isConnected() ?? false;
  }

  // Sync operations
  async triggerSync(
    trigger?: "manual" | "startup" | "app_close"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.syncEngine.triggerSync(trigger || "manual");
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  async getSyncStatus(): Promise<any> {
    return this.syncEngine.getSyncStatus();
  }

  // Queue sync operation for later processing
  async queueSyncOperation<T extends Record<string, unknown>>(operation: {
    type: "push" | "pull" | "conflict_resolution";
    tableName: string;
    recordId: string;
    data: T;
  }): Promise<void> {
    try {
      await this.syncEngine.queueOperation(operation);
    } catch (error) {
      console.warn("Failed to queue sync operation:", error);
    }
  }

  async cleanup(): Promise<void> {
    console.log("MainDatabaseService: Starting cleanup...");

    try {
      // Cleanup sync engine first (may trigger final sync)
      try {
        await this.syncEngine.cleanup();
        console.log("MainDatabaseService: Sync engine cleaned up");
      } catch (error) {
        console.warn("MainDatabaseService: Sync engine cleanup failed:", error);
      }

      if (this.remoteDb) {
        await this.remoteDb.cleanup();
        console.log("MainDatabaseService: Remote database cleaned up");
      }

      if (this.localDb) {
        await this.localDb.cleanup();
        console.log("MainDatabaseService: Local database cleaned up");
      }

      console.log("MainDatabaseService: Cleanup completed successfully");
    } catch (error) {
      console.error("MainDatabaseService: Cleanup failed:", error);
      throw error;
    }
  }
}
