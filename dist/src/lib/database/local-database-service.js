"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDatabaseService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_js_1 = require("./sqlite.js");
const local_schema_js_1 = require("./local-schema.js");
const lib_js_1 = require("../../utils/lib.js");
class LocalDatabaseService {
    constructor() {
        this.db = null;
        this.sqliteManager = null;
    }
    static getInstance() {
        if (!LocalDatabaseService.instance) {
            LocalDatabaseService.instance = new LocalDatabaseService();
        }
        return LocalDatabaseService.instance;
    }
    /**
     * Initialize the database connection
     */
    async initialize() {
        if (this.db) {
            return;
        }
        let dbPath;
        if ((0, lib_js_1.isElectron)()) {
            const userDataPath = await window.electronAPI.app.getPath("userData");
            if (userDataPath) {
                dbPath = `${userDataPath}/quiz_app.db`;
            }
            else {
                dbPath = "quiz_app.db";
            }
        }
        else {
            // Development/testing fallback
            dbPath = "./quiz_app.db";
        }
        this.sqliteManager = sqlite_js_1.SQLiteManager.getInstance(dbPath);
        this.db = await this.sqliteManager.initialize();
    }
    /**
     * Get the database instance
     */
    getDb() {
        if (!this.db) {
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.db;
    }
    /**
     * Get the SQLite manager for raw SQL operations
     */
    getSqliteManager() {
        if (!this.sqliteManager) {
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.sqliteManager;
    }
    // User operations
    async findUserByStudentCode(studentCode) {
        const db = this.getDb();
        const users = await db
            .select()
            .from(local_schema_js_1.localSchema.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.studentCode, studentCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.isActive, true)))
            .limit(1);
        return users[0] || null;
    }
    async findUserById(userId) {
        const db = this.getDb();
        const users = await db
            .select()
            .from(local_schema_js_1.localSchema.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.id, userId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.isActive, true)))
            .limit(1);
        return users[0] || null;
    }
    async createUser(userData) {
        const db = this.getDb();
        const now = new Date().toISOString();
        await db.insert(local_schema_js_1.localSchema.users).values({
            ...userData,
            createdAt: now,
            updatedAt: now,
        });
    }
    // Subject operations
    async findSubjectByCode(subjectCode) {
        const db = this.getDb();
        const subjects = await db
            .select()
            .from(local_schema_js_1.localSchema.subjects)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.isActive, true)))
            .limit(1);
        return subjects[0] || null;
    }
    async findSubjectById(subjectId) {
        const db = this.getDb();
        const subjects = await db
            .select()
            .from(local_schema_js_1.localSchema.subjects)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.id, subjectId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.isActive, true)))
            .limit(1);
        return subjects[0] || null;
    }
    async createSubject(subjectData) {
        const db = this.getDb();
        const now = new Date().toISOString();
        await db.insert(local_schema_js_1.localSchema.subjects).values({
            ...subjectData,
            createdAt: now,
            updatedAt: now,
        });
    }
    // Quiz attempt operations
    async findIncompleteAttempt(userId, subjectId) {
        const db = this.getDb();
        const attempts = await db
            .select()
            .from(local_schema_js_1.localSchema.quizAttempts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.userId, userId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.subjectId, subjectId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.submitted, false)))
            .limit(1);
        return attempts[0] || null;
    }
    async createQuizAttempt(attemptData) {
        const db = this.getDb();
        const now = new Date().toISOString();
        await db.insert(local_schema_js_1.localSchema.quizAttempts).values({
            ...attemptData,
            startedAt: now,
            updatedAt: now,
        });
        return attemptData.id;
    }
    async getQuizAttempt(attemptId) {
        const db = this.getDb();
        const attempts = await db
            .select()
            .from(local_schema_js_1.localSchema.quizAttempts)
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId))
            .limit(1);
        return attempts[0] || null;
    }
    async updateQuizAnswer(attemptId, questionId, answer) {
        const db = this.getDb();
        const attempts = await db
            .select({ answers: local_schema_js_1.localSchema.quizAttempts.answers })
            .from(local_schema_js_1.localSchema.quizAttempts)
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId))
            .limit(1);
        if (attempts.length === 0) {
            throw new Error("Quiz attempt not found");
        }
        const currentAnswers = attempts[0].answers
            ? JSON.parse(attempts[0].answers)
            : {};
        currentAnswers[questionId] = answer;
        await db
            .update(local_schema_js_1.localSchema.quizAttempts)
            .set({
            answers: JSON.stringify(currentAnswers),
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId));
    }
    async submitQuizAttempt(attemptId, score, sessionDuration) {
        const db = this.getDb();
        await db
            .update(local_schema_js_1.localSchema.quizAttempts)
            .set({
            submitted: true,
            score,
            submittedAt: new Date().toISOString(),
            sessionDuration,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId));
    }
    async updateElapsedTime(attemptId, elapsedTime) {
        const db = this.getDb();
        await db
            .update(local_schema_js_1.localSchema.quizAttempts)
            .set({
            elapsedTime,
            lastActiveAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId));
    }
    // Question operations
    async getQuestionsForSubject(subjectId) {
        const db = this.getDb();
        return db
            .select()
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectId, subjectId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)))
            .orderBy(local_schema_js_1.localSchema.questions.questionOrder);
    }
    async createQuestion(questionData) {
        const db = this.getDb();
        const now = new Date().toISOString();
        await db.insert(local_schema_js_1.localSchema.questions).values({
            ...questionData,
            createdAt: now,
            updatedAt: now,
        });
    }
    /**
     * Bulk create questions
     */
    async bulkCreateQuestions(questions) {
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
                await tx.insert(local_schema_js_1.localSchema.questions).values(questionsWithTimestamps);
                return { created: questions.length };
            });
            console.log(`Bulk created ${result.created} questions successfully`);
            return {
                success: true,
                created: result.created,
            };
        }
        catch (error) {
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
    async transaction(callback) {
        const db = this.getDb();
        return await db.transaction(callback);
    }
    async findQuestionBySubjectCodeAndOrder(subjectCode, questionOrder) {
        const db = this.getDb();
        const questions = await db
            .select()
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.questionOrder, questionOrder), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)))
            .limit(1);
        return questions[0] || null;
    }
    async updateQuestion(questionId, questionData) {
        const db = this.getDb();
        await db
            .update(local_schema_js_1.localSchema.questions)
            .set({
            ...questionData,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.id, questionId));
    }
    /**
     * Delete all questions for a specific subject code
     * Useful for complete subject re-sync
     */
    async deleteQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        const result = await db
            .delete(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode))
            .returning({ id: local_schema_js_1.localSchema.questions.id });
        return result.length;
    }
    /**
     * Get all questions for a subject by subject code
     */
    async getQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        return db
            .select()
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)))
            .orderBy(local_schema_js_1.localSchema.questions.questionOrder);
    }
    /**
     * Count questions for a subject by subject code
     */
    async countQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        const result = await db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)));
        return result[0]?.count || 0;
    }
    /**
     * Update total questions count for a subject
     */
    async updateSubjectQuestionCount(subjectCode) {
        const db = this.getDb();
        const count = await this.countQuestionsBySubjectCode(subjectCode);
        await db
            .update(local_schema_js_1.localSchema.subjects)
            .set({
            totalQuestions: count,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.subjectCode, subjectCode));
    }
    /**
     * Delete quiz attempts for a specific user and subject
     * This allows users to retake tests after admin intervention
     */
    async deleteQuizAttempts(studentCode, subjectCode) {
        try {
            const db = this.getDb();
            const user = await db
                .select({ id: local_schema_js_1.localSchema.users.id })
                .from(local_schema_js_1.localSchema.users)
                .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.studentCode, studentCode))
                .limit(1);
            if (user.length === 0) {
                return { success: false, error: "User not found" };
            }
            const subject = await db
                .select({ id: local_schema_js_1.localSchema.subjects.id })
                .from(local_schema_js_1.localSchema.subjects)
                .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.subjectCode, subjectCode))
                .limit(1);
            if (subject.length === 0) {
                return { success: false, error: "Subject not found" };
            }
            const userId = user[0].id;
            const subjectId = subject[0].id;
            const deleteResult = await db
                .delete(local_schema_js_1.localSchema.quizAttempts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.userId, userId), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.subjectId, subjectId)))
                .returning({ id: local_schema_js_1.localSchema.quizAttempts.id });
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
    async checkIntegrity() {
        if ((0, lib_js_1.isElectron)()) {
            return window.electronAPI.database.checkIntegrity();
        }
        return false;
    }
    // Raw SQL operations (exposed for MainDatabaseService)
    async executeRawSQL(sql, params = []) {
        const sqliteManager = this.getSqliteManager();
        return sqliteManager.executeRawSQL(sql, params);
    }
    async runRawSQL(sql, params = []) {
        const sqliteManager = this.getSqliteManager();
        return sqliteManager.runRawSQL(sql, params);
    }
    async backupDatabase(backupPath) {
        const sqliteManager = this.getSqliteManager();
        return sqliteManager.backup(backupPath);
    }
    async checkDatabaseIntegrity() {
        const sqliteManager = this.getSqliteManager();
        return sqliteManager.checkIntegrity();
    }
    /**
     * Cleanup database connections
     */
    async cleanup() {
        console.log("LocalDatabaseService: Starting cleanup...");
        try {
            if (this.sqliteManager) {
                this.sqliteManager.close();
                this.sqliteManager = null;
                console.log("LocalDatabaseService: SQLite manager closed");
            }
            this.db = null;
            console.log("LocalDatabaseService: Cleanup completed");
        }
        catch (error) {
            console.error("LocalDatabaseService: Cleanup failed:", error);
            throw error;
        }
    }
}
exports.LocalDatabaseService = LocalDatabaseService;
