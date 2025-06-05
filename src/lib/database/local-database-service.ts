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

    let dbPath: string;
    if (isElectron()) {
      const userDataPath = await window.electronAPI.app.getPath("userData");
      if (userDataPath) {
        dbPath = `${userDataPath}/quiz_app.db`;
      } else {
        dbPath = "quiz_app.db";
      }
    } else {
      // Development/testing fallback
      dbPath = "./quiz_app.db";
    }

    this.sqliteManager = SQLiteManager.getInstance(dbPath);
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
      })
      .where(eq(localSchema.quizAttempts.id, attemptId))
      .returning();

    console.log({ updatedAttempt });
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
          sql`${localSchema.questions.text} NOT LIKE '[HEADER]%'`
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

    try {
      const result = await db.transaction(async (tx) => {
        const questionsWithTimestamps = questions.map((questionData) => ({
          ...questionData,
          createdAt: now,
          updatedAt: now,
        }));

        await tx.insert(localSchema.questions).values(questionsWithTimestamps);

        return { created: questions.length };
      });

      console.log(`Bulk created ${result.created} questions successfully`);

      return {
        success: true,
        created: result.created,
      };
    } catch (error) {
      console.error("Bulk question creation error:", error);
      return {
        success: false,
        created: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(
    callback: (tx: BetterSQLite3Database<typeof localSchema>) => Promise<T>
  ): Promise<T> {
    const db = this.getDb();
    return await db.transaction(callback);
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

      const user = await db
        .select({ id: localSchema.users.id })
        .from(localSchema.users)
        .where(eq(localSchema.users.studentCode, studentCode))
        .limit(1);

      if (user.length === 0) {
        return { success: false, error: "User not found" };
      }

      const subject = await db
        .select({ id: localSchema.subjects.id })
        .from(localSchema.subjects)
        .where(eq(localSchema.subjects.subjectCode, subjectCode))
        .limit(1);

      if (subject.length === 0) {
        return { success: false, error: "Subject not found" };
      }

      const userId = user[0].id;
      const subjectId = subject[0].id;

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
            ? "No quiz attempts found to delete"
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
}
