import { eq, and, sql } from "drizzle-orm";
import { NeonManager } from "./neon.js";
import { remoteSchema } from "./remote-schema.js";
import type {
  RemoteUser,
  NewRemoteUser,
  RemoteSubject,
  NewRemoteSubject,
  RemoteQuestion,
  NewRemoteQuestion,
  RemoteQuizAttempt,
  NewRemoteQuizAttempt,
  RemoteAdmin,
} from "./remote-schema.js";
import type { QuizAttempt } from "./local-schema.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  SubjectWithStats,
  UserWithAttempts,
  AdminRole,
  UserSeedData,
} from "../../types/app.js";
import { buildExcludedSetClause } from "../../utils/drizzle.js";

interface ModifiedRecordsResult {
  id: string;
  updatedAt: Date;
  [key: string]: unknown;
}

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

  async findUserByName(name: string): Promise<RemoteUser | null> {
    const db = this.getDb();
    const users = await db
      .select()
      .from(remoteSchema.users)
      .where(
        and(
          eq(remoteSchema.users.name, name),
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

  async createOrUpdateUser(
    userData: Omit<NewRemoteUser, "createdAt" | "updatedAt">
  ): Promise<{ created: boolean; updated: boolean }> {
    const db = this.getDb();
    const now = new Date();

    try {
      await db.insert(remoteSchema.users).values({
        ...userData,
        createdAt: now,
        updatedAt: now,
      });
      return { created: true, updated: false };
    } catch (error) {
      try {
        const existing = await this.findUserByName(userData.name);
        if (existing) {
          await db
            .update(remoteSchema.users)
            .set({
              studentCode: userData.studentCode,
              passwordHash: userData.passwordHash,
              class: userData.class,
              gender: userData.gender,
              updatedAt: now,
            })
            .where(eq(remoteSchema.users.id, existing.id));
          return { created: false, updated: true };
        }
      } catch (updateError) {
        console.error("Failed to update user:", updateError);
      }
      throw error;
    }
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

  async createOrUpdateSubject(
    subjectData: Omit<NewRemoteSubject, "createdAt" | "updatedAt">
  ): Promise<{ created: boolean; updated: boolean }> {
    const db = this.getDb();
    const now = new Date();

    try {
      await db.insert(remoteSchema.subjects).values({
        ...subjectData,
        createdAt: now,
        updatedAt: now,
      });
      return { created: true, updated: false };
    } catch (error) {
      try {
        const existing = await this.findSubjectByCode(subjectData.subjectCode);
        if (existing) {
          await db
            .update(remoteSchema.subjects)
            .set({
              name: subjectData.name,
              description: subjectData.description,
              class: subjectData.class,
              updatedAt: now,
            })
            .where(eq(remoteSchema.subjects.id, existing.id));
          return { created: false, updated: true };
        }
      } catch (updateError) {
        console.error("Failed to update subject:", updateError);
      }
      throw error;
    }
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
    const now = new Date();

    await db.insert(remoteSchema.questions).values({
      ...questionData,
      createdAt: now,
      updatedAt: now,
    });
  }

  async findQuestionByTextAndOrder(
    text: string,
    questionOrder: number,
    subjectId: string
  ): Promise<RemoteQuestion | null> {
    const db = this.getDb();
    const questions = await db
      .select()
      .from(remoteSchema.questions)
      .where(
        and(
          eq(remoteSchema.questions.text, text),
          eq(remoteSchema.questions.questionOrder, questionOrder),
          eq(remoteSchema.questions.subjectId, subjectId),
          eq(remoteSchema.questions.isActive, true)
        )
      )
      .limit(1);

    return questions[0] || null;
  }

  /**
   * Bulk create questions for better performance
   */
  async bulkCreateQuestions(
    questions: Omit<NewRemoteQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    if (questions.length === 0) {
      return { success: true, created: 0 };
    }

    const db = this.getDb();
    const now = new Date();

    try {
      const questionsWithTimestamps = questions.map((question) => ({
        ...question,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(remoteSchema.questions).values(questionsWithTimestamps);

      return {
        success: true,
        created: questions.length,
      };
    } catch (error) {
      console.error("Bulk create questions error:", error);
      return {
        success: false,
        created: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update subject question count
   */
  async updateSubjectQuestionCount(subjectCode: string): Promise<void> {
    const db = this.getDb();

    // Only count answerable questions (not passages and headers)
    const questionCount = await db
      .select()
      .from(remoteSchema.questions)
      .where(
        and(
          eq(remoteSchema.questions.subjectCode, subjectCode),
          eq(remoteSchema.questions.isActive, true),

          sql`${remoteSchema.questions.text} NOT LIKE '[PASSAGE]%'`,
          sql`${remoteSchema.questions.text} NOT LIKE '[HEADER]%'`
        )
      );

    const count = questionCount.length;

    await db
      .update(remoteSchema.subjects)
      .set({
        totalQuestions: count,
        updatedAt: new Date(),
      })
      .where(eq(remoteSchema.subjects.subjectCode, subjectCode));

    console.log(
      `Updated question count for subject ${subjectCode}: ${count} answerable questions`
    );
  }

  /**
   * Bulk upsert questions for idempotent seeding
   * Uses question text and order to detect duplicates
   */
  async bulkUpsertQuestions(
    questions: Omit<NewRemoteQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{
    success: boolean;
    created: number;
    updated: number;
    error?: string;
  }> {
    if (questions.length === 0) {
      return { success: true, created: 0, updated: 0 };
    }

    const db = this.getDb();
    const now = new Date();

    const prepared = questions.map((q) => ({
      ...q,
      createdAt: now,
      updatedAt: now,
    }));

    try {
      const result = await db
        .insert(remoteSchema.questions)
        .values(prepared)
        .onConflictDoUpdate({
          target: [
            remoteSchema.questions.subjectId,
            remoteSchema.questions.questionOrder,
          ],
          set: buildExcludedSetClause(remoteSchema.questions, [
            "text",
            "options",
            "answer",
            "explanation",
            "updatedAt",
          ]),
        })
        .returning({
          createdAt: remoteSchema.questions.createdAt,
          updatedAt: remoteSchema.questions.updatedAt,
        });

      const subjectCode = prepared[0].subjectCode;

      try {
        await this.updateSubjectQuestionCount(subjectCode);
      } catch (error) {
        console.warn(
          `Failed to update question count for subject ${subjectCode}:`,
          error
        );
      }

      let created = 0;
      let updated = 0;

      for (const row of result) {
        if (row.createdAt.getTime() === row.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      }

      return { success: true, created, updated };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to bulk upsert questions:", message);
      return {
        success: false,
        created: 0,
        updated: 0,
        error: message,
      };
    }
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

  /**
   * Sync a quiz attempt from local to remote (used by sync engine)
   */
  async syncQuizAttempt(attempt: QuizAttempt): Promise<void> {
    const db = this.getDb();

    try {
      // Validate required fields before syncing
      if (!attempt.userId || !attempt.subjectId) {
        console.warn(
          `Quiz attempt ${attempt.id} has missing required fields (userId: ${attempt.userId}, subjectId: ${attempt.subjectId}), skipping sync`
        );
        throw new Error(`Invalid quiz attempt: missing userId or subjectId`);
      }

      if (!attempt.totalQuestions || attempt.totalQuestions <= 0) {
        console.warn(
          `Quiz attempt ${attempt.id} has invalid totalQuestions (${attempt.totalQuestions}), skipping sync`
        );
        throw new Error(`Invalid quiz attempt: invalid totalQuestions`);
      }

      const safeDate = (dateString: string | null | undefined): Date | null => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? null : date;
        } catch {
          return null;
        }
      };

      let startedAt = safeDate(attempt.startedAt);

      // Handle invalid or missing startedAt timestamps
      if (!startedAt) {
        console.warn(
          `Quiz attempt ${attempt.id} has invalid startedAt (${attempt.startedAt}), using updatedAt or current time as fallback`
        );

        // Try to use updatedAt as fallback
        startedAt = safeDate(attempt.updatedAt);

        // If updatedAt is also invalid, use current time
        if (!startedAt) {
          startedAt = new Date();
          console.warn(
            `Quiz attempt ${attempt.id} also has invalid updatedAt, using current time`
          );
        }
      }

      const submittedAt = safeDate(attempt.submittedAt);

      await db
        .insert(remoteSchema.quizAttempts)
        .values({
          id: attempt.id,
          userId: attempt.userId,
          subjectId: attempt.subjectId,
          answers: attempt.answers ? JSON.parse(attempt.answers) : null,
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          submitted: attempt.submitted,
          startedAt: startedAt,
          submittedAt: submittedAt,
          sessionDuration: attempt.sessionDuration,
        })
        .onConflictDoUpdate({
          target: remoteSchema.quizAttempts.id,
          set: {
            answers: attempt.answers ? JSON.parse(attempt.answers) : null,
            score: attempt.score,
            submitted: attempt.submitted,
            submittedAt: submittedAt,
            sessionDuration: attempt.sessionDuration,
            updatedAt: new Date(),
          },
        });

      console.log(`RemoteDatabaseService: Synced quiz attempt ${attempt.id}`);
    } catch (error) {
      console.error(
        `RemoteDatabaseService: Failed to sync quiz attempt ${attempt.id}:`,
        error
      );
      throw new Error(
        `Failed to sync quiz attempt: ${(error as Error).message}`
      );
    }
  }

  /**
   * Pull latest data for initial sync (used by sync engine)
   */
  async pullLatestData(): Promise<{
    users: RemoteUser[];
    subjects: RemoteSubject[];
    questions: RemoteQuestion[];
  }> {
    const db = this.getDb();

    try {
      const [users, subjects, questions] = await Promise.all([
        db
          .select()
          .from(remoteSchema.users)
          .where(eq(remoteSchema.users.isActive, true)),
        db
          .select()
          .from(remoteSchema.subjects)
          .where(eq(remoteSchema.subjects.isActive, true)),
        db
          .select()
          .from(remoteSchema.questions)
          .where(eq(remoteSchema.questions.isActive, true)),
      ]);

      console.log(
        `RemoteDatabaseService: Pulled ${users.length} users, ${subjects.length} subjects, ${questions.length} questions`
      );

      return {
        users,
        subjects,
        questions,
      };
    } catch (error) {
      console.error(
        "RemoteDatabaseService: Failed to pull latest data:",
        error
      );
      throw new Error(
        `Failed to pull latest data: ${(error as Error).message}`
      );
    }
  }

  // Sync operations
  async getRecordsModifiedAfter(
    tableName: "users" | "subjects" | "questions" | "quizAttempts",
    timestamp: string
  ): Promise<ModifiedRecordsResult[]> {
    const db = this.getDb();

    switch (tableName) {
      case "users":
        return db
          .select()
          .from(remoteSchema.users)
          .where(eq(remoteSchema.users.updatedAt, new Date(timestamp)))
          .orderBy(remoteSchema.users.updatedAt);

      case "subjects":
        return db
          .select()
          .from(remoteSchema.subjects)
          .where(eq(remoteSchema.subjects.updatedAt, new Date(timestamp)))
          .orderBy(remoteSchema.subjects.updatedAt);

      case "questions":
        return db
          .select()
          .from(remoteSchema.questions)
          .where(eq(remoteSchema.questions.updatedAt, new Date(timestamp)))
          .orderBy(remoteSchema.questions.updatedAt);

      case "quizAttempts":
        return db
          .select()
          .from(remoteSchema.quizAttempts)
          .where(eq(remoteSchema.quizAttempts.updatedAt, new Date(timestamp)))
          .orderBy(remoteSchema.quizAttempts.updatedAt);

      default:
        throw new Error(`Unsupported table for sync: ${tableName}`);
    }
  }

  async getLatestTimestamp(
    tableName: "users" | "subjects" | "questions" | "quizAttempts"
  ): Promise<string | null> {
    const db = this.getDb();

    let result;

    switch (tableName) {
      case "users":
        result = await db
          .select({ updatedAt: remoteSchema.users.updatedAt })
          .from(remoteSchema.users)
          .orderBy(remoteSchema.users.updatedAt)
          .limit(1);
        break;

      case "subjects":
        result = await db
          .select({ updatedAt: remoteSchema.subjects.updatedAt })
          .from(remoteSchema.subjects)
          .orderBy(remoteSchema.subjects.updatedAt)
          .limit(1);
        break;

      case "questions":
        result = await db
          .select({ updatedAt: remoteSchema.questions.updatedAt })
          .from(remoteSchema.questions)
          .orderBy(remoteSchema.questions.updatedAt)
          .limit(1);
        break;

      case "quizAttempts":
        result = await db
          .select({ updatedAt: remoteSchema.quizAttempts.updatedAt })
          .from(remoteSchema.quizAttempts)
          .orderBy(remoteSchema.quizAttempts.updatedAt)
          .limit(1);
        break;

      default:
        throw new Error(`Unsupported table for timestamp: ${tableName}`);
    }

    return result[0]?.updatedAt?.toISOString() || null;
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

      const result = await db
        .update(remoteSchema.users)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .returning({ id: remoteSchema.users.id });

      return {
        success: true,
        updatedCount: result.length,
      };
    } catch (error) {
      console.error(
        "RemoteDatabaseService: Error toggling all users active state:",
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
      const db = this.getDb();

      const result = await db
        .update(remoteSchema.users)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(remoteSchema.users.studentCode, studentCode))
        .returning({ id: remoteSchema.users.id });

      return {
        success: true,
        updated: result.length > 0,
      };
    } catch (error) {
      console.error(
        "RemoteDatabaseService: Error toggling user active state:",
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
      const db = this.getDb();

      // Hash the new PIN
      const bcrypt = await import("bcryptjs");
      const hashedPin = await bcrypt.hash(newPin, 10);

      const result = await db
        .update(remoteSchema.users)
        .set({
          passwordHash: hashedPin,
          updatedAt: new Date(),
        })
        .where(eq(remoteSchema.users.studentCode, studentCode))
        .returning({ id: remoteSchema.users.id });

      return {
        success: true,
        updated: result.length > 0,
      };
    } catch (error) {
      console.error("RemoteDatabaseService: Error changing user PIN:", error);
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

      await db
        .update(remoteSchema.users)
        .set({
          lastLogin: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(remoteSchema.users.studentCode, studentCode));
    } catch (error) {
      console.error(
        "RemoteDatabaseService: Error updating user last login:",
        error
      );
    }
  }

  /**
   * Cleanup database connections
   */
  async cleanup(): Promise<void> {
    try {
      if (this.neonManager) {
        await this.neonManager.close();
      }
      this.db = null;
    } catch (error) {
      console.error("RemoteDatabaseService: Cleanup error:", error);
    }
  }

  // ===== ADMIN OPERATIONS =====

  /**
   * Find admin user by username for authentication
   */
  async findAdminByUsername(username: string): Promise<RemoteAdmin | null> {
    try {
      if (!this.db) {
        throw new Error("Database not initialized");
      }

      const result = await this.db
        .select()
        .from(remoteSchema.admins)
        .where(eq(remoteSchema.admins.username, username))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Find admin by username error:", error);
      throw error;
    }
  }

  /**
   * Find admin user by ID
   */
  async findAdminById(adminId: string): Promise<RemoteAdmin | null> {
    try {
      if (!this.db) {
        throw new Error("Database not initialized");
      }

      const result = await this.db
        .select()
        .from(remoteSchema.admins)
        .where(eq(remoteSchema.admins.id, adminId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Find admin by ID error:", error);
      throw error;
    }
  }

  /**
   * Update admin last login timestamp
   */
  async updateAdminLastLogin(adminId: string): Promise<void> {
    const db = this.getDb();
    const now = new Date();

    await db
      .update(remoteSchema.admins)
      .set({
        lastLogin: now,
        updatedAt: now,
      })
      .where(eq(remoteSchema.admins.id, adminId));
  }

  // Admin Dashboard Methods
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalSubjects: number;
    totalQuestions: number;
    totalAttempts: number;
    onlineUsers: number;
    pendingSyncs: number;
  }> {
    const db = this.getDb();

    const [users, subjects, questions, attempts] = await Promise.all([
      db
        .select()
        .from(remoteSchema.users)
        .where(eq(remoteSchema.users.isActive, true)),
      db
        .select()
        .from(remoteSchema.subjects)
        .where(eq(remoteSchema.subjects.isActive, true)),
      db
        .select()
        .from(remoteSchema.questions)
        .where(eq(remoteSchema.questions.isActive, true)),
      db
        .select()
        .from(remoteSchema.quizAttempts)
        .where(eq(remoteSchema.quizAttempts.submitted, true)),
    ]);

    // For now, we'll return 0 for onlineUsers and pendingSyncs as these would require additional tracking
    return {
      totalUsers: users.length,
      totalSubjects: subjects.length,
      totalQuestions: questions.length,
      totalAttempts: attempts.length,
      onlineUsers: 0,
      pendingSyncs: 0,
    };
  }

  async getAllUsersWithAttempts(): Promise<Array<UserWithAttempts>> {
    const db = this.getDb();

    const usersWithAttempts = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.isActive, true),
      with: {
        quizAttempts: {
          where: (attempts, { eq }) => eq(attempts.submitted, true),
          with: {
            subject: true,
          },
          orderBy: (attempts, { desc }) => desc(attempts.submittedAt),
        },
      },
      orderBy: (users, { asc }) => asc(users.studentCode),
    });

    return usersWithAttempts.map((user) => {
      return {
        id: user.id,
        studentCode: user.studentCode,
        firstName: user.name.split(" ")[0] || user.name,
        lastName: user.name.split(" ").slice(1).join(" ") || "",
        className: user.class,
        gender: user.gender,
        pin: user.passwordHash,
        isActive: user.isActive ?? true,
        lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        quizAttempts: user.quizAttempts.map((attempt) => ({
          id: attempt.id,
          subjectId: attempt.subjectId,
          subjectName: attempt.subject?.name || "Unknown Subject",
          score: attempt.score || 0,
          completedAt: attempt.submittedAt?.toISOString() || "",
          sessionDuration: attempt.sessionDuration || 0,
          totalQuestions: attempt.totalQuestions || 0,
        })),
      };
    });
  }

  async getAllSubjectsWithStats(): Promise<Array<SubjectWithStats>> {
    const db = this.getDb();

    const subjectsWithStats = await db.query.subjects.findMany({
      where: (subjects, { eq }) => eq(subjects.isActive, true),
      with: {
        questions: {
          where: (questions, { eq }) => eq(questions.isActive, true),
        },
        quizAttempts: {
          where: (attempts, { eq }) => eq(attempts.submitted, true),
          columns: {
            id: true,
            score: true,
          },
        },
      },
      orderBy: (subjects, { asc }) => asc(subjects.name),
    });

    return subjectsWithStats.map((subject) => {
      const scores = subject.quizAttempts
        .map((attempt) => attempt.score)
        .filter((score): score is number => score !== null);

      return {
        id: subject.id,
        subjectCode: subject.subjectCode,
        subjectName: subject.name,
        description: subject.description || "",
        createdAt: subject.createdAt.toISOString(),
        updatedAt: subject.updatedAt.toISOString(),
        questionCount: subject.questions.length,
        attemptCount: subject.quizAttempts.length,
        averageScore:
          scores.length > 0
            ? Math.round(
                scores.reduce((sum, score) => sum + score, 0) / scores.length
              )
            : 0,
      };
    });
  }

  async getAllQuestionsWithStats(): Promise<
    Array<{
      id: string;
      subjectId: string;
      subjectName: string;
      questionText: string;
      questionType: string;
      difficulty: string;
      correctAnswer: string;
      createdAt: string;
      updatedAt: string;
      attemptCount: number;
      correctRate: number;
    }>
  > {
    const db = this.getDb();

    const questionsQuery = await db
      .select({
        questionId: remoteSchema.questions.id,
        subjectId: remoteSchema.questions.subjectId,
        subjectName: remoteSchema.subjects.name,
        questionText: remoteSchema.questions.text,
        correctAnswer: remoteSchema.questions.answer,
        createdAt: remoteSchema.questions.createdAt,
        updatedAt: remoteSchema.questions.updatedAt,
        // Note: We'll need to add these fields to the schema or derive them
        // For now, we'll provide default values
      })
      .from(remoteSchema.questions)
      .leftJoin(
        remoteSchema.subjects,
        eq(remoteSchema.questions.subjectId, remoteSchema.subjects.id)
      )
      .where(eq(remoteSchema.questions.isActive, true))
      .orderBy(remoteSchema.questions.createdAt);

    // For now, return basic question data with placeholder stats
    return questionsQuery.map((row) => ({
      id: row.questionId,
      subjectId: row.subjectId,
      subjectName: row.subjectName || "Unknown Subject",
      questionText: row.questionText,
      questionType: "multiple-choice", // Default value
      difficulty: "medium", // Default value
      correctAnswer: row.correctAnswer,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      attemptCount: 0, // Would need to calculate from quiz attempts
      correctRate: 0, // Would need to calculate from quiz attempts
    }));
  }

  async getAnalyticsData(): Promise<{
    quizAttemptsByDay: Array<{ date: string; attempts: number }>;
    scoreDistribution: Array<{ range: string; count: number }>;
    subjectPerformance: Array<{
      subjectName: string;
      averageScore: number;
      totalAttempts: number;
    }>;
    topPerformers: Array<{
      studentName: string;
      studentCode: string;
      averageScore: number;
      totalAttempts: number;
    }>;
  }> {
    const db = this.getDb();

    const attemptsQuery = await db
      .select({
        attemptId: remoteSchema.quizAttempts.id,
        userId: remoteSchema.quizAttempts.userId,
        subjectId: remoteSchema.quizAttempts.subjectId,
        score: remoteSchema.quizAttempts.score,
        submittedAt: remoteSchema.quizAttempts.submittedAt,
        userName: remoteSchema.users.name,
        userCode: remoteSchema.users.studentCode,
        subjectName: remoteSchema.subjects.name,
      })
      .from(remoteSchema.quizAttempts)
      .leftJoin(
        remoteSchema.users,
        eq(remoteSchema.quizAttempts.userId, remoteSchema.users.id)
      )
      .leftJoin(
        remoteSchema.subjects,
        eq(remoteSchema.quizAttempts.subjectId, remoteSchema.subjects.id)
      )
      .where(eq(remoteSchema.quizAttempts.submitted, true))
      .orderBy(remoteSchema.quizAttempts.submittedAt);

    const attemptsByDay = new Map<string, number>();
    const scoreRanges = { "0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    const subjectStats = new Map<string, { scores: number[]; count: number }>();
    const userStats = new Map<
      string,
      { scores: number[]; name: string; code: string }
    >();

    for (const attempt of attemptsQuery) {
      if (attempt.submittedAt && attempt.score !== null) {
        // Group by day
        const date = attempt.submittedAt.toISOString().split("T")[0];
        attemptsByDay.set(date, (attemptsByDay.get(date) || 0) + 1);

        // Score distribution
        const score = attempt.score;
        if (score <= 40) scoreRanges["0-40"]++;
        else if (score <= 60) scoreRanges["41-60"]++;
        else if (score <= 80) scoreRanges["61-80"]++;
        else scoreRanges["81-100"]++;

        // Subject performance
        const subjectName = attempt.subjectName || "Unknown";
        if (!subjectStats.has(subjectName)) {
          subjectStats.set(subjectName, { scores: [], count: 0 });
        }
        const subjectStat = subjectStats.get(subjectName)!;
        subjectStat.scores.push(score);
        subjectStat.count++;

        // User performance
        const userId = attempt.userId;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            scores: [],
            name: attempt.userName || "Unknown",
            code: attempt.userCode || "Unknown",
          });
        }
        userStats.get(userId)!.scores.push(score);
      }
    }

    const quizAttemptsByDay = Array.from(attemptsByDay.entries())
      .map(([date, attempts]) => ({ date, attempts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const scoreDistribution = Object.entries(scoreRanges).map(
      ([range, count]) => ({ range, count })
    );

    const subjectPerformance = Array.from(subjectStats.entries())
      .map(([subjectName, stats]) => ({
        subjectName,
        averageScore: Math.round(
          stats.scores.reduce((sum, score) => sum + score, 0) /
            stats.scores.length
        ),
        totalAttempts: stats.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    const topPerformers = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        studentName: stats.name,
        studentCode: stats.code,
        averageScore: Math.round(
          stats.scores.reduce((sum, score) => sum + score, 0) /
            stats.scores.length
        ),
        totalAttempts: stats.scores.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    return {
      quizAttemptsByDay,
      scoreDistribution,
      subjectPerformance,
      topPerformers,
    };
  }

  /**
   * Create a new admin user
   */
  async createAdmin(adminData: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phoneNumber?: string;
    permissions?: Record<string, boolean>;
  }): Promise<{ success: boolean; error?: string; admin?: RemoteAdmin }> {
    try {
      const db = this.getDb();

      const existingAdmin = await db
        .select()
        .from(remoteSchema.admins)
        .where(eq(remoteSchema.admins.username, adminData.username))
        .limit(1);

      if (existingAdmin.length > 0) {
        return { success: false, error: "Username already exists" };
      }

      const existingEmail = await db
        .select()
        .from(remoteSchema.admins)
        .where(eq(remoteSchema.admins.email, adminData.email))
        .limit(1);

      if (existingEmail.length > 0) {
        return { success: false, error: "Email already exists" };
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(adminData.password, 10);

      const newAdminData = {
        email: adminData.email,
        username: adminData.username,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role as AdminRole,
        status: "ACTIVE" as const,
        phoneNumber: adminData.phoneNumber || null,
        permissions: adminData.permissions || {
          manage_users: adminData.role === "SUPER_ADMIN",
          manage_questions: true,
          manage_subjects: true,
          view_analytics: true,
          system_admin: adminData.role === "SUPER_ADMIN",
          export_data: adminData.role !== "TEACHER",
          import_data: adminData.role !== "TEACHER",
          manage_backups: adminData.role === "SUPER_ADMIN",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdAdmin] = await db
        .insert(remoteSchema.admins)
        .values(newAdminData)
        .returning();

      return { success: true, admin: createdAdmin };
    } catch (error) {
      console.error("Create admin error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create admin",
      };
    }
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
        .select({ id: remoteSchema.users.id })
        .from(remoteSchema.users)
        .where(eq(remoteSchema.users.studentCode, studentCode))
        .limit(1);

      if (user.length === 0) {
        return { success: false, error: "User not found" };
      }

      const subject = await db
        .select({ id: remoteSchema.subjects.id })
        .from(remoteSchema.subjects)
        .where(eq(remoteSchema.subjects.subjectCode, subjectCode))
        .limit(1);

      if (subject.length === 0) {
        return { success: false, error: "Subject not found" };
      }

      const userId = user[0].id;
      const subjectId = subject[0].id;

      const deleteResult = await db
        .delete(remoteSchema.quizAttempts)
        .where(
          and(
            eq(remoteSchema.quizAttempts.userId, userId),
            eq(remoteSchema.quizAttempts.subjectId, subjectId)
          )
        )
        .returning({ id: remoteSchema.quizAttempts.id });

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

  //TODO: Possible circular dependency
  /**
   * Get student credentials
   */
  async getStudentCredentials(): Promise<Array<UserSeedData>> {
    try {
      const { ALL_STUDENTS } = await import("../constants/students.js");

      return ALL_STUDENTS.map((student, index) => {
        const pin = String(100000 + (index + 1)).padStart(6, "1");

        return {
          name: student.name,
          studentCode: student.studentCode,
          pin: pin,
          class: student.class,
          gender: student.gender,
        };
      });
    } catch (error) {
      console.error("Get student credentials error:", error);
      return [];
    }
  }
}
