"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteSchema = exports.adminsRelations = exports.quizAttemptsRelations = exports.questionsRelations = exports.subjectsRelations = exports.usersRelations = exports.remoteAdminsTable = exports.remoteQuizAnalyticsTable = exports.remoteQuizAttemptsTable = exports.remoteQuestionsTable = exports.remoteSubjectsTable = exports.remoteUsersTable = exports.adminStatusEnum = exports.adminRoleEnum = exports.classEnum = exports.genderEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.genderEnum = (0, pg_core_1.pgEnum)("gender", ["MALE", "FEMALE"]);
exports.classEnum = (0, pg_core_1.pgEnum)("class", ["SS2", "JSS3", "BASIC5"]);
exports.adminRoleEnum = (0, pg_core_1.pgEnum)("admin_role", [
    "SUPER_ADMIN",
    "ADMIN",
    "TEACHER",
]);
exports.adminStatusEnum = (0, pg_core_1.pgEnum)("admin_status", [
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
]);
// PostgreSQL Schema (Remote Database - NeonDB)
exports.remoteUsersTable = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    studentCode: (0, pg_core_1.varchar)("student_code", { length: 50 }).unique().notNull(),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    class: (0, exports.classEnum)("class").notNull(),
    gender: (0, exports.genderEnum)("gender").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastLogin: (0, pg_core_1.timestamp)("last_login"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    schoolId: (0, pg_core_1.uuid)("school_id"),
}, (table) => [
    (0, pg_core_1.index)("users_student_code_idx").on(table.studentCode),
    (0, pg_core_1.index)("users_class_idx").on(table.class),
    (0, pg_core_1.index)("users_created_at_idx").on(table.createdAt),
    (0, pg_core_1.index)("users_is_active_idx").on(table.isActive),
]);
exports.remoteSubjectsTable = (0, pg_core_1.pgTable)("subjects", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    subjectCode: (0, pg_core_1.varchar)("subject_code", { length: 50 }).unique().notNull(),
    description: (0, pg_core_1.text)("description"),
    class: (0, exports.classEnum)("class").notNull(),
    totalQuestions: (0, pg_core_1.integer)("total_questions").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    category: (0, pg_core_1.varchar)("category", { length: 100 }),
    academicYear: (0, pg_core_1.varchar)("academic_year", { length: 20 }),
}, (table) => [
    (0, pg_core_1.index)("subjects_subject_code_idx").on(table.subjectCode),
    (0, pg_core_1.index)("subjects_class_idx").on(table.class),
    (0, pg_core_1.index)("subjects_is_active_idx").on(table.isActive),
    (0, pg_core_1.index)("subjects_created_at_idx").on(table.createdAt),
]);
exports.remoteQuestionsTable = (0, pg_core_1.pgTable)("questions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    subjectId: (0, pg_core_1.uuid)("subject_id")
        .notNull()
        .references(() => exports.remoteSubjectsTable.id, { onDelete: "cascade" }),
    subjectCode: (0, pg_core_1.varchar)("subject_code", { length: 50 }).notNull(),
    text: (0, pg_core_1.text)("text").notNull(),
    options: (0, pg_core_1.jsonb)("options").notNull(),
    answer: (0, pg_core_1.varchar)("answer", { length: 1 }).notNull(),
    questionOrder: (0, pg_core_1.integer)("question_order").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    explanation: (0, pg_core_1.text)("explanation"),
}, (table) => [
    (0, pg_core_1.index)("questions_subject_code_idx").on(table.subjectCode),
    (0, pg_core_1.index)("questions_question_order_idx").on(table.questionOrder),
    (0, pg_core_1.index)("questions_is_active_idx").on(table.isActive),
    (0, pg_core_1.index)("questions_created_at_idx").on(table.createdAt),
    (0, pg_core_1.index)("questions_subject_id_idx").on(table.subjectId),
    (0, pg_core_1.unique)("questions_subject_id_order_unique").on(table.subjectId, table.questionOrder),
]);
exports.remoteQuizAttemptsTable = (0, pg_core_1.pgTable)("quiz_attempts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.remoteUsersTable.id, { onDelete: "cascade" }),
    subjectId: (0, pg_core_1.uuid)("subject_id")
        .notNull()
        .references(() => exports.remoteSubjectsTable.id, { onDelete: "cascade" }),
    answers: (0, pg_core_1.jsonb)("answers"),
    score: (0, pg_core_1.integer)("score"),
    totalQuestions: (0, pg_core_1.integer)("total_questions").notNull(),
    submitted: (0, pg_core_1.boolean)("submitted").default(false),
    startedAt: (0, pg_core_1.timestamp)("started_at").defaultNow().notNull(),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    sessionDuration: (0, pg_core_1.integer)("session_duration"),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    version: (0, pg_core_1.varchar)("version", { length: 20 }),
    elapsedTime: (0, pg_core_1.integer)("elapsed_time").default(0),
    lastActiveAt: (0, pg_core_1.timestamp)("last_active_at"),
}, (table) => [
    (0, pg_core_1.index)("quiz_attempts_user_id_idx").on(table.userId),
    (0, pg_core_1.index)("quiz_attempts_subject_id_idx").on(table.subjectId),
    (0, pg_core_1.index)("quiz_attempts_submitted_idx").on(table.submitted),
    (0, pg_core_1.index)("quiz_attempts_started_at_idx").on(table.startedAt),
    (0, pg_core_1.index)("quiz_attempts_submitted_at_idx").on(table.submittedAt),
    (0, pg_core_1.index)("quiz_attempts_user_subject_idx").on(table.userId, table.subjectId),
]);
exports.remoteQuizAnalyticsTable = (0, pg_core_1.pgTable)("quiz_analytics", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    subjectId: (0, pg_core_1.uuid)("subject_id").references(() => exports.remoteSubjectsTable.id),
    totalAttempts: (0, pg_core_1.integer)("total_attempts").default(0),
    averageScore: (0, pg_core_1.integer)("average_score"), // Store as integer (percentage * 100)
    passRate: (0, pg_core_1.integer)("pass_rate"), // Store as integer (percentage * 100)
    calculatedAt: (0, pg_core_1.timestamp)("calculated_at").defaultNow().notNull(),
});
exports.remoteAdminsTable = (0, pg_core_1.pgTable)("admins", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique().notNull(),
    username: (0, pg_core_1.varchar)("username", { length: 100 }).unique().notNull(),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }).notNull(),
    role: (0, exports.adminRoleEnum)("role").notNull().default("ADMIN"),
    status: (0, exports.adminStatusEnum)("status").notNull().default("ACTIVE"),
    permissions: (0, pg_core_1.jsonb)("permissions").default({}),
    lastLogin: (0, pg_core_1.timestamp)("last_login"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    profileImage: (0, pg_core_1.varchar)("profile_image", { length: 500 }),
    phoneNumber: (0, pg_core_1.varchar)("phone_number", { length: 20 }),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.remoteUsersTable, ({ many }) => ({
    quizAttempts: many(exports.remoteQuizAttemptsTable),
}));
exports.subjectsRelations = (0, drizzle_orm_1.relations)(exports.remoteSubjectsTable, ({ many }) => ({
    questions: many(exports.remoteQuestionsTable),
    quizAttempts: many(exports.remoteQuizAttemptsTable),
}));
exports.questionsRelations = (0, drizzle_orm_1.relations)(exports.remoteQuestionsTable, ({ one }) => ({
    subject: one(exports.remoteSubjectsTable, {
        fields: [exports.remoteQuestionsTable.subjectId],
        references: [exports.remoteSubjectsTable.id],
    }),
}));
exports.quizAttemptsRelations = (0, drizzle_orm_1.relations)(exports.remoteQuizAttemptsTable, ({ one }) => ({
    user: one(exports.remoteUsersTable, {
        fields: [exports.remoteQuizAttemptsTable.userId],
        references: [exports.remoteUsersTable.id],
    }),
    subject: one(exports.remoteSubjectsTable, {
        fields: [exports.remoteQuizAttemptsTable.subjectId],
        references: [exports.remoteSubjectsTable.id],
    }),
}));
exports.adminsRelations = (0, drizzle_orm_1.relations)(exports.remoteAdminsTable, ({ one }) => ({
    createdBy: one(exports.remoteAdminsTable, {
        fields: [exports.remoteAdminsTable.createdBy],
        references: [exports.remoteAdminsTable.id],
    }),
}));
exports.remoteSchema = {
    users: exports.remoteUsersTable,
    subjects: exports.remoteSubjectsTable,
    questions: exports.remoteQuestionsTable,
    quizAttempts: exports.remoteQuizAttemptsTable,
    quizAnalytics: exports.remoteQuizAnalyticsTable,
    admins: exports.remoteAdminsTable,
    // Add relations to schema
    usersRelations: exports.usersRelations,
    subjectsRelations: exports.subjectsRelations,
    questionsRelations: exports.questionsRelations,
    quizAttemptsRelations: exports.quizAttemptsRelations,
    adminsRelations: exports.adminsRelations,
};
