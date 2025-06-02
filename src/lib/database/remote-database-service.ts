import { eq, and } from "drizzle-orm";
import { NeonManager } from "./neon";
import { remoteSchema } from "./remote-schema";
import type {
  RemoteUser,
  NewRemoteUser,
  RemoteSubject,
  NewRemoteSubject,
  RemoteQuestion,
  NewRemoteQuestion,
  RemoteQuizAttempt,
  NewRemoteQuizAttempt,
} from "./remote-schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export class RemoteDatabaseService {
  private static instance: RemoteDatabaseService;
  private db: NodePgDatabase<typeof remoteSchema> | null = null;
  private neonManager: NeonManager | null = null;

  private constructor() {}

  public static getInstance(): RemoteDatabaseService {
    if (!RemoteDatabaseService.instance) {
      RemoteDatabaseService.instance = new RemoteDatabaseService();
    }
    return RemoteDatabaseService.instance;
  }

  /**
   * Initialize the remote database connection
   */
  public async initialize(connectionString?: string): Promise<void> {
    if (this.db) {
      return;
    }

    if (!connectionString && !process.env.NEON_DATABASE_URL) {
      throw new Error("Neon connection string required for remote database");
    }

    this.neonManager = NeonManager.getInstance(
      connectionString || process.env.NEON_DATABASE_URL!
    );
    this.db = await this.neonManager.initialize();
  }

  /**
   * Get the database instance
   */
  private getDb(): NodePgDatabase<typeof remoteSchema> {
    if (!this.db) {
      throw new Error(
        "Remote database not initialized. Call initialize() first."
      );
    }
    return this.db;
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.neonManager?.isConnected() ?? false;
  }

  // User operations (Remote)
  async findUserByStudentCode(studentCode: string): Promise<RemoteUser | null> {
    const db = this.getDb();
    const users = await db
      .select()
      .from(remoteSchema.users)
      .where(
        and(
          eq(remoteSchema.users.studentCode, studentCode),
          eq(remoteSchema.users.isActive, true)
        )
      )
      .limit(1);

    return users[0] || null;
  }

  async createUser(
    userData: Omit<NewRemoteUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();

    await db.insert(remoteSchema.users).values(userData);
  }

  async updateUser(
    userId: string,
    userData: Partial<Omit<NewRemoteUser, "id" | "createdAt">>
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date();

    await db
      .update(remoteSchema.users)
      .set({
        ...userData,
        updatedAt: now,
      })
      .where(eq(remoteSchema.users.id, userId));
  }

  async getAllUsers(): Promise<RemoteUser[]> {
    const db = this.getDb();
    return db
      .select()
      .from(remoteSchema.users)
      .where(eq(remoteSchema.users.isActive, true))
      .orderBy(remoteSchema.users.studentCode);
  }

  // Subject operations (Remote)
  async findSubjectByCode(subjectCode: string): Promise<RemoteSubject | null> {
    const db = this.getDb();
    const subjects = await db
      .select()
      .from(remoteSchema.subjects)
      .where(
        and(
          eq(remoteSchema.subjects.subjectCode, subjectCode),
          eq(remoteSchema.subjects.isActive, true)
        )
      )
      .limit(1);

    return subjects[0] || null;
  }

  async createSubject(
    subjectData: Omit<NewRemoteSubject, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();

    await db.insert(remoteSchema.subjects).values(subjectData);
  }

  async updateSubject(
    subjectId: string,
    subjectData: Partial<Omit<NewRemoteSubject, "id" | "createdAt">>
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date();

    await db
      .update(remoteSchema.subjects)
      .set({
        ...subjectData,
        updatedAt: now,
      })
      .where(eq(remoteSchema.subjects.id, subjectId));
  }

  async getAllSubjects(): Promise<RemoteSubject[]> {
    const db = this.getDb();
    return db
      .select()
      .from(remoteSchema.subjects)
      .where(eq(remoteSchema.subjects.isActive, true))
      .orderBy(remoteSchema.subjects.name);
  }

  // Question operations (Remote)
  async getQuestionsForSubject(subjectId: string): Promise<RemoteQuestion[]> {
    const db = this.getDb();
    return db
      .select()
      .from(remoteSchema.questions)
      .where(
        and(
          eq(remoteSchema.questions.subjectId, subjectId),
          eq(remoteSchema.questions.isActive, true)
        )
      )
      .orderBy(remoteSchema.questions.questionOrder);
  }

  async createQuestion(
    questionData: Omit<NewRemoteQuestion, "createdAt" | "updatedAt">
  ): Promise<void> {
    const db = this.getDb();

    await db.insert(remoteSchema.questions).values(questionData);
  }

  async updateQuestion(
    questionId: string,
    questionData: Partial<Omit<NewRemoteQuestion, "id" | "createdAt">>
  ): Promise<void> {
    const db = this.getDb();
    const now = new Date();

    await db
      .update(remoteSchema.questions)
      .set({
        ...questionData,
        updatedAt: now,
      })
      .where(eq(remoteSchema.questions.id, questionId));
  }

  async getAllQuestions(): Promise<RemoteQuestion[]> {
    const db = this.getDb();
    return db
      .select()
      .from(remoteSchema.questions)
      .where(eq(remoteSchema.questions.isActive, true))
      .orderBy(remoteSchema.questions.questionOrder);
  }

  // Quiz attempt operations (Remote)
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<RemoteQuizAttempt | null> {
    const db = this.getDb();
    const attempts = await db
      .select()
      .from(remoteSchema.quizAttempts)
      .where(
        and(
          eq(remoteSchema.quizAttempts.userId, userId),
          eq(remoteSchema.quizAttempts.subjectId, subjectId),
          eq(remoteSchema.quizAttempts.submitted, false)
        )
      )
      .limit(1);

    return attempts[0] || null;
  }

  async createQuizAttempt(
    attemptData: Omit<NewRemoteQuizAttempt, "startedAt" | "updatedAt">
  ): Promise<string> {
    const db = this.getDb();

    await db.insert(remoteSchema.quizAttempts).values(attemptData);

    return attemptData.id!;
  }

  async getQuizAttempt(attemptId: string): Promise<RemoteQuizAttempt | null> {
    const db = this.getDb();
    const attempts = await db
      .select()
      .from(remoteSchema.quizAttempts)
      .where(eq(remoteSchema.quizAttempts.id, attemptId))
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
      .select({ answers: remoteSchema.quizAttempts.answers })
      .from(remoteSchema.quizAttempts)
      .where(eq(remoteSchema.quizAttempts.id, attemptId))
      .limit(1);

    if (attempts.length === 0) {
      throw new Error("Quiz attempt not found");
    }

    const currentAnswers = attempts[0].answers
      ? (attempts[0].answers as Record<string, string>)
      : {};

    currentAnswers[questionId] = answer;

    await db
      .update(remoteSchema.quizAttempts)
      .set({
        answers: currentAnswers,
        updatedAt: new Date(),
      })
      .where(eq(remoteSchema.quizAttempts.id, attemptId));
  }

  async submitQuizAttempt(
    attemptId: string,
    score: number,
    sessionDuration: number
  ): Promise<void> {
    const db = this.getDb();

    await db
      .update(remoteSchema.quizAttempts)
      .set({
        submitted: true,
        score,
        submittedAt: new Date(),
        sessionDuration,
        updatedAt: new Date(),
      })
      .where(eq(remoteSchema.quizAttempts.id, attemptId));
  }

  async getAllQuizAttempts(): Promise<RemoteQuizAttempt[]> {
    const db = this.getDb();
    return db
      .select()
      .from(remoteSchema.quizAttempts)
      .orderBy(remoteSchema.quizAttempts.startedAt);
  }

  // Sync operations
  async getRecordsModifiedAfter(
    tableName: keyof typeof remoteSchema,
    timestamp: string
  ): Promise<any[]> {
    const db = this.getDb();
    const table = remoteSchema[tableName];

    return db
      .select()
      .from(table)
      .where(eq((table as any).updatedAt, timestamp))
      .orderBy((table as any).updatedAt);
  }

  async getLatestTimestamp(
    tableName: keyof typeof remoteSchema
  ): Promise<string | null> {
    const db = this.getDb();
    const table = remoteSchema[tableName];

    const result = await db
      .select({ updatedAt: (table as any).updatedAt })
      .from(table)
      .orderBy((table as any).updatedAt)
      .limit(1);

    return result[0]?.updatedAt || null;
  }

  // Database management
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.neonManager) {
        return false;
      }

      const info = await this.neonManager.getConnectionInfo();
      return info.connected as boolean;
    } catch (error) {
      console.error("Remote database connection check failed:", error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<Record<string, unknown>> {
    if (!this.neonManager) {
      return { connected: false, error: "Neon manager not initialized" };
    }

    try {
      return await this.neonManager.getConnectionInfo();
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.neonManager) {
      await this.neonManager.close();
      this.neonManager = null;
    }
    this.db = null;
  }
}
