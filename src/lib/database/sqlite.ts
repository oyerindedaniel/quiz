import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "path";
import os from "os";

export class SQLiteManager {
  private db: BetterSQLite3Database | null = null;
  private sqlite: Database.Database | null = null;
  private static instance: SQLiteManager | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SQLiteManager {
    if (!SQLiteManager.instance) {
      SQLiteManager.instance = new SQLiteManager();
    }
    return SQLiteManager.instance;
  }

  /**
   * Get database path based on environment
   */
  private async getDatabasePath(): Promise<string> {
    if (typeof window !== "undefined") {
      throw new Error("Database should only be accessed from main process");
    }

    const isDev = process.env.NODE_ENV === "development";

    let userDataPath: string;
    try {
      const { app } = await import("electron");
      userDataPath = app.getPath("userData");
    } catch {
      userDataPath = path.join(os.homedir(), ".quiz-app");
    }

    return path.join(userDataPath, isDev ? "quiz-app-dev.db" : "quiz-app.db");
  }

  /**
   * Initialize SQLite database connection
   */
  public async initialize(): Promise<BetterSQLite3Database> {
    if (this.db) {
      return this.db;
    }

    try {
      const dbPath = await this.getDatabasePath();
      console.log("Initializing database at:", dbPath);

      this.sqlite = new Database(dbPath);

      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.pragma("synchronous = NORMAL");
      this.sqlite.pragma("cache_size = 1000");
      this.sqlite.pragma("temp_store = MEMORY");

      this.db = drizzle(this.sqlite);

      await this.createTables();

      console.log("Database initialized successfully");
      return this.db;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Create tables using raw SQL for initial setup
   */
  private async createTables(): Promise<void> {
    if (!this.sqlite) {
      throw new Error("SQLite instance not initialized");
    }

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        student_code TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        class TEXT NOT NULL,
        gender TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_synced TEXT,
        is_active INTEGER DEFAULT 1
      )
    `;

    const createSubjectsTable = `
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject_code TEXT UNIQUE NOT NULL,
        description TEXT,
        class TEXT NOT NULL,
        total_questions INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )
    `;

    const createQuestionsTable = `
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        text TEXT NOT NULL,
        options TEXT NOT NULL,
        answer TEXT NOT NULL,
        difficulty_level INTEGER DEFAULT 1,
        question_order INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `;

    const createQuizAttemptsTable = `
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        answers TEXT,
        score INTEGER,
        total_questions INTEGER NOT NULL,
        submitted INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        started_at TEXT NOT NULL,
        submitted_at TEXT,
        updated_at TEXT NOT NULL,
        sync_attempted_at TEXT,
        sync_error TEXT,
        session_duration INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `;

    const createSyncLogTable = `
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        attempted_at TEXT NOT NULL,
        completed_at TEXT
      )
    `;

    const createIndexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code)",
      "CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON subjects(subject_code)",
      "CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON quiz_attempts(subject_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_synced ON quiz_attempts(synced)",
      "CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status)",
      "CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id)",
    ];

    try {
      this.sqlite.exec(createUsersTable);
      this.sqlite.exec(createSubjectsTable);
      this.sqlite.exec(createQuestionsTable);
      this.sqlite.exec(createQuizAttemptsTable);
      this.sqlite.exec(createSyncLogTable);

      createIndexes.forEach((indexSql) => {
        this.sqlite!.exec(indexSql);
      });

      console.log("Database tables created successfully");
    } catch (error) {
      console.error("Failed to create tables:", error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): BetterSQLite3Database {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
      console.log("Database connection closed");
    }
  }

  /**
   * Execute raw SQL query
   */
  public executeRawSQL(sql: string, params: unknown[] = []): unknown[] {
    if (!this.sqlite) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.sqlite.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error("Failed to execute SQL:", sql, error);
      throw error;
    }
  }

  /**
   * Run raw SQL query (for INSERT, UPDATE, DELETE)
   */
  public runRawSQL(sql: string, params: unknown[] = []): Database.RunResult {
    if (!this.sqlite) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.sqlite.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      console.error("Failed to run SQL:", sql, error);
      throw error;
    }
  }

  /**
   * Check database integrity
   */
  public checkIntegrity(): boolean {
    if (!this.sqlite) {
      throw new Error("Database not initialized");
    }

    try {
      const result = this.sqlite.pragma("integrity_check");
      return (
        Array.isArray(result) &&
        result[0] &&
        (result[0] as Record<string, string>)["integrity_check"] === "ok"
      );
    } catch (error) {
      console.error("Database integrity check failed:", error);
      return false;
    }
  }

  /**
   * Backup database
   */
  public backup(backupPath: string): void {
    if (!this.sqlite) {
      throw new Error("Database not initialized");
    }

    try {
      this.sqlite.backup(backupPath);
      console.log("Database backed up to:", backupPath);
    } catch (error) {
      console.error("Failed to backup database:", error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): Record<string, number> {
    if (!this.sqlite) {
      throw new Error("Database not initialized");
    }

    try {
      const pageCount = this.sqlite.pragma("page_count", {
        simple: true,
      }) as number;
      const pageSize = this.sqlite.pragma("page_size", {
        simple: true,
      }) as number;
      const freelistCount = this.sqlite.pragma("freelist_count", {
        simple: true,
      }) as number;

      return {
        totalPages: pageCount,
        pageSize,
        freePages: freelistCount,
        totalSize: pageCount * pageSize,
        freeSize: freelistCount * pageSize,
      };
    } catch (error) {
      console.error("Failed to get database stats:", error);
      throw error;
    }
  }
}

export const sqliteManager = SQLiteManager.getInstance();
