import {
  pgTable,
  uuid,
  varchar,
  text as pgText,
  timestamp,
  boolean,
  jsonb,
  integer as pgInteger,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const classEnum = pgEnum("class", ["SS2", "JSS3", "BASIC5"]);
export const adminRoleEnum = pgEnum("admin_role", [
  "SUPER_ADMIN",
  "ADMIN",
  "TEACHER",
]);
export const adminStatusEnum = pgEnum("admin_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export type Gender = (typeof genderEnum.enumValues)[number];
export type Class = (typeof classEnum.enumValues)[number];
export type AdminRole = (typeof adminRoleEnum.enumValues)[number];
export type AdminStatus = (typeof adminStatusEnum.enumValues)[number];

// PostgreSQL Schema (Remote Database - NeonDB)
export const remoteUsersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    studentCode: varchar("student_code", { length: 50 }).unique().notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    class: classEnum("class").notNull(),
    gender: genderEnum("gender").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastLogin: timestamp("last_login"),
    isActive: boolean("is_active").default(true),
    schoolId: uuid("school_id"),
  },
  (table) => [
    index("users_student_code_idx").on(table.studentCode),
    index("users_class_idx").on(table.class),
    index("users_created_at_idx").on(table.createdAt),
    index("users_is_active_idx").on(table.isActive),
  ]
);

export const remoteSubjectsTable = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    subjectCode: varchar("subject_code", { length: 50 }).unique().notNull(),
    description: pgText("description"),
    class: classEnum("class").notNull(),
    totalQuestions: pgInteger("total_questions").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true),
    category: varchar("category", { length: 100 }),
    academicYear: varchar("academic_year", { length: 20 }),
  },
  (table) => [
    index("subjects_subject_code_idx").on(table.subjectCode),
    index("subjects_class_idx").on(table.class),
    index("subjects_is_active_idx").on(table.isActive),
    index("subjects_created_at_idx").on(table.createdAt),
  ]
);

export const remoteQuestionsTable = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => remoteSubjectsTable.id, { onDelete: "cascade" }),
    subjectCode: varchar("subject_code", { length: 50 }).notNull(),
    text: pgText("text").notNull(),
    options: jsonb("options").notNull(),
    answer: varchar("answer", { length: 1 }).notNull(),
    questionOrder: pgInteger("question_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
    isActive: boolean("is_active").default(true),
    explanation: pgText("explanation"),
  },
  (table) => [
    // Single column indexes
    index("questions_subject_code_idx").on(table.subjectCode),
    index("questions_question_order_idx").on(table.questionOrder),
    index("questions_is_active_idx").on(table.isActive),
    index("questions_created_at_idx").on(table.createdAt),
    index("questions_subject_id_idx").on(table.subjectId),

    // Composite indexes for common query patterns
    index("questions_subject_id_active_idx").on(
      table.subjectId,
      table.isActive
    ),
    index("questions_subject_code_active_idx").on(
      table.subjectCode,
      table.isActive
    ),
    index("questions_subject_id_order_idx").on(
      table.subjectId,
      table.questionOrder
    ),
    index("questions_subject_code_order_idx").on(
      table.subjectCode,
      table.questionOrder
    ),

    // Unique constraint
    unique("questions_subject_id_order_unique").on(
      table.subjectId,
      table.questionOrder
    ),
  ]
);

export const remoteQuizAttemptsTable = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => remoteUsersTable.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => remoteSubjectsTable.id, { onDelete: "cascade" }),
    answers: jsonb("answers"),
    score: pgInteger("score"),
    totalQuestions: pgInteger("total_questions").notNull(),
    submitted: boolean("submitted").default(false),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    sessionDuration: pgInteger("session_duration"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: pgText("user_agent"),
    version: varchar("version", { length: 20 }),
    elapsedTime: pgInteger("elapsed_time").default(0),
    lastActiveAt: timestamp("last_active_at"),
  },
  (table) => [
    index("quiz_attempts_user_id_idx").on(table.userId),
    index("quiz_attempts_subject_id_idx").on(table.subjectId),
    index("quiz_attempts_submitted_idx").on(table.submitted),
    index("quiz_attempts_started_at_idx").on(table.startedAt),
    index("quiz_attempts_submitted_at_idx").on(table.submittedAt),
    index("quiz_attempts_user_subject_idx").on(table.userId, table.subjectId),
  ]
);

export const remoteQuizAnalyticsTable = pgTable("quiz_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").references(() => remoteSubjectsTable.id),
  totalAttempts: pgInteger("total_attempts").default(0),
  averageScore: pgInteger("average_score"), // Store as integer (percentage * 100)
  passRate: pgInteger("pass_rate"), // Store as integer (percentage * 100)
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const remoteAdminsTable = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 100 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: adminRoleEnum("role").notNull().default("ADMIN"),
  status: adminStatusEnum("status").notNull().default("ACTIVE"),
  permissions: jsonb("permissions").default({}),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  profileImage: varchar("profile_image", { length: 500 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
});

export const usersRelations = relations(remoteUsersTable, ({ many }) => ({
  quizAttempts: many(remoteQuizAttemptsTable),
}));

export const subjectsRelations = relations(remoteSubjectsTable, ({ many }) => ({
  questions: many(remoteQuestionsTable),
  quizAttempts: many(remoteQuizAttemptsTable),
}));

export const questionsRelations = relations(
  remoteQuestionsTable,
  ({ one }) => ({
    subject: one(remoteSubjectsTable, {
      fields: [remoteQuestionsTable.subjectId],
      references: [remoteSubjectsTable.id],
    }),
  })
);

export const quizAttemptsRelations = relations(
  remoteQuizAttemptsTable,
  ({ one }) => ({
    user: one(remoteUsersTable, {
      fields: [remoteQuizAttemptsTable.userId],
      references: [remoteUsersTable.id],
    }),
    subject: one(remoteSubjectsTable, {
      fields: [remoteQuizAttemptsTable.subjectId],
      references: [remoteSubjectsTable.id],
    }),
  })
);

export const adminsRelations = relations(remoteAdminsTable, ({ one }) => ({
  createdBy: one(remoteAdminsTable, {
    fields: [remoteAdminsTable.createdBy],
    references: [remoteAdminsTable.id],
  }),
}));

export const remoteSchema = {
  users: remoteUsersTable,
  subjects: remoteSubjectsTable,
  questions: remoteQuestionsTable,
  quizAttempts: remoteQuizAttemptsTable,
  quizAnalytics: remoteQuizAnalyticsTable,
  admins: remoteAdminsTable,
  // Add relations to schema
  usersRelations,
  subjectsRelations,
  questionsRelations,
  quizAttemptsRelations,
  adminsRelations,
};

export type RemoteUser = typeof remoteUsersTable.$inferSelect;
export type NewRemoteUser = typeof remoteUsersTable.$inferInsert;
export type RemoteSubject = typeof remoteSubjectsTable.$inferSelect;
export type NewRemoteSubject = typeof remoteSubjectsTable.$inferInsert;
export type RemoteQuestion = typeof remoteQuestionsTable.$inferSelect;
export type NewRemoteQuestion = typeof remoteQuestionsTable.$inferInsert;
export type RemoteQuizAttempt = typeof remoteQuizAttemptsTable.$inferSelect;
export type NewRemoteQuizAttempt = typeof remoteQuizAttemptsTable.$inferInsert;
export type RemoteAdmin = typeof remoteAdminsTable.$inferSelect;
export type NewRemoteAdmin = typeof remoteAdminsTable.$inferInsert;
