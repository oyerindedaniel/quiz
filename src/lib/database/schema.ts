import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import {
  pgTable,
  uuid,
  varchar,
  text as pgText,
  timestamp,
  boolean,
  jsonb,
  integer as pgInteger,
} from "drizzle-orm/pg-core";

// SQLite Schema (Local Database)
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  studentCode: text("student_code").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  class: text("class").notNull(), // SS2 or JSS3
  gender: text("gender").notNull(), // MALE or FEMALE
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastSynced: text("last_synced"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const subjectsTable = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subjectCode: text("subject_code").unique().notNull(),
  description: text("description"),
  class: text("class").notNull(), // SS2 or JSS3
  totalQuestions: integer("total_questions").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const questionsTable = sqliteTable("questions", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  options: text("options").notNull(), // JSON string
  answer: text("answer").notNull(),
  difficultyLevel: integer("difficulty_level").default(1),
  questionOrder: integer("question_order"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const quizAttemptsTable = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  answers: text("answers"), // JSON string
  score: integer("score"),
  totalQuestions: integer("total_questions").notNull(),
  submitted: integer("submitted", { mode: "boolean" }).default(false),
  synced: integer("synced", { mode: "boolean" }).default(false),
  startedAt: text("started_at").notNull(),
  submittedAt: text("submitted_at"),
  updatedAt: text("updated_at").notNull(),
  syncAttemptedAt: text("sync_attempted_at"),
  syncError: text("sync_error"),
  sessionDuration: integer("session_duration"),
});

export const syncLogTable = sqliteTable("sync_log", {
  id: text("id").primaryKey(),
  operationType: text("operation_type").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  status: text("status").notNull(), // 'success', 'failed', 'pending'
  errorMessage: text("error_message"),
  attemptedAt: text("attempted_at").notNull(),
  completedAt: text("completed_at"),
});

// PostgreSQL Schema (Remote Database - NeonDB)
export const remoteUsersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  studentCode: varchar("student_code", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  class: varchar("class", { length: 10 }).notNull(), // SS2 or JSS3
  gender: varchar("gender", { length: 10 }).notNull(), // MALE or FEMALE
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
  schoolId: uuid("school_id"),
  gradeLevel: varchar("grade_level", { length: 10 }),
});

export const remoteSubjectsTable = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subjectCode: varchar("subject_code", { length: 50 }).unique().notNull(),
  description: pgText("description"),
  class: varchar("class", { length: 10 }).notNull(), // SS2 or JSS3
  totalQuestions: pgInteger("total_questions").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  category: varchar("category", { length: 100 }),
  academicYear: varchar("academic_year", { length: 20 }),
});

export const remoteQuestionsTable = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => remoteSubjectsTable.id, { onDelete: "cascade" }),
  text: pgText("text").notNull(),
  options: jsonb("options").notNull(),
  answer: varchar("answer", { length: 1 }).notNull(),
  difficultyLevel: pgInteger("difficulty_level").default(1),
  questionOrder: pgInteger("question_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  isActive: boolean("is_active").default(true),
  tags: jsonb("tags"),
  explanation: pgText("explanation"),
});

export const remoteQuizAttemptsTable = pgTable("quiz_attempts", {
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
});

export const remoteQuizAnalyticsTable = pgTable("quiz_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").references(() => remoteSubjectsTable.id),
  totalAttempts: pgInteger("total_attempts").default(0),
  averageScore: pgInteger("average_score"), // Store as integer (percentage * 100)
  passRate: pgInteger("pass_rate"), // Store as integer (percentage * 100)
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Subject = typeof subjectsTable.$inferSelect;
export type NewSubject = typeof subjectsTable.$inferInsert;
export type Question = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
export type NewQuizAttempt = typeof quizAttemptsTable.$inferInsert;
export type SyncLog = typeof syncLogTable.$inferSelect;
export type NewSyncLog = typeof syncLogTable.$inferInsert;
