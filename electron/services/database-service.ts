import { LocalDatabaseService } from "@/lib/database/local-database-service";
import { RemoteDatabaseService } from "@/lib/database/remote-database-service";
import { CSVImportService } from "@/lib/import/csv-import-service";
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

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
    this.csvImporter = new CSVImportService();
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

  // Sync operations (when remote database is available)
  async syncToRemote(): Promise<{ success: boolean; error?: string }> {
    if (!this.remoteDb) {
      return { success: false, error: "Remote database not available" };
    }

    try {
      // TODO: Implement sync logic between local and remote using both services
      console.log("Sync to remote database not yet implemented");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log("MainDatabaseService: Starting cleanup...");

    try {
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
