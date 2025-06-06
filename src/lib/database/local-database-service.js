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
exports.LocalDatabaseService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_js_1 = require("./sqlite.js");
const local_schema_js_1 = require("./local-schema.js");
const lib_js_1 = require("../../utils/lib.js");
const electron_1 = require("electron");
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
    async initialize() {
        if (this.db) {
            return;
        }
        this.sqliteManager = sqlite_js_1.SQLiteManager.getInstance(this.getDbPath());
        this.db = await this.sqliteManager.initialize();
    }
    getDb() {
        if (!this.db) {
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.db;
    }
    getSqliteManager() {
        if (!this.sqliteManager) {
            throw new Error("Database not initialized. Call initialize() first.");
        }
        return this.sqliteManager;
    }
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
        const updatedAttempt = await db
            .update(local_schema_js_1.localSchema.quizAttempts)
            .set({
            answers: JSON.stringify(currentAnswers),
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.quizAttempts.id, attemptId))
            .returning();
        console.log({ updatedAttempt });
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
    async updateSubjectQuestionCount(subjectCode) {
        const db = this.getDb();
        const questionCount = await db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true), (0, drizzle_orm_1.sql) `${local_schema_js_1.localSchema.questions.text} NOT LIKE '[PASSAGE]%'`, (0, drizzle_orm_1.sql) `${local_schema_js_1.localSchema.questions.text} NOT LIKE '[HEADER]%'`));
        const count = questionCount[0]?.count || 0;
        await db
            .update(local_schema_js_1.localSchema.subjects)
            .set({
            totalQuestions: count,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.subjects.subjectCode, subjectCode));
        console.log(`Updated question count for subject ${subjectCode}: ${count} answerable questions`);
    }
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
    async deleteQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        const result = await db
            .delete(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode))
            .returning({ id: local_schema_js_1.localSchema.questions.id });
        return result.length;
    }
    async getQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        return db
            .select()
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)))
            .orderBy(local_schema_js_1.localSchema.questions.questionOrder);
    }
    async countQuestionsBySubjectCode(subjectCode) {
        const db = this.getDb();
        const result = await db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(local_schema_js_1.localSchema.questions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.subjectCode, subjectCode), (0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.questions.isActive, true)));
        return result[0]?.count || 0;
    }
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
    async toggleAllUsersActive(isActive) {
        try {
            const db = this.getDb();
            const now = new Date().toISOString();
            const result = await db
                .update(local_schema_js_1.localSchema.users)
                .set({
                isActive,
                updatedAt: now,
            })
                .returning({ id: local_schema_js_1.localSchema.users.id });
            return {
                success: true,
                updatedCount: result.length,
            };
        }
        catch (error) {
            console.error("Error toggling all users active state:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async toggleUserActive(studentCode, isActive) {
        try {
            const db = this.getDb();
            const now = new Date().toISOString();
            const result = await db
                .update(local_schema_js_1.localSchema.users)
                .set({
                isActive,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.studentCode, studentCode))
                .returning({ id: local_schema_js_1.localSchema.users.id });
            return {
                success: true,
                updated: result.length > 0,
            };
        }
        catch (error) {
            console.error("Error toggling user active state:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async changeUserPin(studentCode, newPin) {
        try {
            const db = this.getDb();
            const now = new Date().toISOString();
            const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
            const hashedPin = await bcrypt.hash(newPin, 10);
            const result = await db
                .update(local_schema_js_1.localSchema.users)
                .set({
                passwordHash: hashedPin,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.studentCode, studentCode))
                .returning({ id: local_schema_js_1.localSchema.users.id });
            return {
                success: true,
                updated: result.length > 0,
            };
        }
        catch (error) {
            console.error("Error changing user PIN:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async updateUserLastLogin(studentCode) {
        try {
            const db = this.getDb();
            const now = new Date().toISOString();
            await db
                .update(local_schema_js_1.localSchema.users)
                .set({
                lastLogin: now,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(local_schema_js_1.localSchema.users.studentCode, studentCode));
        }
        catch (error) {
            console.error("Error updating user last login:", error);
        }
    }
    getDbPath() {
        const userDataPath = electron_1.app.getPath("userData");
        console.log("LocalDatabaseService: User data path:", userDataPath);
        return `${userDataPath}/quiz_app.db`;
    }
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
