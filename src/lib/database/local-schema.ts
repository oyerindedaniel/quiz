import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

// SQLite Schema (Local Database)
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  studentCode: text("student_code").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  class: text("class", { enum: ["SS2", "JSS3"] }).notNull(),
  gender: text("gender", { enum: ["MALE", "FEMALE"] }).notNull(),
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
  class: text("class", { enum: ["SS2", "JSS3"] }).notNull(),
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

export const syncTimestampsTable = sqliteTable("sync_timestamps", {
  tableName: text("table_name").primaryKey(),
  lastPullSync: text("last_pull_sync"),
  lastPushSync: text("last_push_sync"),
  lastFullSync: text("last_full_sync"),
});

// Schema object for Drizzle configuration
export const localSchema = {
  users: usersTable,
  subjects: subjectsTable,
  questions: questionsTable,
  quizAttempts: quizAttemptsTable,
  syncLog: syncLogTable,
  syncTimestamps: syncTimestampsTable,
};

// Export types
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
export type SyncTimestamps = typeof syncTimestampsTable.$inferSelect;
export type NewSyncTimestamps = typeof syncTimestampsTable.$inferInsert;
