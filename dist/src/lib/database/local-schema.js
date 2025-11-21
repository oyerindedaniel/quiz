"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localSchema = exports.syncTimestampsTable = exports.syncLogTable = exports.quizAttemptsTable = exports.questionsTable = exports.subjectsTable = exports.usersTable = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const class_enum_js_1 = require("../constants/class-enum.js");
// SQLite Schema (Local Database)
exports.usersTable = (0, sqlite_core_1.sqliteTable)("users", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    studentCode: (0, sqlite_core_1.text)("student_code").unique().notNull(),
    passwordHash: (0, sqlite_core_1.text)("password_hash").notNull(),
    class: (0, sqlite_core_1.text)("class", {
        enum: class_enum_js_1.CLASS_VALUES,
    }).notNull(),
    gender: (0, sqlite_core_1.text)("gender", { enum: ["MALE", "FEMALE"] }).notNull(),
    createdAt: (0, sqlite_core_1.text)("created_at").notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").notNull(),
    lastSynced: (0, sqlite_core_1.text)("last_synced"),
    isActive: (0, sqlite_core_1.integer)("is_active", { mode: "boolean" }).default(true),
    lastLogin: (0, sqlite_core_1.text)("last_login"),
});
exports.subjectsTable = (0, sqlite_core_1.sqliteTable)("subjects", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    subjectCode: (0, sqlite_core_1.text)("subject_code").unique().notNull(),
    description: (0, sqlite_core_1.text)("description"),
    class: (0, sqlite_core_1.text)("class", {
        enum: class_enum_js_1.CLASS_VALUES,
    }).notNull(),
    totalQuestions: (0, sqlite_core_1.integer)("total_questions").default(0),
    createdAt: (0, sqlite_core_1.text)("created_at").notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").notNull(),
    isActive: (0, sqlite_core_1.integer)("is_active", { mode: "boolean" }).default(true),
    category: (0, sqlite_core_1.text)("category"),
    academicYear: (0, sqlite_core_1.text)("academic_year"),
});
exports.questionsTable = (0, sqlite_core_1.sqliteTable)("questions", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    subjectId: (0, sqlite_core_1.text)("subject_id")
        .notNull()
        .references(() => exports.subjectsTable.id, { onDelete: "cascade" }),
    subjectCode: (0, sqlite_core_1.text)("subject_code").notNull(), // For sync identification
    text: (0, sqlite_core_1.text)("text").notNull(),
    options: (0, sqlite_core_1.text)("options").notNull(), // JSON string
    answer: (0, sqlite_core_1.text)("answer").notNull(),
    questionOrder: (0, sqlite_core_1.integer)("question_order").notNull(),
    createdAt: (0, sqlite_core_1.text)("created_at").notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").notNull(),
    explanation: (0, sqlite_core_1.text)("explanation"),
    isActive: (0, sqlite_core_1.integer)("is_active", { mode: "boolean" }).default(true),
});
exports.quizAttemptsTable = (0, sqlite_core_1.sqliteTable)("quiz_attempts", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    userId: (0, sqlite_core_1.text)("user_id")
        .notNull()
        .references(() => exports.usersTable.id, { onDelete: "cascade" }),
    subjectId: (0, sqlite_core_1.text)("subject_id")
        .notNull()
        .references(() => exports.subjectsTable.id, { onDelete: "cascade" }),
    answers: (0, sqlite_core_1.text)("answers"), // JSON string
    score: (0, sqlite_core_1.integer)("score"),
    totalQuestions: (0, sqlite_core_1.integer)("total_questions").notNull(),
    submitted: (0, sqlite_core_1.integer)("submitted", { mode: "boolean" }).default(false),
    synced: (0, sqlite_core_1.integer)("synced", { mode: "boolean" }).default(false),
    startedAt: (0, sqlite_core_1.text)("started_at").notNull(),
    submittedAt: (0, sqlite_core_1.text)("submitted_at"),
    updatedAt: (0, sqlite_core_1.text)("updated_at").notNull(),
    syncAttemptedAt: (0, sqlite_core_1.text)("sync_attempted_at"),
    syncError: (0, sqlite_core_1.text)("sync_error"),
    sessionDuration: (0, sqlite_core_1.integer)("session_duration"),
    elapsedTime: (0, sqlite_core_1.integer)("elapsed_time").default(0), // Accumulated time spent in seconds
    lastActiveAt: (0, sqlite_core_1.text)("last_active_at"), // When quiz was last active (for resume tracking)
});
exports.syncLogTable = (0, sqlite_core_1.sqliteTable)("sync_log", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    operationType: (0, sqlite_core_1.text)("operation_type").notNull(),
    tableName: (0, sqlite_core_1.text)("table_name").notNull(),
    recordId: (0, sqlite_core_1.text)("record_id").notNull(),
    status: (0, sqlite_core_1.text)("status").notNull(), // 'success', 'failed', 'pending'
    errorMessage: (0, sqlite_core_1.text)("error_message"),
    attemptedAt: (0, sqlite_core_1.text)("attempted_at").notNull(),
    completedAt: (0, sqlite_core_1.text)("completed_at"),
});
exports.syncTimestampsTable = (0, sqlite_core_1.sqliteTable)("sync_timestamps", {
    tableName: (0, sqlite_core_1.text)("table_name").primaryKey(),
    lastPullSync: (0, sqlite_core_1.text)("last_pull_sync"),
    lastPushSync: (0, sqlite_core_1.text)("last_push_sync"),
    lastFullSync: (0, sqlite_core_1.text)("last_full_sync"),
});
exports.localSchema = {
    users: exports.usersTable,
    subjects: exports.subjectsTable,
    questions: exports.questionsTable,
    quizAttempts: exports.quizAttemptsTable,
    syncLog: exports.syncLogTable,
    syncTimestamps: exports.syncTimestampsTable,
};
