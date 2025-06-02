// Database Entity Types

export type Class = "SS2" | "JSS3";
export type Gender = "MALE" | "FEMALE";

export interface User {
  id: string;
  name: string;
  studentCode: string;
  passwordHash: string;
  class: Class;
  gender: Gender;
  createdAt: string;
  updatedAt: string;
  lastSynced?: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  subjectCode: string;
  description?: string;
  class: Class;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  text: string;
  options: string; // JSON string
  answer: string;
  difficultyLevel: number;
  questionOrder?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  subjectId: string;
  answers?: string; // JSON string
  score?: number;
  totalQuestions: number;
  submitted: boolean;
  synced: boolean;
  startedAt: string;
  submittedAt?: string;
  updatedAt: string;
  syncAttemptedAt?: string;
  syncError?: string;
  sessionDuration?: number;
}

export interface SyncLog {
  id: string;
  operationType: string;
  tableName: string;
  recordId: string;
  status: "success" | "failed" | "pending";
  errorMessage?: string;
  attemptedAt: string;
  completedAt?: string;
}

// Input/Creation Types
export interface CreateUserData {
  id: string;
  name: string;
  studentCode: string;
  passwordHash: string;
  class: Class;
  gender: Gender;
  pin: string; // For seeding purposes
}

export interface DatabaseUserData {
  id: string;
  name: string;
  studentCode: string;
  passwordHash: string;
  class: Class;
  gender: Gender;
}

export interface CreateSubjectData {
  id: string;
  name: string;
  subjectCode: string;
  description?: string;
  class: Class;
}

export interface CreateQuestionData {
  id: string;
  subjectId: string;
  text: string;
  options: string; // JSON string
  answer: string;
  difficultyLevel?: number;
  questionOrder?: number;
}

export interface CreateQuizAttemptData {
  id: string;
  userId: string;
  subjectId: string;
  totalQuestions: number;
}

// Quiz Flow Types
export interface QuizSession {
  attemptId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isResume: boolean;
}

export interface AnswerResult {
  success: boolean;
  nextQuestionIndex?: number;
  isComplete?: boolean;
  error?: string;
}

export interface SubmissionResult {
  success: boolean;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  percentage?: number;
  error?: string;
}

export interface ScoreResult {
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
}

// Authentication Types
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
  subject?: Subject;
  existingAttempt?: QuizAttempt | null;
  sessionToken?: string;
}

// Sync Types
export interface SyncOperation {
  id: string;
  type: "push" | "pull" | "conflict_resolution";
  tableName: string;
  recordId: string;
  data: any;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  pushedRecords?: number;
  pulledRecords?: number;
  error?: string;
}

export interface SyncData {
  users: any[];
  subjects: any[];
  questions: any[];
}

// Error Handling Types
export interface ErrorLogEntry {
  id: string;
  type: "database" | "sync" | "quiz" | "network";
  message: string;
  context: string;
  timestamp: string;
  stack?: string;
}

// Import/Export Types
export interface ImportResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface ExcelQuestion {
  "Question Text": string;
  "Option A": string;
  "Option B": string;
  "Option C": string;
  "Option D": string;
  "Correct Answer": string;
  "Subject Code": string;
}

// Student/Subject Data Types (consolidated from constants/students.ts)
export interface StudentData {
  name: string;
  gender: Gender;
  class: Class;
  studentCode: string;
}

export interface SubjectData {
  name: string;
  subjectCode: string;
  description: string;
  class: Class;
}

// Seeding Types (consolidated from user-seeding-service.ts)
export interface UserSeedData {
  name: string;
  studentCode: string;
  pin: string;
  class: Class;
  gender: Gender;
}

export interface SubjectSeedData {
  name: string;
  subjectCode: string;
  description?: string;
  class: Class;
}

export interface SeedResult {
  created: number;
  skipped: number;
  errors: string[];
}

// Performance Types
export interface PerformanceMetric {
  type: "database" | "sync" | "quiz";
  operation: string;
  duration: number;
  recordCount?: number;
  timestamp: number;
}

export interface PerformanceReport {
  averageDatabaseResponseTime: number;
  averageSyncTime: number;
  totalSyncOperations: number;
  totalDatabaseOperations: number;
  memoryUsage: MemoryInfo;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Data Recovery Types
export interface IntegrityCheckResult {
  isValid: boolean;
  issues: string[];
  fixable: boolean;
}

export interface RepairResult {
  success: boolean;
  actionsPerformed: string[];
  error?: string;
}

export interface BackupResult {
  success: boolean;
  backupId?: string;
  size?: number;
  error?: string;
}

// Electron API Types
export interface DatabaseAPI {
  execute: (sql: string, params: unknown[]) => Promise<unknown[]>;
  run: (sql: string, params: unknown[]) => Promise<unknown>;
  backup: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  checkIntegrity: () => Promise<boolean>;
}

// App API Types
export interface AppAPI {
  getVersion: () => Promise<string>;
  getPath: (name: string) => Promise<string | null>;
}

export interface ElectronAPI {
  database: DatabaseAPI;
  app: AppAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
