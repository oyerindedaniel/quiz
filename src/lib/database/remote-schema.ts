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
} from "drizzle-orm/pg-core";

// Enums for PostgreSQL
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const classEnum = pgEnum("class", ["SS2", "JSS3"]);

// PostgreSQL Schema (Remote Database - NeonDB)
export const remoteUsersTable = pgTable("users", {
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
  gradeLevel: varchar("grade_level", { length: 10 }),
});

export const remoteSubjectsTable = pgTable("subjects", {
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

// Schema object for Drizzle configuration
export const remoteSchema = {
  users: remoteUsersTable,
  subjects: remoteSubjectsTable,
  questions: remoteQuestionsTable,
  quizAttempts: remoteQuizAttemptsTable,
  quizAnalytics: remoteQuizAnalyticsTable,
};

// Export types
export type RemoteUser = typeof remoteUsersTable.$inferSelect;
export type NewRemoteUser = typeof remoteUsersTable.$inferInsert;
export type RemoteSubject = typeof remoteSubjectsTable.$inferSelect;
export type NewRemoteSubject = typeof remoteSubjectsTable.$inferInsert;
export type RemoteQuestion = typeof remoteQuestionsTable.$inferSelect;
export type NewRemoteQuestion = typeof remoteQuestionsTable.$inferInsert;
export type RemoteQuizAttempt = typeof remoteQuizAttemptsTable.$inferSelect;
export type NewRemoteQuizAttempt = typeof remoteQuizAttemptsTable.$inferInsert;
