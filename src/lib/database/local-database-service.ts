import { eq, and } from "drizzle-orm";
import { createSQLiteManager } from "./sqlite";
import { localSchema } from "./local-schema";
import type {
  User,
  NewUser,
  Subject,
  NewSubject,
  Question,
  NewQuestion,
  QuizAttempt,
  NewQuizAttempt,
} from "./local-schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { isElectron } from "@/lib/utils";

export class LocalDatabaseService {
  private static instance: LocalDatabaseService;
  private db: BetterSQLite3Database<typeof localSchema> | null = null;
  private sqliteManager: ReturnType<typeof createSQLiteManager> | null = null;

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

    this.sqliteManager = createSQLiteManager();
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
  private getSqliteManager(): ReturnType<typeof createSQLiteManager> {
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

    await db
      .update(localSchema.quizAttempts)
      .set({
        answers: JSON.stringify(currentAnswers),
        updatedAt: new Date().toISOString(),
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
