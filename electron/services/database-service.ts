import { LocalDatabaseService } from "@/lib/database/local-database-service";
import { RemoteDatabaseService } from "@/lib/database/remote-database-service";
import { CSVImportService } from "@/lib/import/csv-import-service";
import { SyncEngine } from "@/lib/sync/sync-engine";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
import {
  ImportResult,
  AuthResult,
  AdminAuthResult,
  AdminDashboardStats,
  UserWithAttempts,
  SubjectWithStats,
  QuestionWithStats,
  AnalyticsData,
  CreateAdminData,
  AdminCreationResult,
} from "@/types";
import { SyncTrigger } from "@/lib/sync/sync-engine";
import type { SyncOperationType } from "@/types";

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
    const hashedPassword = await bcrypt.hash(userData.passwordHash, 10);

    const userDataWithHashedPassword = {
      ...userData,
      passwordHash: hashedPassword,
    };

    return this.localDb.createUser(userDataWithHashedPassword);
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

  async bulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    try {
      const result = await this.localDb.bulkCreateQuestions(questions);

      console.log(`Bulk created ${result.created} questions successfully`);

      return result;
    } catch (error) {
      console.error("Bulk question creation error:", error);
      return {
        success: false,
        created: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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

  async updateElapsedTime(
    attemptId: string,
    elapsedTime: number
  ): Promise<void> {
    return this.localDb.updateElapsedTime(attemptId, elapsedTime);
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
    trigger?: SyncTrigger
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
    type: SyncOperationType;
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

  // Authentication operations
  async authenticate(
    studentCode: string,
    subjectCode: string,
    pin: string
  ): Promise<AuthResult> {
    try {
      const user = await this.localDb.findUserByStudentCode(studentCode);
      if (!user) {
        return { success: false, error: "Invalid student code" };
      }

      const isValidPin = await bcrypt.compare(pin, user.passwordHash);
      if (!isValidPin) {
        return { success: false, error: "Invalid PIN" };
      }

      const subject = await this.localDb.findSubjectByCode(subjectCode);
      if (!subject) {
        return { success: false, error: "Invalid subject code" };
      }

      if (user.class !== subject.class) {
        return {
          success: false,
          error: "Subject not available for your class",
        };
      }

      const existingAttempt = await this.localDb.findIncompleteAttempt(
        user.id,
        subject.id
      );

      const sessionToken = this.generateSessionToken(user.id, subject.id);

      return {
        success: true,
        user,
        subject,
        existingAttempt,
        sessionToken,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  }

  async validateSession(token: string): Promise<{
    valid: boolean;
    userId?: string;
    subjectId?: string;
  }> {
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [userId, subjectId, timestamp] = decoded.split(":");

      if (!userId || !subjectId || !timestamp) {
        return { valid: false };
      }

      // Check if token is not too old (24 hours)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - tokenTime > maxAge) {
        return { valid: false };
      }

      const user = await this.localDb.findUserById(userId);
      const subject = await this.localDb.findSubjectById(subjectId);

      if (!user || !subject) {
        return { valid: false };
      }

      return {
        valid: true,
        userId,
        subjectId,
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return { valid: false };
    }
  }

  private generateSessionToken(userId: string, subjectId: string): string {
    const timestamp = Date.now().toString();
    const payload = `${userId}:${subjectId}:${timestamp}`;
    return Buffer.from(payload).toString("base64");
  }

  /**
   * Authenticate admin with username and password
   */
  async authenticateAdmin(
    username: string,
    password: string
  ): Promise<AdminAuthResult> {
    try {
      if (!this.remoteDb || !this.remoteDb.isConnected()) {
        return {
          success: false,
          error: "Remote authentication service unavailable",
        };
      }

      const admin = await this.remoteDb.findAdminByUsername(username);
      if (!admin) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      const isValidPassword = await bcrypt.compare(
        password,
        admin.passwordHash
      );
      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      if (admin.status !== "ACTIVE") {
        return {
          success: false,
          error: "Account is not active",
        };
      }

      const JWT_SECRET = process.env.JWT_SECRET!;

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not set");
      }

      const sessionToken = jwt.sign(
        {
          adminId: admin.id,
          username: admin.username,
          role: admin.role,
          iat: Math.floor(Date.now() / 1000),
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      await this.remoteDb.updateAdminLastLogin(admin.id);

      return {
        success: true,
        admin,
        sessionToken,
      };
    } catch (error) {
      console.error("Admin authentication error:", error);
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  }

  /**
   * Validate admin session token using JWT
   */
  async validateAdminSession(token: string): Promise<{
    valid: boolean;
    adminId?: string;
  }> {
    try {
      const JWT_SECRET = process.env.JWT_SECRET;

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not set");
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        adminId: string;
        username: string;
        role: string;
        iat: number;
      };

      if (this.remoteDb && this.remoteDb.isConnected()) {
        const admin = await this.remoteDb.findAdminById(decoded.adminId);
        if (!admin || admin.status !== "ACTIVE") {
          return { valid: false };
        }
      }
      return {
        valid: true,
        adminId: decoded.adminId,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  // Admin Dashboard Methods
  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }
    return this.remoteDb.getDashboardStats();
  }

  async getAllUsersWithAttempts(): Promise<UserWithAttempts[]> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }
    return this.remoteDb.getAllUsersWithAttempts();
  }

  async getAllSubjectsWithStats(): Promise<SubjectWithStats[]> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }
    return this.remoteDb.getAllSubjectsWithStats();
  }

  async getAllQuestionsWithStats(): Promise<QuestionWithStats[]> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }
    return this.remoteDb.getAllQuestionsWithStats();
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }
    return this.remoteDb.getAnalyticsData();
  }

  /**
   * Create a new admin user
   */
  async createAdmin(adminData: CreateAdminData): Promise<AdminCreationResult> {
    if (!this.remoteDb) {
      throw new Error("Remote database not available");
    }

    return this.remoteDb.createAdmin(adminData);
  }

  /**
   * Delete quiz attempts for admin operations
   * This allows users to retake tests after admin intervention
   */
  async deleteQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!this.remoteDb) {
      throw new Error("Remote database not available");
    }

    return this.remoteDb.deleteQuizAttempts(studentCode, subjectCode);
  }

  // TOD0: sync
  /**
   * Sync questions from remote database to local database
   * Uses subjectCode for duplicate detection and replacement
   */
  async syncQuestions(): Promise<{
    success: boolean;
    questionsPulled?: number;
    error?: string;
  }> {
    try {
      if (!this.remoteDb || !this.remoteDb.isConnected()) {
        return {
          success: false,
          error: "Remote database not available",
        };
      }

      // Get all active questions from remote database
      const remoteQuestions = await this.remoteDb.getAllQuestions();

      if (remoteQuestions.length === 0) {
        return {
          success: true,
          questionsPulled: 0,
          error: "No questions found in remote database",
        };
      }

      let syncedCount = 0;

      for (const remoteQuestion of remoteQuestions) {
        try {
          // Check if question already exists in local DB by subjectCode and questionOrder
          const existingQuestion =
            await this.localDb.findQuestionBySubjectCodeAndOrder(
              remoteQuestion.subjectCode,
              remoteQuestion.questionOrder
            );

          if (existingQuestion) {
            // Update existing question
            await this.localDb.updateQuestion(existingQuestion.id, {
              text: remoteQuestion.text,
              options: JSON.stringify(remoteQuestion.options),
              answer: remoteQuestion.answer,
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Find or create subject first
            let subject = await this.localDb.findSubjectByCode(
              remoteQuestion.subjectCode
            );

            if (!subject) {
              // Create subject if it doesn't exist
              const remoteSubject = await this.remoteDb.findSubjectByCode(
                remoteQuestion.subjectCode
              );
              if (remoteSubject) {
                await this.localDb.createSubject({
                  id: remoteSubject.id,
                  name: remoteSubject.name,
                  subjectCode: remoteSubject.subjectCode,
                  description: remoteSubject.description,
                  class: remoteSubject.class,
                  totalQuestions: remoteSubject.totalQuestions,
                });
                subject = await this.localDb.findSubjectByCode(
                  remoteQuestion.subjectCode
                );
              } else {
                console.warn(
                  `Subject not found for question: ${remoteQuestion.subjectCode}`
                );
                continue;
              }
            }

            if (subject) {
              // Create new question
              await this.localDb.createQuestion({
                id: remoteQuestion.id,
                subjectId: subject.id,
                subjectCode: remoteQuestion.subjectCode,
                text: remoteQuestion.text,
                options: JSON.stringify(remoteQuestion.options),
                answer: remoteQuestion.answer,
                questionOrder: remoteQuestion.questionOrder,
              });
            }
          }

          syncedCount++;
        } catch (questionError) {
          console.warn(
            `Failed to sync question ${remoteQuestion.id}:`,
            questionError
          );
        }
      }

      return {
        success: true,
        questionsPulled: syncedCount,
      };
    } catch (error) {
      console.error("Sync questions error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }
}
