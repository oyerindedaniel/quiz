import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { localSchema } from "./local-schema.js";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export class SQLiteManager {
  private static instance: SQLiteManager | null = null;
  private db: BetterSQLite3Database<typeof localSchema> | null = null;
  private sqlite: Database.Database | null = null;
  private dbPath: string;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(dbPath?: string): SQLiteManager {
    if (!SQLiteManager.instance) {
      if (!dbPath) {
        throw new Error("Database path required for first initialization");
      }
      SQLiteManager.instance = new SQLiteManager(dbPath);
    }
    return SQLiteManager.instance;
  }

  /**
   * Initialize SQLite database with optimized settings
   */
  public async initialize(): Promise<
    BetterSQLite3Database<typeof localSchema>
  > {
    if (this.db) {
      return this.db;
    }

    try {
      console.log(`Initializing SQLite database at: ${this.dbPath}`);

      this.sqlite = new Database(this.dbPath);

      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.pragma("synchronous = NORMAL");
      this.sqlite.pragma("cache_size = 1000");
      this.sqlite.pragma("temp_store = MEMORY");

      this.db = drizzle(this.sqlite, { schema: localSchema });

      await this.createTables();

      console.log("SQLite database initialized successfully with Drizzle ORM");
      return this.db;
    } catch (error) {
      console.error("Failed to initialize SQLite database:", error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): BetterSQLite3Database<typeof localSchema> {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.db !== null && this.sqlite !== null;
  }

  /**
   * Create tables with proper indexes
   */
  private async createTables(): Promise<void> {
    if (!this.sqlite) {
      throw new Error("SQLite instance not available");
    }

    this.sqlite.pragma("foreign_keys = ON");

    const createTableQueries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        student_code TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        class TEXT NOT NULL CHECK (class IN ('SS2', 'JSS3', 'BASIC5')),
        gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_synced TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT
      )`,

      // Subjects table
      `CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
        subject_code TEXT UNIQUE NOT NULL,
        description TEXT,
        class TEXT NOT NULL CHECK (class IN ('SS2', 'JSS3', 'BASIC5')),
        total_questions INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )`,

      // Questions table
      `CREATE TABLE IF NOT EXISTS questions (
         id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  explanation TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )`,

      // Quiz attempts table
      `CREATE TABLE IF NOT EXISTS quiz_attempts (
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
  elapsed_time INTEGER DEFAULT 0,
  last_active_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )`,

      // Sync log table
      `CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
          table_name TEXT NOT NULL,
         record_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  attempted_at TEXT NOT NULL,
  completed_at TEXT
      )`,

      // Sync timestamps table
      `CREATE TABLE IF NOT EXISTS sync_timestamps (
       table_name TEXT PRIMARY KEY,
  last_pull_sync TEXT,
  last_push_sync TEXT,
  last_full_sync TEXT
      )`,
    ];

    const createIndexQueries = [
      "CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code)",
      "CREATE INDEX IF NOT EXISTS idx_users_class ON users(class)",
      "CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON subjects(subject_code)",
      "CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class)",
      "CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id)",
      "CREATE INDEX IF NOT EXISTS idx_questions_subject_code ON questions(subject_code)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON quiz_attempts(subject_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted ON quiz_attempts(submitted)",
      "CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status)",
      "CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON sync_log(table_name)",
    ];

    try {
      for (const query of createTableQueries) {
        this.sqlite.exec(query);
      }

      for (const query of createIndexQueries) {
        this.sqlite.exec(query);
      }

      console.log("All tables and indexes created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   */
  public executeRawSQL(queryText: string, params: unknown[] = []): unknown[] {
    if (!this.sqlite) {
      throw new Error("SQLite instance not available");
    }

    try {
      const stmt = this.sqlite.prepare(queryText);
      return stmt.all(...params);
    } catch (error) {
      console.error("Failed to execute SQLite query:", queryText, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL statement (INSERT, UPDATE, DELETE)
   */
  public runRawSQL(
    queryText: string,
    params: unknown[] = []
  ): Database.RunResult {
    if (!this.sqlite) {
      throw new Error("SQLite instance not available");
    }

    try {
      const stmt = this.sqlite.prepare(queryText);
      return stmt.run(...params);
    } catch (error) {
      console.error("Failed to run SQLite statement:", queryText, error);
      throw error;
    }
  }

  /**
   * Check database integrity
   */
  public checkIntegrity(): boolean {
    if (!this.sqlite) {
      return false;
    }

    try {
      const result = this.sqlite.pragma("integrity_check") as Array<{
        integrity_check: string;
      }>;
      return result[0]?.integrity_check === "ok";
    } catch (error) {
      console.error("Integrity check failed:", error);
      return false;
    }
  }

  /**
   * Create database backup
   */
  public async backup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.sqlite) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      await this.sqlite.backup(backupPath);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Backup failed:", error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Force WAL checkpoint
   */
  public checkpoint(): void {
    if (!this.sqlite) {
      throw new Error("SQLite instance not available");
    }

    try {
      this.sqlite.pragma("wal_checkpoint(TRUNCATE)");
      console.log("WAL checkpoint completed");
    } catch (error) {
      console.error("WAL checkpoint failed:", error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): Record<string, unknown> {
    if (!this.sqlite) {
      return { connected: false };
    }

    try {
      return {
        connected: true,
        journalMode: this.sqlite.pragma("journal_mode", { simple: true }),
        foreignKeys: this.sqlite.pragma("foreign_keys", { simple: true }),
        synchronous: this.sqlite.pragma("synchronous", { simple: true }),
        cacheSize: this.sqlite.pragma("cache_size", { simple: true }),
        walCheckpoint: this.sqlite.pragma("wal_checkpoint", { simple: true }),
      };
    } catch (error) {
      console.error("Failed to get database stats:", error);
      return { connected: false, error: error };
    }
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
    }
    this.db = null;
    console.log("SQLite database connection closed");
  }
}
