"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteDatabaseService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const neon_js_1 = require("./neon.js");
const remote_schema_js_1 = require("./remote-schema.js");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
class RemoteDatabaseService {
    constructor() {
        this.db = null;
        this.neonManager = null;
        // this.initialize(process.env.NEON_DATABASE_URL);
    }
    static getInstance() {
        if (!RemoteDatabaseService.instance) {
            RemoteDatabaseService.instance = new RemoteDatabaseService();
        }
        return RemoteDatabaseService.instance;
    }
    /**
     * Initialize the remote database connection
     */
    async initialize(connectionString) {
        if (this.db) {
            return;
        }
        if (!connectionString && !process.env.NEON_DATABASE_URL) {
            throw new Error("Neon connection string required for remote database");
        }
        this.neonManager = neon_js_1.NeonManager.getInstance(connectionString || process.env.NEON_DATABASE_URL);
        this.db = await this.neonManager.initialize();
    }
    /**
     * Get the database instance
     */
    getDb() {
        if (!this.db) {
            throw new Error("Remote database not initialized. Call initialize() first.");
        }
        return this.db;
    }
    /**
     * Check if database is connected
     */
    isConnected() {
        return this.neonManager?.isConnected() ?? false;
    }
    // User operations (Remote)
    async findUserByStudentCode(studentCode) {
        const db = this.getDb();
        const users = await db
            .select()
            .from(remote_schema_js_1.remoteSchema.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.studentCode, studentCode), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.isActive, true)))
            .limit(1);
        return users[0] || null;
    }
    async createUser(userData) {
        const db = this.getDb();
        await db.insert(remote_schema_js_1.remoteSchema.users).values(userData);
    }
    async updateUser(userId, userData) {
        const db = this.getDb();
        const now = new Date();
        await db
            .update(remote_schema_js_1.remoteSchema.users)
            .set({
            ...userData,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.id, userId));
    }
    async getAllUsers() {
        const db = this.getDb();
        return db
            .select()
            .from(remote_schema_js_1.remoteSchema.users)
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.isActive, true))
            .orderBy(remote_schema_js_1.remoteSchema.users.studentCode);
    }
    // Subject operations (Remote)
    async findSubjectByCode(subjectCode) {
        const db = this.getDb();
        const subjects = await db
            .select()
            .from(remote_schema_js_1.remoteSchema.subjects)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.isActive, true)))
            .limit(1);
        return subjects[0] || null;
    }
    async createSubject(subjectData) {
        const db = this.getDb();
        await db.insert(remote_schema_js_1.remoteSchema.subjects).values(subjectData);
    }
    async updateSubject(subjectId, subjectData) {
        const db = this.getDb();
        const now = new Date();
        await db
            .update(remote_schema_js_1.remoteSchema.subjects)
            .set({
            ...subjectData,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.id, subjectId));
    }
    async getAllSubjects() {
        const db = this.getDb();
        return db
            .select()
            .from(remote_schema_js_1.remoteSchema.subjects)
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.isActive, true))
            .orderBy(remote_schema_js_1.remoteSchema.subjects.name);
    }
    // Question operations (Remote)
    async getQuestionsForSubject(subjectId) {
        const db = this.getDb();
        return db
            .select()
            .from(remote_schema_js_1.remoteSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.subjectId, subjectId), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.isActive, true)))
            .orderBy(remote_schema_js_1.remoteSchema.questions.questionOrder);
    }
    async createQuestion(questionData) {
        const db = this.getDb();
        const now = new Date();
        await db.insert(remote_schema_js_1.remoteSchema.questions).values({
            ...questionData,
            createdAt: now,
            updatedAt: now,
        });
    }
    /**
     * Bulk create questions for better performance
     */
    async bulkCreateQuestions(questions) {
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
            await db.insert(remote_schema_js_1.remoteSchema.questions).values(questionsWithTimestamps);
            return {
                success: true,
                created: questions.length,
            };
        }
        catch (error) {
            console.error("Bulk create questions error:", error);
            return {
                success: false,
                created: 0,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async updateQuestion(questionId, questionData) {
        const db = this.getDb();
        const now = new Date();
        await db
            .update(remote_schema_js_1.remoteSchema.questions)
            .set({
            ...questionData,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.id, questionId));
    }
    async getAllQuestions() {
        const db = this.getDb();
        return db
            .select()
            .from(remote_schema_js_1.remoteSchema.questions)
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.isActive, true))
            .orderBy(remote_schema_js_1.remoteSchema.questions.questionOrder);
    }
    // Quiz attempt operations (Remote)
    async findIncompleteAttempt(userId, subjectId) {
        const db = this.getDb();
        const attempts = await db
            .select()
            .from(remote_schema_js_1.remoteSchema.quizAttempts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.userId, userId), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.subjectId, subjectId), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.submitted, false)))
            .limit(1);
        return attempts[0] || null;
    }
    async createQuizAttempt(attemptData) {
        const db = this.getDb();
        await db.insert(remote_schema_js_1.remoteSchema.quizAttempts).values(attemptData);
        return attemptData.id;
    }
    async getQuizAttempt(attemptId) {
        const db = this.getDb();
        const attempts = await db
            .select()
            .from(remote_schema_js_1.remoteSchema.quizAttempts)
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.id, attemptId))
            .limit(1);
        return attempts[0] || null;
    }
    async updateQuizAnswer(attemptId, questionId, answer) {
        const db = this.getDb();
        const attempts = await db
            .select({ answers: remote_schema_js_1.remoteSchema.quizAttempts.answers })
            .from(remote_schema_js_1.remoteSchema.quizAttempts)
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.id, attemptId))
            .limit(1);
        if (attempts.length === 0) {
            throw new Error("Quiz attempt not found");
        }
        const currentAnswers = attempts[0].answers
            ? attempts[0].answers
            : {};
        currentAnswers[questionId] = answer;
        await db
            .update(remote_schema_js_1.remoteSchema.quizAttempts)
            .set({
            answers: currentAnswers,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.id, attemptId));
    }
    async submitQuizAttempt(attemptId, score, sessionDuration) {
        const db = this.getDb();
        await db
            .update(remote_schema_js_1.remoteSchema.quizAttempts)
            .set({
            submitted: true,
            score,
            submittedAt: new Date(),
            sessionDuration,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.id, attemptId));
    }
    async getAllQuizAttempts() {
        const db = this.getDb();
        return db
            .select()
            .from(remote_schema_js_1.remoteSchema.quizAttempts)
            .orderBy(remote_schema_js_1.remoteSchema.quizAttempts.startedAt);
    }
    /**
     * Sync a quiz attempt from local to remote (used by sync engine)
     */
    async syncQuizAttempt(attempt) {
        const db = this.getDb();
        try {
            await db
                .insert(remote_schema_js_1.remoteSchema.quizAttempts)
                .values({
                id: attempt.id,
                userId: attempt.userId,
                subjectId: attempt.subjectId,
                answers: attempt.answers ? JSON.parse(attempt.answers) : null,
                score: attempt.score,
                totalQuestions: attempt.totalQuestions,
                submitted: attempt.submitted,
                startedAt: new Date(attempt.startedAt),
                submittedAt: attempt.submittedAt
                    ? new Date(attempt.submittedAt)
                    : null,
                sessionDuration: attempt.sessionDuration,
            })
                .onConflictDoUpdate({
                target: remote_schema_js_1.remoteSchema.quizAttempts.id,
                set: {
                    answers: attempt.answers ? JSON.parse(attempt.answers) : null,
                    score: attempt.score,
                    submitted: attempt.submitted,
                    submittedAt: attempt.submittedAt
                        ? new Date(attempt.submittedAt)
                        : null,
                    sessionDuration: attempt.sessionDuration,
                    updatedAt: new Date(),
                },
            });
            console.log(`RemoteDatabaseService: Synced quiz attempt ${attempt.id}`);
        }
        catch (error) {
            console.error(`RemoteDatabaseService: Failed to sync quiz attempt ${attempt.id}:`, error);
            throw new Error(`Failed to sync quiz attempt: ${error.message}`);
        }
    }
    /**
     * Pull latest data for initial sync (used by sync engine)
     */
    async pullLatestData() {
        const db = this.getDb();
        try {
            const [users, subjects, questions] = await Promise.all([
                db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.users)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.isActive, true)),
                db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.subjects)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.isActive, true)),
                db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.questions)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.isActive, true)),
            ]);
            console.log(`RemoteDatabaseService: Pulled ${users.length} users, ${subjects.length} subjects, ${questions.length} questions`);
            return {
                users: users.map((user) => ({
                    ...user,
                    // Convert for local schema compatibility
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                    ...(user.lastLogin && {
                        lastLogin: user.lastLogin.toISOString(),
                    }),
                })),
                subjects: subjects.map((subject) => ({
                    ...subject,
                    createdAt: subject.createdAt.toISOString(),
                    updatedAt: subject.updatedAt.toISOString(),
                })),
                questions: questions.map((question) => ({
                    ...question,
                    // Convert JSONB options to string for local SQLite
                    options: JSON.stringify(question.options),
                    createdAt: question.createdAt.toISOString(),
                    updatedAt: question.updatedAt.toISOString(),
                })),
            };
        }
        catch (error) {
            console.error("RemoteDatabaseService: Failed to pull latest data:", error);
            throw new Error(`Failed to pull latest data: ${error.message}`);
        }
    }
    // Sync operations
    async getRecordsModifiedAfter(tableName, timestamp) {
        const db = this.getDb();
        switch (tableName) {
            case "users":
                return db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.users)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.updatedAt, new Date(timestamp)))
                    .orderBy(remote_schema_js_1.remoteSchema.users.updatedAt);
            case "subjects":
                return db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.subjects)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.updatedAt, new Date(timestamp)))
                    .orderBy(remote_schema_js_1.remoteSchema.subjects.updatedAt);
            case "questions":
                return db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.questions)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.updatedAt, new Date(timestamp)))
                    .orderBy(remote_schema_js_1.remoteSchema.questions.updatedAt);
            case "quizAttempts":
                return db
                    .select()
                    .from(remote_schema_js_1.remoteSchema.quizAttempts)
                    .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.updatedAt, new Date(timestamp)))
                    .orderBy(remote_schema_js_1.remoteSchema.quizAttempts.updatedAt);
            default:
                throw new Error(`Unsupported table for sync: ${tableName}`);
        }
    }
    async getLatestTimestamp(tableName) {
        const db = this.getDb();
        let result;
        switch (tableName) {
            case "users":
                result = await db
                    .select({ updatedAt: remote_schema_js_1.remoteSchema.users.updatedAt })
                    .from(remote_schema_js_1.remoteSchema.users)
                    .orderBy(remote_schema_js_1.remoteSchema.users.updatedAt)
                    .limit(1);
                break;
            case "subjects":
                result = await db
                    .select({ updatedAt: remote_schema_js_1.remoteSchema.subjects.updatedAt })
                    .from(remote_schema_js_1.remoteSchema.subjects)
                    .orderBy(remote_schema_js_1.remoteSchema.subjects.updatedAt)
                    .limit(1);
                break;
            case "questions":
                result = await db
                    .select({ updatedAt: remote_schema_js_1.remoteSchema.questions.updatedAt })
                    .from(remote_schema_js_1.remoteSchema.questions)
                    .orderBy(remote_schema_js_1.remoteSchema.questions.updatedAt)
                    .limit(1);
                break;
            case "quizAttempts":
                result = await db
                    .select({ updatedAt: remote_schema_js_1.remoteSchema.quizAttempts.updatedAt })
                    .from(remote_schema_js_1.remoteSchema.quizAttempts)
                    .orderBy(remote_schema_js_1.remoteSchema.quizAttempts.updatedAt)
                    .limit(1);
                break;
            default:
                throw new Error(`Unsupported table for timestamp: ${tableName}`);
        }
        return result[0]?.updatedAt?.toISOString() || null;
    }
    // Database management
    async checkConnection() {
        try {
            if (!this.neonManager) {
                return false;
            }
            const info = await this.neonManager.getConnectionInfo();
            return info.connected;
        }
        catch (error) {
            console.error("Remote database connection check failed:", error);
            return false;
        }
    }
    async getConnectionInfo() {
        if (!this.neonManager) {
            return { connected: false, error: "Neon manager not initialized" };
        }
        try {
            return await this.neonManager.getConnectionInfo();
        }
        catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async cleanup() {
        if (this.neonManager) {
            await this.neonManager.close();
            this.neonManager = null;
        }
        this.db = null;
    }
    // ===== ADMIN OPERATIONS =====
    /**
     * Find admin user by username for authentication
     */
    async findAdminByUsername(username) {
        try {
            if (!this.db) {
                throw new Error("Database not initialized");
            }
            const result = await this.db
                .select()
                .from(remote_schema_js_1.remoteSchema.admins)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.admins.username, username))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            console.error("Find admin by username error:", error);
            throw error;
        }
    }
    /**
     * Find admin user by ID
     */
    async findAdminById(adminId) {
        try {
            if (!this.db) {
                throw new Error("Database not initialized");
            }
            const result = await this.db
                .select()
                .from(remote_schema_js_1.remoteSchema.admins)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.admins.id, adminId))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            console.error("Find admin by ID error:", error);
            throw error;
        }
    }
    /**
     * Update admin last login timestamp
     */
    async updateAdminLastLogin(adminId) {
        const db = this.getDb();
        const now = new Date();
        await db
            .update(remote_schema_js_1.remoteSchema.admins)
            .set({
            lastLogin: now,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.admins.id, adminId));
    }
    // Admin Dashboard Methods
    async getDashboardStats() {
        const db = this.getDb();
        const [users, subjects, questions, attempts] = await Promise.all([
            db
                .select()
                .from(remote_schema_js_1.remoteSchema.users)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.isActive, true)),
            db
                .select()
                .from(remote_schema_js_1.remoteSchema.subjects)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.isActive, true)),
            db
                .select()
                .from(remote_schema_js_1.remoteSchema.questions)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.isActive, true)),
            db
                .select()
                .from(remote_schema_js_1.remoteSchema.quizAttempts)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.submitted, true)),
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
    async getAllUsersWithAttempts() {
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
            const [firstName, ...lastNameParts] = user.name.split(" ");
            return {
                id: user.id,
                studentCode: user.studentCode,
                firstName: firstName || "",
                lastName: lastNameParts.join(" ") || "",
                className: user.class,
                gender: user.gender,
                pin: "****",
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
    async getAllSubjectsWithStats() {
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
                .filter((score) => score !== null);
            return {
                id: subject.id,
                subjectCode: subject.subjectCode,
                subjectName: subject.name,
                description: subject.description || "",
                createdAt: subject.createdAt.toISOString(),
                updatedAt: subject.updatedAt.toISOString(),
                questionCount: subject.questions.length,
                attemptCount: subject.quizAttempts.length,
                averageScore: scores.length > 0
                    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                    : 0,
            };
        });
    }
    async getAllQuestionsWithStats() {
        const db = this.getDb();
        const questionsQuery = await db
            .select({
            questionId: remote_schema_js_1.remoteSchema.questions.id,
            subjectId: remote_schema_js_1.remoteSchema.questions.subjectId,
            subjectName: remote_schema_js_1.remoteSchema.subjects.name,
            questionText: remote_schema_js_1.remoteSchema.questions.text,
            correctAnswer: remote_schema_js_1.remoteSchema.questions.answer,
            createdAt: remote_schema_js_1.remoteSchema.questions.createdAt,
            updatedAt: remote_schema_js_1.remoteSchema.questions.updatedAt,
            // Note: We'll need to add these fields to the schema or derive them
            // For now, we'll provide default values
        })
            .from(remote_schema_js_1.remoteSchema.questions)
            .leftJoin(remote_schema_js_1.remoteSchema.subjects, (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.subjectId, remote_schema_js_1.remoteSchema.subjects.id))
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.questions.isActive, true))
            .orderBy(remote_schema_js_1.remoteSchema.questions.createdAt);
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
    async getAnalyticsData() {
        const db = this.getDb();
        const attemptsQuery = await db
            .select({
            attemptId: remote_schema_js_1.remoteSchema.quizAttempts.id,
            userId: remote_schema_js_1.remoteSchema.quizAttempts.userId,
            subjectId: remote_schema_js_1.remoteSchema.quizAttempts.subjectId,
            score: remote_schema_js_1.remoteSchema.quizAttempts.score,
            submittedAt: remote_schema_js_1.remoteSchema.quizAttempts.submittedAt,
            userName: remote_schema_js_1.remoteSchema.users.name,
            userCode: remote_schema_js_1.remoteSchema.users.studentCode,
            subjectName: remote_schema_js_1.remoteSchema.subjects.name,
        })
            .from(remote_schema_js_1.remoteSchema.quizAttempts)
            .leftJoin(remote_schema_js_1.remoteSchema.users, (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.userId, remote_schema_js_1.remoteSchema.users.id))
            .leftJoin(remote_schema_js_1.remoteSchema.subjects, (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.subjectId, remote_schema_js_1.remoteSchema.subjects.id))
            .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.submitted, true))
            .orderBy(remote_schema_js_1.remoteSchema.quizAttempts.submittedAt);
        const attemptsByDay = new Map();
        const scoreRanges = { "0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
        const subjectStats = new Map();
        const userStats = new Map();
        for (const attempt of attemptsQuery) {
            if (attempt.submittedAt && attempt.score !== null) {
                // Group by day
                const date = attempt.submittedAt.toISOString().split("T")[0];
                attemptsByDay.set(date, (attemptsByDay.get(date) || 0) + 1);
                // Score distribution
                const score = attempt.score;
                if (score <= 40)
                    scoreRanges["0-40"]++;
                else if (score <= 60)
                    scoreRanges["41-60"]++;
                else if (score <= 80)
                    scoreRanges["61-80"]++;
                else
                    scoreRanges["81-100"]++;
                // Subject performance
                const subjectName = attempt.subjectName || "Unknown";
                if (!subjectStats.has(subjectName)) {
                    subjectStats.set(subjectName, { scores: [], count: 0 });
                }
                const subjectStat = subjectStats.get(subjectName);
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
                userStats.get(userId).scores.push(score);
            }
        }
        const quizAttemptsByDay = Array.from(attemptsByDay.entries())
            .map(([date, attempts]) => ({ date, attempts }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({ range, count }));
        const subjectPerformance = Array.from(subjectStats.entries())
            .map(([subjectName, stats]) => ({
            subjectName,
            averageScore: Math.round(stats.scores.reduce((sum, score) => sum + score, 0) /
                stats.scores.length),
            totalAttempts: stats.count,
        }))
            .sort((a, b) => b.averageScore - a.averageScore);
        const topPerformers = Array.from(userStats.entries())
            .map(([userId, stats]) => ({
            studentName: stats.name,
            studentCode: stats.code,
            averageScore: Math.round(stats.scores.reduce((sum, score) => sum + score, 0) /
                stats.scores.length),
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
    async createAdmin(adminData) {
        try {
            const db = this.getDb();
            const existingAdmin = await db
                .select()
                .from(remote_schema_js_1.remoteSchema.admins)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.admins.username, adminData.username))
                .limit(1);
            if (existingAdmin.length > 0) {
                return { success: false, error: "Username already exists" };
            }
            const existingEmail = await db
                .select()
                .from(remote_schema_js_1.remoteSchema.admins)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.admins.email, adminData.email))
                .limit(1);
            if (existingEmail.length > 0) {
                return { success: false, error: "Email already exists" };
            }
            const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
            const passwordHash = await bcrypt.hash(adminData.password, 10);
            const newAdminData = {
                email: adminData.email,
                username: adminData.username,
                passwordHash,
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                role: adminData.role,
                status: "ACTIVE",
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
                .insert(remote_schema_js_1.remoteSchema.admins)
                .values(newAdminData)
                .returning();
            return { success: true, admin: createdAdmin };
        }
        catch (error) {
            console.error("Create admin error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create admin",
            };
        }
    }
    /**
     * Delete quiz attempts for a specific user and subject
     * This allows users to retake tests after admin intervention
     */
    async deleteQuizAttempts(studentCode, subjectCode) {
        try {
            const db = this.getDb();
            const user = await db
                .select({ id: remote_schema_js_1.remoteSchema.users.id })
                .from(remote_schema_js_1.remoteSchema.users)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.users.studentCode, studentCode))
                .limit(1);
            if (user.length === 0) {
                return { success: false, error: "User not found" };
            }
            const subject = await db
                .select({ id: remote_schema_js_1.remoteSchema.subjects.id })
                .from(remote_schema_js_1.remoteSchema.subjects)
                .where((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.subjects.subjectCode, subjectCode))
                .limit(1);
            if (subject.length === 0) {
                return { success: false, error: "Subject not found" };
            }
            const userId = user[0].id;
            const subjectId = subject[0].id;
            const deleteResult = await db
                .delete(remote_schema_js_1.remoteSchema.quizAttempts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.userId, userId), (0, drizzle_orm_1.eq)(remote_schema_js_1.remoteSchema.quizAttempts.subjectId, subjectId)))
                .returning({ id: remote_schema_js_1.remoteSchema.quizAttempts.id });
            return {
                success: true,
                deletedCount: deleteResult.length,
                error: deleteResult.length === 0
                    ? "No quiz attempts found to delete"
                    : undefined,
            };
        }
        catch (error) {
            console.error("Delete quiz attempts error:", error);
            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Failed to delete quiz attempts",
            };
        }
    }
}
exports.RemoteDatabaseService = RemoteDatabaseService;
