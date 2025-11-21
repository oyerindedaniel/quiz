import { eq, and, sql } from "drizzle-orm";
import { SQLiteManager } from "./sqlite.js";
import { localSchema } from "./local-schema.js";
import type {
  User,
  NewUser,
  Subject,
  NewSubject,
  Question,
  NewQuestion,
  QuizAttempt,
  NewQuizAttempt,
} from "./local-schema.js";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { isElectron } from "../../utils/lib.js";
import { app } from "electron";
import { RemoteDatabaseService } from "./remote-database-service.js";
import { AutoSeedingService } from "../seeding/auto-seeding-service.js";
import type { LocalProcessedQuestion } from "../../types/app.js";

interface CountResult {
  count: number;
}

export class LocalDatabaseService {
  private static instance: LocalDatabaseService;
  private db: BetterSQLite3Database<typeof localSchema> | null = null;
  private sqliteManager: SQLiteManager | null = null;

  private constructor() {}

  public static getInstance(): LocalDatabaseService {
    if (!LocalDatabaseService.instance) {
      LocalDatabaseService.instance = new LocalDatabaseService();
    }
    return LocalDatabaseService.instance;
  }

  /**
   * Initialize the database connection
   */
  public async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    this.sqliteManager = SQLiteManager.getInstance(this.getDbPath());
    this.db = await this.sqliteManager.initialize();
  }

  /**
   * Get the database instance
   */
  private getDb(): BetterSQLite3Database<typeof localSchema> {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Get the SQLite manager for raw SQL operations
   */
  private getSqliteManager(): SQLiteManager {
    if (!this.sqliteManager) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.sqliteManager;
  }

  // User operations
  async findUserByStudentCode(studentCode: string): Promise<User | null> {
    const db = this.getDb();
    const users = await db
      .select()
      .from(localSchema.users)
      .where(
        and(
          eq(localSchema.users.studentCode, studentCode),
          eq(localSchema.users.isActive, true)
        )
      )
      .limit(1);

    return users[0] || null;
  }

  async findUserById(userId: string): Promise<User | null> {
    const db = this.getDb();
    const users = await db
      .select()
      .from(localSchema.users)
      .where(
        and(
          eq(localSchema.users.id, userId),
          eq(localSchema.users.isActive, true)
        )
      )
      .limit(1);

    return users[0] || null;
  }

  async createUser(
    userData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db.insert(localSchema.users).values({
      ...userData,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateUser(
    userId: string,
    userData: Partial<Omit<NewUser, "id" | "createdAt">>
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db
      .update(localSchema.users)
      .set({
        ...userData,
        updatedAt: now,
      })
      .where(eq(localSchema.users.id, userId));
  }

  // Subject operations
  async findSubjectByCode(subjectCode: string): Promise<Subject | null> {
    const db = this.getDb();
    const subjects = await db
      .select()
      .from(localSchema.subjects)
      .where(
        and(
          eq(localSchema.subjects.subjectCode, subjectCode),
          eq(localSchema.subjects.isActive, true)
        )
      )
      .limit(1);

    return subjects[0] || null;
  }

  async findSubjectById(subjectId: string): Promise<Subject | null> {
    const db = this.getDb();
    const subjects = await db
      .select()
      .from(localSchema.subjects)
      .where(
        and(
          eq(localSchema.subjects.id, subjectId),
          eq(localSchema.subjects.isActive, true)
        )
      )
      .limit(1);

    return subjects[0] || null;
  }

  async createSubject(
    subjectData: Omit<NewSubject, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db.insert(localSchema.subjects).values({
      ...subjectData,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Quiz attempt operations
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<QuizAttempt | null> {
    const db = this.getDb();
    const attempts = await db
      .select()
      .from(localSchema.quizAttempts)
      .where(
        and(
          eq(localSchema.quizAttempts.userId, userId),
          eq(localSchema.quizAttempts.subjectId, subjectId),
          eq(localSchema.quizAttempts.submitted, false)
        )
      )
      .limit(1);

    return attempts[0] || null;
  }

  async hasSubmittedAttempt(
    userId: string,
    subjectId: string
  ): Promise<boolean> {
    const db = this.getDb();
    const attempts = await db
      .select()
      .from(localSchema.quizAttempts)
      .where(
        and(
          eq(localSchema.quizAttempts.userId, userId),
          eq(localSchema.quizAttempts.subjectId, subjectId),
          eq(localSchema.quizAttempts.submitted, true)
        )
      )
      .limit(1);

    return attempts.length > 0;
  }

  async createQuizAttempt(
    attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt">
  ): Promise<string> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db.insert(localSchema.quizAttempts).values({
      ...attemptData,
      startedAt: now,
      updatedAt: now,
    });

    return attemptData.id;
  }

  async getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
    const db = this.getDb();
    const attempts = await db
      .select()
      .from(localSchema.quizAttempts)
      .where(eq(localSchema.quizAttempts.id, attemptId))
      .limit(1);

    return attempts[0] || null;
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    const db = this.getDb();

    const attempts = await db
      .select({ answers: localSchema.quizAttempts.answers })
      .from(localSchema.quizAttempts)
      .where(eq(localSchema.quizAttempts.id, attemptId))
      .limit(1);

    if (attempts.length === 0) {
      throw new Error("Quiz attempt not found");
    }

    const currentAnswers = attempts[0].answers
      ? JSON.parse(attempts[0].answers)
      : {};

    currentAnswers[questionId] = answer;

    const updatedAttempt = await db
      .update(localSchema.quizAttempts)
      .set({
        answers: JSON.stringify(currentAnswers),
        updatedAt: new Date().toISOString(),
        synced: false,
        syncAttemptedAt: null,
      })
      .where(eq(localSchema.quizAttempts.id, attemptId));
  }

  async submitQuizAttempt(
    attemptId: string,
    score: number,
    sessionDuration: number
  ): Promise<void> {
    const db = this.getDb();

    await db
      .update(localSchema.quizAttempts)
      .set({
        submitted: true,
        score,
        submittedAt: new Date().toISOString(),
        sessionDuration,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(localSchema.quizAttempts.id, attemptId));
  }

  async updateElapsedTime(
    attemptId: string,
    elapsedTime: number
  ): Promise<void> {
    const db = this.getDb();

    await db
      .update(localSchema.quizAttempts)
      .set({
        elapsedTime,
        lastActiveAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(localSchema.quizAttempts.id, attemptId));
  }

  // Question operations
  async getQuestionsForSubject(subjectId: string): Promise<Question[]> {
    const db = this.getDb();
    return db
      .select()
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectId, subjectId),
          eq(localSchema.questions.isActive, true)
        )
      )
      .orderBy(localSchema.questions.questionOrder);
  }

  async getProcessedQuestionsForSubject(
    subjectId: string
  ): Promise<LocalProcessedQuestion> {
    const db = this.getDb();

    const questionItems = await db
      .select()
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectId, subjectId),
          eq(localSchema.questions.isActive, true)
        )
      )
      .orderBy(localSchema.questions.questionOrder);

    const answerableQuestions = await db
      .select()
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectId, subjectId),
          eq(localSchema.questions.isActive, true),
          sql`${localSchema.questions.text} NOT LIKE '[PASSAGE]%'`,
          sql`${localSchema.questions.text} NOT LIKE '[HEADER]%'`,
          sql`${localSchema.questions.text} NOT LIKE '[IMAGE]%'`
        )
      );

    return {
      questionItems,
      actualQuestions: answerableQuestions,
      totalQuestions: answerableQuestions.length,
    };
  }

  async createQuestion(
    questionData: Omit<NewQuestion, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();

    await db.insert(localSchema.questions).values({
      ...questionData,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Update subject question count
   */
  async updateSubjectQuestionCount(subjectCode: string): Promise<void> {
    const db = this.getDb();

    const questionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectCode, subjectCode),
          eq(localSchema.questions.isActive, true),

          sql`${localSchema.questions.text} NOT LIKE '[PASSAGE]%'`,
          sql`${localSchema.questions.text} NOT LIKE '[HEADER]%'`,
          sql`${localSchema.questions.text} NOT LIKE '[IMAGE]%'`
        )
      );

    const count = questionCount[0]?.count || 0;

    await db
      .update(localSchema.subjects)
      .set({
        totalQuestions: count,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(localSchema.subjects.subjectCode, subjectCode));

    console.log(
      `Updated question count for subject ${subjectCode}: ${count} answerable questions`
    );
  }

  /**
   * Bulk create questions
   */
  async bulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    if (questions.length === 0) {
      return { success: true, created: 0 };
    }

    const db = this.getDb();
    const now = new Date().toISOString();
    const CHUNK_SIZE = 500;
    let totalCreated = 0;

    try {
      const questionsWithTimestamps = questions.map((questionData) => ({
        ...questionData,
        createdAt: now,
        updatedAt: now,
      }));

      for (let i = 0; i < questionsWithTimestamps.length; i += CHUNK_SIZE) {
        const chunk = questionsWithTimestamps.slice(i, i + CHUNK_SIZE);

        try {
          const result = db.transaction(() => {
            db.insert(localSchema.questions).values(chunk).run();
            return { created: chunk.length };
          });

          totalCreated += result.created;

          console.log(
            `Bulk created chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${
              result.created
            } questions (Total: ${totalCreated}/${questions.length})`
          );
        } catch (chunkError) {
          console.error(
            `Failed to create chunk starting at index ${i}:`,
            chunkError
          );
          throw chunkError;
        }
      }

      console.log(
        `Bulk created ${totalCreated} questions successfully in ${Math.ceil(
          questions.length / CHUNK_SIZE
        )} chunks`
      );

      return {
        success: true,
        created: totalCreated,
      };
    } catch (error) {
      console.error("Bulk question creation error:", error);
      return {
        success: false,
        created: totalCreated,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a function within a transaction (synchronous for better-sqlite3)
   */
  transaction<T>(
    callback: (tx: BetterSQLite3Database<typeof localSchema>) => T
  ): T {
    const db = this.getDb();
    return db.transaction(callback);
  }

  /**
   * Synchronous methods for use within transactions
   * These are needed for the transaction-based sync operations
   */

  /**
   * Synchronous version of deleteQuestionsBySubjectCode for use in transactions
   */
  deleteQuestionsBySubjectCodeSync(subjectCode: string): number {
    const db = this.getDb();
    const result = db
      .delete(localSchema.questions)
      .where(eq(localSchema.questions.subjectCode, subjectCode))
      .returning({ id: localSchema.questions.id })
      .run();

    return result.changes;
  }

  /**
   * Synchronous version of bulkCreateQuestions for use in transactions
   */
  bulkCreateQuestionsSync(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): void {
    if (questions.length === 0) return;

    const db = this.getDb();
    const now = new Date().toISOString();
    const CHUNK_SIZE = 500;

    const questionsWithTimestamps = questions.map((q) => ({
      ...q,
      createdAt: now,
      updatedAt: now,
    }));

    for (let i = 0; i < questionsWithTimestamps.length; i += CHUNK_SIZE) {
      const chunk = questionsWithTimestamps.slice(i, i + CHUNK_SIZE);
      db.insert(localSchema.questions).values(chunk).run();
    }
  }

  /**
   * Synchronous version of updateQuestion for use in transactions
   */
  updateQuestionSync(
    questionId: string,
    questionData: Partial<Omit<NewQuestion, "id" | "createdAt">>
  ): void {
    const db = this.getDb();
    const now = new Date().toISOString();

    const updateData = {
      ...questionData,
      updatedAt: now,
    };

    db.update(localSchema.questions)
      .set(updateData)
      .where(eq(localSchema.questions.id, questionId))
      .run();
  }

  /**
   * Synchronous version of updateSubjectQuestionCount for use in transactions
   */
  updateSubjectQuestionCountSync(subjectCode: string): void {
    const db = this.getDb();

    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectCode, subjectCode),
          eq(localSchema.questions.isActive, true)
        )
      )
      .get();

    const questionCount = countResult?.count || 0;
    const now = new Date().toISOString();

    db.update(localSchema.subjects)
      .set({
        totalQuestions: questionCount,
        updatedAt: now,
      })
      .where(eq(localSchema.subjects.subjectCode, subjectCode))
      .run();
  }

  async findQuestionBySubjectCodeAndOrder(
    subjectCode: string,
    questionOrder: number
  ): Promise<Question | null> {
    const db = this.getDb();
    const questions = await db
      .select()
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectCode, subjectCode),
          eq(localSchema.questions.questionOrder, questionOrder),
          eq(localSchema.questions.isActive, true)
        )
      )
      .limit(1);

    return questions[0] || null;
  }

  async updateQuestion(
    questionId: string,
    questionData: Partial<Omit<NewQuestion, "id" | "createdAt">>
  ): Promise<void> {
    const db = this.getDb();

    await db
      .update(localSchema.questions)
      .set({
        ...questionData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(localSchema.questions.id, questionId));
  }

  /**
   * Delete all questions for a specific subject code
   * Useful for complete subject re-sync
   */
  async deleteQuestionsBySubjectCode(subjectCode: string): Promise<number> {
    const db = this.getDb();

    const result = await db
      .delete(localSchema.questions)
      .where(eq(localSchema.questions.subjectCode, subjectCode))
      .returning({ id: localSchema.questions.id });

    return result.length;
  }

  /**
   * Get all questions for a subject by subject code
   */
  async getQuestionsBySubjectCode(subjectCode: string): Promise<Question[]> {
    const db = this.getDb();
    return db
      .select()
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectCode, subjectCode),
          eq(localSchema.questions.isActive, true)
        )
      )
      .orderBy(localSchema.questions.questionOrder);
  }

  /**
   * Count questions for a subject by subject code
   */
  async countQuestionsBySubjectCode(subjectCode: string): Promise<number> {
    const db = this.getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(localSchema.questions)
      .where(
        and(
          eq(localSchema.questions.subjectCode, subjectCode),
          eq(localSchema.questions.isActive, true)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Delete quiz attempts for a specific user and subject
   * This allows users to retake tests after admin intervention
   */
  async deleteQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    try {
      const db = this.getDb();

      const userResult = await db
        .select({
          id: localSchema.users.id,
          class: localSchema.users.class,
        })
        .from(localSchema.users)
        .where(eq(localSchema.users.studentCode, studentCode))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, error: "User not found" };
      }

      const { id: userId, class: userClass } = userResult[0];

      const subjectResult = await db
        .select({
          id: localSchema.subjects.id,
          class: localSchema.subjects.class,
          isActive: localSchema.subjects.isActive,
        })
        .from(localSchema.subjects)
        .where(
          and(
            eq(localSchema.subjects.subjectCode, subjectCode),
            eq(localSchema.subjects.class, userClass),
            eq(localSchema.subjects.isActive, true)
          )
        )
        .limit(1);

      if (subjectResult.length === 0) {
        return {
          success: false,
          error: "Subject not found or not available for this student's class",
        };
      }

      const subjectId = subjectResult[0].id;

      const deleteResult = await db
        .delete(localSchema.quizAttempts)
        .where(
          and(
            eq(localSchema.quizAttempts.userId, userId),
            eq(localSchema.quizAttempts.subjectId, subjectId)
          )
        )
        .returning({ id: localSchema.quizAttempts.id });

      return {
        success: true,
        deletedCount: deleteResult.length,
        error:
          deleteResult.length === 0
            ? "No quiz attempts found for this subject"
            : undefined,
      };
    } catch (error) {
      console.error("Delete quiz attempts error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete quiz attempts",
      };
    }
  }

  async checkIntegrity(): Promise<boolean> {
    if (isElectron()) {
      return window.electronAPI.database.checkIntegrity();
    }
    return false;
  }

  // Raw SQL operations (exposed for MainDatabaseService)
  async executeRawSQL(sql: string, params: unknown[] = []): Promise<unknown[]> {
    const sqliteManager = this.getSqliteManager();
    return sqliteManager.executeRawSQL(sql, params);
  }

  async runRawSQL(sql: string, params: unknown[] = []): Promise<unknown> {
    const sqliteManager = this.getSqliteManager();
    return sqliteManager.runRawSQL(sql, params);
  }

  async backupDatabase(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const sqliteManager = this.getSqliteManager();
    return sqliteManager.backup(backupPath);
  }

  async checkDatabaseIntegrity(): Promise<boolean> {
    const sqliteManager = this.getSqliteManager();
    return sqliteManager.checkIntegrity();
  }

  /**
   * User regulation methods for admin control
   */

  /**
   * Toggle active state for all users
   */
  async toggleAllUsersActive(
    isActive: boolean
  ): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    try {
      const db = this.getDb();
      const now = new Date().toISOString();

      const result = await db
        .update(localSchema.users)
        .set({
          isActive,
          updatedAt: now,
        })
        .returning({ id: localSchema.users.id });

      return {
        success: true,
        updatedCount: result.length,
      };
    } catch (error) {
      console.error("Error toggling all users active state:", error);
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
      const db = this.getDb();
      const now = new Date().toISOString();

      const result = await db
        .update(localSchema.users)
        .set({
          isActive,
          updatedAt: now,
        })
        .where(eq(localSchema.users.studentCode, studentCode))
        .returning({ id: localSchema.users.id });

      return {
        success: true,
        updated: result.length > 0,
      };
    } catch (error) {
      console.error("Error toggling user active state:", error);
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
      const db = this.getDb();
      const now = new Date().toISOString();

      const bcrypt = await import("bcryptjs");
      const hashedPin = await bcrypt.hash(newPin, 10);

      const result = await db
        .update(localSchema.users)
        .set({
          passwordHash: hashedPin,
          updatedAt: now,
        })
        .where(eq(localSchema.users.studentCode, studentCode))
        .returning({ id: localSchema.users.id });

      return {
        success: true,
        updated: result.length > 0,
      };
    } catch (error) {
      console.error("Error changing user PIN:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update user last login timestamp
   */
  async updateUserLastLogin(studentCode: string): Promise<void> {
    try {
      const db = this.getDb();
      const now = new Date().toISOString();

      await db
        .update(localSchema.users)
        .set({
          lastLogin: now,
          updatedAt: now,
        })
        .where(eq(localSchema.users.studentCode, studentCode));
    } catch (error) {
      console.error("Error updating user last login:", error);
    }
  }

  /**
   * Get the database path
   */
  private getDbPath(): string {
    const userDataPath = app.getPath("userData");
    console.log("userDataPath", userDataPath);
    return `${userDataPath}/quiz_app.db`;
  }

  /**
   * Cleanup database connections
   */
  async cleanup(): Promise<void> {
    console.log("LocalDatabaseService: Starting cleanup...");

    try {
      if (this.sqliteManager) {
        this.sqliteManager.close();
        this.sqliteManager = null;
        console.log("LocalDatabaseService: SQLite manager closed");
      }

      this.db = null;
      console.log("LocalDatabaseService: Cleanup completed");
    } catch (error) {
      console.error("LocalDatabaseService: Cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Sync local database from remote - follows the same pattern as pullFreshData in sync-engine.ts
   * Only syncs if local database is empty, tries remote first, falls back to auto-seeding
   */
  async syncLocalDBFromRemote(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    totalSynced?: number;
  }> {
    try {
      console.log("LocalDatabaseService: Starting syncLocalDBFromRemote");

      const userCount = await this.executeRawSQL(
        "SELECT COUNT(*) as count FROM users"
      );
      const subjectCount = await this.executeRawSQL(
        "SELECT COUNT(*) as count FROM subjects"
      );

      const hasUsers = (userCount[0] as CountResult)?.count > 0;
      const hasSubjects = (subjectCount[0] as CountResult)?.count > 0;

      if (hasUsers && hasSubjects) {
        console.log(
          "LocalDatabaseService: Local database already populated, skipping sync"
        );
        return {
          success: false,
          message: "Local database is not empty. Sync skipped.",
          error: "Database already contains data",
          totalSynced: 0,
        };
      }

      let totalSynced = 0;

      let remoteDb: RemoteDatabaseService | null = null;
      let remoteConnected = false;

      try {
        if (process.env.NEON_DATABASE_URL) {
          remoteDb = RemoteDatabaseService.getInstance();
          await remoteDb.initialize(process.env.NEON_DATABASE_URL);
          remoteConnected = await remoteDb.checkConnection();
        }
      } catch (error) {
        console.warn(
          "LocalDatabaseService: Remote database unavailable:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      if (remoteConnected && remoteDb) {
        try {
          console.log(
            "LocalDatabaseService: Remote connected, performing remote data pull"
          );

          const syncData = await remoteDb.pullLatestData();

          console.log(
            `LocalDatabaseService: Retrieved ${syncData.users.length} users, ${syncData.subjects.length} subjects, ${syncData.questions.length} questions from remote`
          );

          // Insert users
          for (const user of syncData.users) {
            try {
              const localUser = {
                id: user.id,
                name: user.name,
                studentCode: user.studentCode,
                passwordHash: user.passwordHash,
                class: user.class,
                gender: user.gender,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                lastSynced: new Date().toISOString(),
                isActive: user.isActive,
                lastLogin: user.lastLogin?.toISOString() || null,
              };

              await this.createUser(localUser);
              totalSynced++;
            } catch (error) {
              console.warn(
                "LocalDatabaseService: Failed to create user:",
                user.studentCode,
                error
              );
            }
          }

          // Insert subjects
          for (const subject of syncData.subjects) {
            try {
              const localSubject = {
                id: subject.id,
                name: subject.name,
                subjectCode: subject.subjectCode,
                description: subject.description,
                class: subject.class,
                totalQuestions: subject.totalQuestions,
                createdAt: subject.createdAt.toISOString(),
                updatedAt: subject.updatedAt.toISOString(),
                isActive: subject.isActive,
                category: subject.category || null,
                academicYear: subject.academicYear || null,
              };

              await this.createSubject(localSubject);
              totalSynced++;
            } catch (error) {
              console.warn(
                "LocalDatabaseService: Failed to create subject:",
                subject.subjectCode,
                error
              );
            }
          }

          // Insert questions
          for (const question of syncData.questions) {
            try {
              const localQuestion = {
                id: question.id,
                subjectId: question.subjectId,
                subjectCode: question.subjectCode,
                text: question.text,
                options:
                  typeof question.options === "string"
                    ? question.options
                    : JSON.stringify(question.options),
                answer: question.answer,
                questionOrder: question.questionOrder,
                createdAt: question.createdAt.toISOString(),
                updatedAt: question.updatedAt.toISOString(),
                explanation: question.explanation,
                isActive: question.isActive,
              };

              await this.createQuestion(localQuestion);
              totalSynced++;
            } catch (error) {
              console.warn(
                "LocalDatabaseService: Failed to create question:",
                question.id,
                error
              );
            }
          }

          console.log(
            `LocalDatabaseService: Successfully synced ${totalSynced} records from remote`
          );

          return {
            success: true,
            message: "Local database synchronized successfully from remote",
            totalSynced,
          };
        } catch (remoteError) {
          console.error(
            "LocalDatabaseService: Remote data pull failed, falling back to local seeding:",
            remoteError
          );
        }
      } else {
        console.log(
          "LocalDatabaseService: Remote database not available, using local seeding"
        );
      }

      console.log(
        "LocalDatabaseService: Performing automatic local database seeding..."
      );

      if (!isElectron()) {
        return {
          success: false,
          error: "Local seeding requires Electron environment",
          totalSynced: 0,
        };
      }

      try {
        const seedResult = await AutoSeedingService.performAutoSeeding();

        if (seedResult.success) {
          console.log(
            `LocalDatabaseService: Successfully seeded ${seedResult.totalRecords} records locally`
          );
          return {
            success: true,
            message:
              "Local database populated using local seeding (offline mode)",
            totalSynced: seedResult.totalRecords,
          };
        } else {
          console.error(
            "LocalDatabaseService: Local seeding failed:",
            seedResult.error
          );
          return {
            success: false,
            error: `Local seeding failed: ${seedResult.error}`,
            totalSynced: 0,
          };
        }
      } catch (seedError) {
        console.error("LocalDatabaseService: Local seeding failed:", seedError);
        return {
          success: false,
          error: `Local seeding failed: ${
            seedError instanceof Error ? seedError.message : "Unknown error"
          }`,
          totalSynced: 0,
        };
      }
    } catch (error) {
      console.error(
        "LocalDatabaseService: syncLocalDBFromRemote failed:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
        totalSynced: 0,
      };
    }
  }
}
