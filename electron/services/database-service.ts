import { LocalDatabaseService } from "../../src/lib/database/local-database-service.js";
import { RemoteDatabaseService } from "../../src/lib/database/remote-database-service.js";
import { CSVImportService } from "../../src/lib/import/csv-import-service.js";
import { SyncEngine } from "../../src/lib/sync/sync-engine.js";
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
} from "../../src/lib/database/local-schema.js";
import type {
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
  SyncOperationType,
  UserSeedData,
  QuestionSyncResult,
  UserSyncResult,
  LocalProcessedQuestion,
} from "../../src/types/app.js";
import type { SyncTrigger } from "../../src/lib/sync/sync-engine.js";
import { usersTable } from "../../src/lib/database/local-schema.js";
import { eq } from "drizzle-orm";

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
          console.log({ sent: this.remoteDb });
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

  async getProcessedQuestionsForSubject(
    subjectId: string
  ): Promise<LocalProcessedQuestion> {
    return this.localDb.getProcessedQuestionsForSubject(subjectId);
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

  async hasSubmittedAttempt(
    userId: string,
    subjectId: string
  ): Promise<boolean> {
    return this.localDb.hasSubmittedAttempt(userId, subjectId);
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
        console.log({ dhhd: process.env.NEON_DATABASE_URL });
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
   * Delete quiz attempts for a user and subject (Admin operation via remote)
   */
  async deleteQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      return {
        success: false,
        error: "Remote database connection not available",
      };
    }

    return this.remoteDb.deleteQuizAttempts(studentCode, subjectCode);
  }

  /**
   * Delete quiz attempts from local database
   * This allows users to retake tests locally after admin intervention
   */
  async deleteLocalQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    return this.localDb.deleteQuizAttempts(studentCode, subjectCode);
  }

  /**
   * Bulk create questions directly to remote database
   */
  async remoteBulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      return {
        success: false,
        created: 0,
        error: "Remote database not available",
      };
    }

    try {
      const result = await this.remoteDb.bulkCreateQuestions(questions);
      console.log(
        `Remote bulk created ${result.created} questions successfully`
      );
      return result;
    } catch (error) {
      console.error("Remote bulk question creation error:", error);
      return {
        success: false,
        created: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a student directly to remote database
   */
  async remoteCreateStudent(
    studentData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database not available");
    }

    try {
      const hashedPassword = await bcrypt.hash(studentData.passwordHash, 10);

      const studentDataWithHashedPassword = {
        ...studentData,
        passwordHash: hashedPassword,
      };

      await this.remoteDb.createUser({
        ...studentDataWithHashedPassword,
        lastLogin: null,
        isActive: true,
      });
      console.log(
        `Remote student created successfully: ${studentData.studentCode}`
      );
    } catch (error) {
      console.error("Remote student creation error:", error);
      throw new Error(
        `Failed to create student: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * sync questions from remote database to local database
   */
  async syncQuestions(options?: {
    replaceExisting?: boolean;
    subjectCodes?: string[];
  }): Promise<QuestionSyncResult> {
    const replaceExisting = options?.replaceExisting || false;
    const targetSubjectCodes = options?.subjectCodes;

    try {
      if (!this.remoteDb || !this.remoteDb.isConnected()) {
        return {
          success: false,
          error: "Remote database not available",
        };
      }

      console.log("Starting enhanced question sync...", {
        replaceExisting,
        targetSubjectCodes,
      });

      const [remoteQuestions, remoteSubjects] = await Promise.all([
        this.remoteDb.getAllQuestions(),
        this.remoteDb.getAllSubjects(),
      ]);

      if (remoteQuestions.length === 0) {
        return {
          success: true,
          questionsPulled: 0,
          subjectsSynced: 0,
          error: "No questions found in remote database",
        };
      }

      console.log(
        `Remote data: ${remoteQuestions.length} questions, ${remoteSubjects.length} subjects`
      );

      let filteredQuestions = remoteQuestions;
      if (targetSubjectCodes && targetSubjectCodes.length > 0) {
        filteredQuestions = remoteQuestions.filter((q) =>
          targetSubjectCodes.includes(q.subjectCode)
        );
        console.log(
          `Filtered to ${
            filteredQuestions.length
          } questions for subjects: ${targetSubjectCodes.join(", ")}`
        );
      }

      const questionsBySubject = new Map<string, typeof remoteQuestions>();
      filteredQuestions.forEach((question) => {
        const subjectCode = question.subjectCode;
        if (!questionsBySubject.has(subjectCode)) {
          questionsBySubject.set(subjectCode, []);
        }
        questionsBySubject.get(subjectCode)!.push(question);
      });

      let totalSyncedQuestions = 0;
      let newSubjectsCreated = 0;
      let updatedQuestions = 0;
      let newQuestions = 0;
      let skippedQuestions = 0;
      let replacedSubjects = 0;

      for (const [subjectCode, subjectQuestions] of questionsBySubject) {
        try {
          console.log(
            `Processing ${subjectQuestions.length} questions for subject: ${subjectCode}`
          );

          let localSubject = await this.localDb.findSubjectByCode(subjectCode);

          if (!localSubject) {
            const remoteSubject = remoteSubjects.find(
              (s) => s.subjectCode === subjectCode
            );
            if (remoteSubject) {
              await this.localDb.createSubject({
                id: remoteSubject.id,
                name: remoteSubject.name,
                subjectCode: remoteSubject.subjectCode,
                description: remoteSubject.description || "",
                class: remoteSubject.class,
                category: remoteSubject.category || null,
                academicYear: remoteSubject.academicYear || null,
              });
              localSubject = await this.localDb.findSubjectByCode(subjectCode);
              newSubjectsCreated++;
              console.log(`Created new subject: ${subjectCode}`);
            } else {
              console.warn(
                `Remote subject not found for code: ${subjectCode}, skipping questions`
              );
              skippedQuestions += subjectQuestions.length;
              continue;
            }
          }

          if (!localSubject) {
            console.warn(`Failed to create/find local subject: ${subjectCode}`);
            skippedQuestions += subjectQuestions.length;
            continue;
          }

          const questionsToCreate: Array<
            Omit<NewQuestion, "createdAt" | "updatedAt">
          > = [];
          const questionsToUpdate: Array<{
            id: string;
            updates: Partial<Omit<NewQuestion, "id" | "createdAt">>;
          }> = [];

          for (const remoteQuestion of subjectQuestions) {
            try {
              let shouldCreate = true;

              if (!replaceExisting) {
                const existingQuestion =
                  await this.localDb.findQuestionBySubjectCodeAndOrder(
                    remoteQuestion.subjectCode,
                    remoteQuestion.questionOrder
                  );

                if (existingQuestion) {
                  questionsToUpdate.push({
                    id: existingQuestion.id,
                    updates: {
                      text: remoteQuestion.text,
                      options: JSON.stringify(remoteQuestion.options),
                      answer: remoteQuestion.answer,
                      explanation: remoteQuestion.explanation || null,
                      updatedAt: new Date().toISOString(),
                    },
                  });
                  shouldCreate = false;
                }
              }

              if (shouldCreate) {
                questionsToCreate.push({
                  id: remoteQuestion.id,
                  subjectId: localSubject.id,
                  subjectCode: remoteQuestion.subjectCode,
                  text: remoteQuestion.text,
                  options: JSON.stringify(remoteQuestion.options),
                  answer: remoteQuestion.answer,
                  questionOrder: remoteQuestion.questionOrder,
                  explanation: remoteQuestion.explanation || null,
                  isActive: true,
                });
              }
            } catch (questionProcessError) {
              console.warn(
                `Error processing question ${remoteQuestion.id}:`,
                questionProcessError
              );
              skippedQuestions++;
            }
          }

          try {
            await this.processSubjectInTransaction(
              subjectCode,
              replaceExisting,
              questionsToCreate,
              questionsToUpdate
            );

            newQuestions += questionsToCreate.length;
            updatedQuestions += questionsToUpdate.length;
            totalSyncedQuestions +=
              questionsToCreate.length + questionsToUpdate.length;

            if (replaceExisting && questionsToCreate.length > 0) {
              replacedSubjects++;
            }

            console.log(
              `Successfully synced ${
                questionsToCreate.length + questionsToUpdate.length
              } questions for ${subjectCode}`
            );
          } catch (transactionError) {
            console.error(
              `Transaction failed for subject ${subjectCode}:`,
              transactionError
            );
            skippedQuestions +=
              questionsToCreate.length + questionsToUpdate.length;
          }
        } catch (subjectError) {
          console.error(
            `Failed to process subject ${subjectCode}:`,
            subjectError
          );
          skippedQuestions += subjectQuestions.length;
        }
      }

      const result = {
        success: true,
        questionsPulled: totalSyncedQuestions,
        subjectsSynced: questionsBySubject.size,
        details: {
          newSubjects: newSubjectsCreated,
          updatedQuestions,
          newQuestions,
          skippedQuestions,
          replacedSubjects,
        },
      };

      console.log("Enhanced question sync completed:", result);
      return result;
    } catch (error) {
      console.error("Enhanced sync questions error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  /**
   * Sync users from remote database to local database
   */
  async syncUsers(options?: {
    replaceExisting?: boolean;
  }): Promise<UserSyncResult> {
    const replaceExisting = options?.replaceExisting || false;

    try {
      if (!this.remoteDb || !this.remoteDb.isConnected()) {
        return {
          success: false,
          error: "Remote database not available",
        };
      }

      console.log("Starting user sync...", { replaceExisting });

      const remoteUsers = await this.remoteDb.getAllUsers();

      if (remoteUsers.length === 0) {
        return {
          success: true,
          usersSynced: 0,
          classesSynced: 0,
          error: "No users found in remote database",
        };
      }

      console.log(`Remote data: ${remoteUsers.length} users`);

      const usersByClass = new Map<string, typeof remoteUsers>();
      remoteUsers.forEach((user) => {
        const userClass = user.class;
        if (!usersByClass.has(userClass)) {
          usersByClass.set(userClass, []);
        }
        usersByClass.get(userClass)!.push(user);
      });

      let totalSyncedUsers = 0;
      let newUsers = 0;
      let updatedUsers = 0;
      let skippedUsers = 0;

      console.log("Pre-fetching existing users for transaction...");
      const existingUsers = new Map<string, User>();
      for (const remoteUser of remoteUsers) {
        try {
          const existing = await this.localDb.findUserByStudentCode(
            remoteUser.studentCode
          );
          if (existing) {
            existingUsers.set(remoteUser.studentCode, existing);
          }
        } catch (error) {
          console.warn(
            `Error pre-fetching user ${remoteUser.studentCode}:`,
            error
          );
        }
      }

      const usersToCreate: Array<
        Omit<NewUser, "createdAt" | "updatedAt"> & {
          createdAt: string;
          updatedAt: string;
        }
      > = [];
      const usersToUpdate: Array<{
        id: string;
        updates: Partial<Omit<NewUser, "id" | "createdAt">>;
      }> = [];

      for (const [userClass, classUsers] of usersByClass) {
        console.log(
          `Processing ${classUsers.length} users for class: ${userClass}`
        );

        for (const remoteUser of classUsers) {
          try {
            const existingUser = existingUsers.get(remoteUser.studentCode);

            if (existingUser) {
              if (replaceExisting) {
                usersToUpdate.push({
                  id: existingUser.id,
                  updates: {
                    name: remoteUser.name,
                    passwordHash: remoteUser.passwordHash,
                    class: remoteUser.class,
                    gender: remoteUser.gender,
                    isActive: remoteUser.isActive ?? true,
                    updatedAt: new Date().toISOString(),
                  },
                });
                updatedUsers++;
              } else {
                skippedUsers++;
              }
            } else {
              usersToCreate.push({
                id: remoteUser.id,
                name: remoteUser.name,
                studentCode: remoteUser.studentCode,
                passwordHash: remoteUser.passwordHash,
                class: remoteUser.class,
                gender: remoteUser.gender,
                isActive: remoteUser.isActive ?? true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              newUsers++;
            }
            totalSyncedUsers++;
          } catch (userProcessError) {
            console.warn(
              `Error processing user ${remoteUser.studentCode}:`,
              userProcessError
            );
            skippedUsers++;
          }
        }
      }

      console.log(
        `Executing chunked transactions with ${usersToCreate.length} creates and ${usersToUpdate.length} updates...`
      );

      await this.processUsersInChunkedTransactions(
        usersToCreate,
        usersToUpdate
      );

      const result = {
        success: true,
        usersSynced: totalSyncedUsers,
        classesSynced: usersByClass.size,
        details: {
          newUsers,
          updatedUsers,
          skippedUsers,
        },
      };

      console.log("User sync completed:", result);
      return result;
    } catch (error) {
      console.error("Sync users error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  /**
   * Get student credentials (for admin panel)
   */
  async getStudentCredentials(): Promise<Array<UserSeedData>> {
    if (!this.remoteDb || !this.remoteDb.isConnected()) {
      throw new Error("Remote database connection not available");
    }

    return this.remoteDb.getStudentCredentials();
  }

  /**
   * Update subject question count for a specific subject
   */
  async updateSubjectQuestionCount(subjectCode: string): Promise<void> {
    try {
      await this.localDb.updateSubjectQuestionCount(subjectCode);
      console.log(`Updated local question count for subject ${subjectCode}`);
    } catch (error) {
      console.error(
        `Failed to update question count for subject ${subjectCode}:`,
        error
      );
      throw error;
    }
  }

  /**
   * User regulation methods for admin control (Local-first approach with remote sync)
   */

  /**
   * Toggle active state for all users
   */
  async toggleAllUsersActive(
    isActive: boolean
  ): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    try {
      // Always update local database first
      const localResult = await this.localDb.toggleAllUsersActive(isActive);

      if (!localResult.success) {
        return localResult;
      }

      // Try to sync with remote if available
      if (this.remoteDb && this.isRemoteAvailable()) {
        try {
          const remoteResult = await this.remoteDb.toggleAllUsersActive(
            isActive
          );
          console.log(
            `MainDatabaseService: Synced toggle all users active (${isActive}) to remote database`
          );
        } catch (error) {
          console.warn(
            `MainDatabaseService: Failed to sync toggle all users active to remote:`,
            error
          );
          // Don't fail the operation if remote sync fails
        }
      }

      return localResult;
    } catch (error) {
      console.error(
        "MainDatabaseService: Error toggling all users active state:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Toggle active state for a specific user
   */
  async toggleUserActive(
    studentCode: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string; updated?: boolean }> {
    try {
      const localResult = await this.localDb.toggleUserActive(
        studentCode,
        isActive
      );

      if (!localResult.success) {
        return localResult;
      }

      if (this.remoteDb && this.isRemoteAvailable()) {
        try {
          const remoteResult = await this.remoteDb.toggleUserActive(
            studentCode,
            isActive
          );
          console.log(
            `MainDatabaseService: Synced toggle user active (${studentCode}, ${isActive}) to remote database`
          );
        } catch (error) {
          console.warn(
            `MainDatabaseService: Failed to sync toggle user active to remote:`,
            error
          );
        }
      }

      return localResult;
    } catch (error) {
      console.error(
        "MainDatabaseService: Error toggling user active state:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Change user PIN
   */

  async changeUserPin(
    studentCode: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string; updated?: boolean }> {
    try {
      const localResult = await this.localDb.changeUserPin(studentCode, newPin);

      if (!localResult.success) {
        return localResult;
      }

      if (this.remoteDb && this.isRemoteAvailable()) {
        try {
          await this.remoteDb.changeUserPin(studentCode, newPin);
          console.log(
            `MainDatabaseService: Synced change user PIN (${studentCode}) to remote database`
          );
        } catch (error) {
          console.warn(
            `MainDatabaseService: Failed to sync change user PIN to remote:`,
            error
          );
        }
      }

      return localResult;
    } catch (error) {
      console.error("MainDatabaseService: Error changing user PIN:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Process a subject's questions within a transaction for atomicity
   */
  private async processSubjectInTransaction(
    subjectCode: string,
    replaceExisting: boolean,
    questionsToCreate: Array<Omit<NewQuestion, "createdAt" | "updatedAt">>,
    questionsToUpdate: Array<{
      id: string;
      updates: Partial<Omit<NewQuestion, "id" | "createdAt">>;
    }>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.localDb.transaction(() => {
          // 1. If replace mode, delete all existing questions for this subject
          if (replaceExisting) {
            this.localDb.deleteQuestionsBySubjectCodeSync(subjectCode);
          }

          // 2. Bulk create new questions
          if (questionsToCreate.length > 0) {
            this.localDb.bulkCreateQuestionsSync(questionsToCreate);
          }

          // 3. Update existing questions (only in update mode)
          if (!replaceExisting && questionsToUpdate.length > 0) {
            for (const { id, updates } of questionsToUpdate) {
              this.localDb.updateQuestionSync(id, updates);
            }
          }

          // 4. Update subject question count
          this.localDb.updateSubjectQuestionCountSync(subjectCode);

          return { success: true };
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process users in chunked transactions for better performance and memory management
   */
  private async processUsersInChunkedTransactions(
    usersToCreate: Array<
      Omit<NewUser, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      }
    >,
    usersToUpdate: Array<{
      id: string;
      updates: Partial<Omit<NewUser, "id" | "createdAt">>;
    }>
  ): Promise<void> {
    const CHUNK_SIZE = 200;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      if (usersToCreate.length > 0) {
        for (let i = 0; i < usersToCreate.length; i += CHUNK_SIZE) {
          const chunk = usersToCreate.slice(i, i + CHUNK_SIZE);

          this.localDb.transaction((tx) => {
            tx.insert(usersTable).values(chunk).run();
          });

          totalCreated += chunk.length;
          console.log(
            `Created user chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${
              chunk.length
            } users (Total: ${totalCreated}/${usersToCreate.length})`
          );
        }
      }

      if (usersToUpdate.length > 0) {
        for (let i = 0; i < usersToUpdate.length; i += CHUNK_SIZE) {
          const chunk = usersToUpdate.slice(i, i + CHUNK_SIZE);

          this.localDb.transaction((tx) => {
            for (const userUpdate of chunk) {
              tx.update(usersTable)
                .set(userUpdate.updates)
                .where(eq(usersTable.id, userUpdate.id))
                .run();
            }
          });

          totalUpdated += chunk.length;
          console.log(
            `Updated user chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${
              chunk.length
            } users (Total: ${totalUpdated}/${usersToUpdate.length})`
          );
        }
      }

      console.log(
        `User sync transactions completed: ${totalCreated} created, ${totalUpdated} updated in chunks of ${CHUNK_SIZE}`
      );
    } catch (error) {
      console.error("Chunked user transaction error:", error);
      throw error;
    }
  }

  /**
   * Check if local database is empty (no subjects or questions)
   */
  async isLocalDBEmpty(): Promise<boolean> {
    try {
      const subjects = await this.localDb.executeRawSQL(
        "SELECT COUNT(*) as count FROM subjects"
      );
      const subjectCount = (subjects[0] as { count: number })?.count || 0;

      const questions = await this.localDb.executeRawSQL(
        "SELECT COUNT(*) as count FROM questions"
      );
      const questionCount = (questions[0] as { count: number })?.count || 0;

      return subjectCount === 0 && questionCount === 0;
    } catch (error) {
      console.error("Check if local DB is empty error:", error);
      return false;
    }
  }

  /**
   * Sync local database from remote
   * Follows the same pattern as pullFreshData in sync-engine.ts
   */
  async syncLocalDBFromRemote(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    totalSynced?: number;
  }> {
    return this.localDb.syncLocalDBFromRemote();
  }
}
