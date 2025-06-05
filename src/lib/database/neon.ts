import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { remoteSchema } from "./remote-schema.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export class NeonManager {
  private db: NodePgDatabase<typeof remoteSchema> | null = null;
  private pool: Pool | null = null;
  private connectionString: string;
  private static instance: NeonManager | null = null;

  private constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  public static getInstance(connectionString?: string): NeonManager {
    if (!NeonManager.instance) {
      if (!connectionString) {
        throw new Error("Connection string required for first initialization");
      }
      NeonManager.instance = new NeonManager(connectionString);
    }
    return NeonManager.instance;
  }

  /**
   * Initialize NeonDB connection using TCP
   */
  public async initialize(): Promise<NodePgDatabase<typeof remoteSchema>> {
    if (this.db) {
      return this.db;
    }

    try {
      if (!this.connectionString) {
        throw new Error("Neon connection string not provided");
      }

      console.log("Initializing Neon database connection via TCP...");

      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 3,
        min: 1,
        // idleTimeoutMillis: 10000,
        // connectionTimeoutMillis: 5000,
        ssl: {
          rejectUnauthorized: false,
        },
      });

      this.db = drizzle(this.pool, { schema: remoteSchema });

      await this.testConnection();

      console.log(
        "Neon database connected successfully via TCP with Drizzle ORM"
      );
      return this.db;
    } catch (error) {
      console.error("Failed to initialize Neon database:", error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error("Connection pool not initialized");
    }

    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1 as test");
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Neon connection test failed:", error);
      throw new Error("Failed to connect to Neon database");
    }
  }

  /**
   * Get database instance (use this for query builder operations)
   */
  public getDatabase(): NodePgDatabase<typeof remoteSchema> {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.db !== null && this.pool !== null;
  }

  /**
   * Execute raw SQL query (only use when query builder isn't sufficient)
   */
  public async executeRawSQL(
    queryText: string,
    values: unknown[] = []
  ): Promise<Record<string, unknown>[]> {
    if (!this.pool) {
      throw new Error("Connection pool not initialized");
    }

    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(queryText, values);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Failed to execute Neon SQL:", queryText, error);
      throw error;
    }
  }

  /**
   * Get connection status and basic info
   */
  public async getConnectionInfo(): Promise<Record<string, unknown>> {
    if (!this.pool) {
      throw new Error("Connection pool not initialized");
    }

    try {
      const client = await this.pool.connect();
      try {
        const versionResult = await client.query("SELECT version()");
        const timeResult = await client.query("SELECT NOW()");

        return {
          connected: true,
          version: versionResult.rows[0],
          serverTime: timeResult.rows[0],
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount,
          connectionString: this.connectionString.replace(
            /\/\/.*:.*@/,
            "//***:***@"
          ), // Hide credentials
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Failed to get connection info:", error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  public getPoolStats(): Record<string, number> {
    if (!this.pool) {
      return { connected: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close database connection and pool
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.db = null;
    console.log("Neon database connection pool closed");
  }
}

// Helper function to get Neon connection string from environment
export function getNeonConnectionString(): string {
  const connectionString = process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "NEON_DATABASE_URL environment variable is required. " +
        "Please set it in your .env.local file or environment variables."
    );
  }

  return connectionString;
}

export function createNeonManager(): NeonManager {
  const connectionString = getNeonConnectionString();
  return NeonManager.getInstance(connectionString);
}
