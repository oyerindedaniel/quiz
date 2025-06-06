"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeonManager = void 0;
exports.getNeonConnectionString = getNeonConnectionString;
exports.createNeonManager = createNeonManager;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const remote_schema_js_1 = require("./remote-schema.js");
class NeonManager {
    constructor(connectionString) {
        this.db = null;
        this.pool = null;
        this.connectionString = connectionString;
    }
    static getInstance(connectionString) {
        if (!NeonManager.instance) {
            if (!connectionString) {
                throw new Error("Connection string required for first initialization");
            }
            NeonManager.instance = new NeonManager(connectionString);
        }
        return NeonManager.instance;
    }
    async initialize() {
        if (this.db) {
            return this.db;
        }
        try {
            if (!this.connectionString) {
                throw new Error("Neon connection string not provided");
            }
            console.log("Initializing Neon database connection via TCP...");
            this.pool = new pg_1.Pool({
                connectionString: this.connectionString,
                max: 3,
                min: 1,
                ssl: {
                    rejectUnauthorized: false,
                },
            });
            this.db = (0, node_postgres_1.drizzle)(this.pool, { schema: remote_schema_js_1.remoteSchema });
            await this.testConnection();
            console.log("Neon database connected successfully via TCP with Drizzle ORM");
            return this.db;
        }
        catch (error) {
            console.error("Failed to initialize Neon database:", error);
            throw error;
        }
    }
    async testConnection() {
        if (!this.pool) {
            throw new Error("Connection pool not initialized");
        }
        try {
            const client = await this.pool.connect();
            try {
                await client.query("SELECT 1 as test");
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error("Neon connection test failed:", error);
            throw new Error("Failed to connect to Neon database");
        }
    }
    getDatabase() {
        if (!this.db) {
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.db;
    }
    isConnected() {
        return this.db !== null && this.pool !== null;
    }
    async executeRawSQL(queryText, values = []) {
        if (!this.pool) {
            throw new Error("Connection pool not initialized");
        }
        try {
            const client = await this.pool.connect();
            try {
                const result = await client.query(queryText, values);
                return result.rows;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error("Failed to execute Neon SQL:", queryText, error);
            throw error;
        }
    }
    async getConnectionInfo() {
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
                    connectionString: this.connectionString.replace(/\/\/.*:.*@/, "//***:***@"),
                };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error("Failed to get connection info:", error);
            throw error;
        }
    }
    getPoolStats() {
        if (!this.pool) {
            return { connected: 0 };
        }
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
        };
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this.db = null;
        console.log("Neon database connection pool closed");
    }
}
exports.NeonManager = NeonManager;
NeonManager.instance = null;
function getNeonConnectionString() {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
        throw new Error("NEON_DATABASE_URL environment variable is required. " +
            "Please set it in your .env.local file or environment variables.");
    }
    return connectionString;
}
function createNeonManager() {
    const connectionString = getNeonConnectionString();
    return NeonManager.getInstance(connectionString);
}
