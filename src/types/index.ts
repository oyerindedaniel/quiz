export type {
  User,
  NewUser,
  Subject,
  NewSubject,
  Question,
  NewQuestion,
  QuizAttempt,
  NewQuizAttempt,
  SyncLog,
  NewSyncLog,
} from "@/lib/database/local-schema";

export type {
  RemoteUser,
  NewRemoteUser,
  RemoteSubject,
  NewRemoteSubject,
  RemoteQuestion,
  NewRemoteQuestion,
  RemoteQuizAttempt,
  NewRemoteQuizAttempt,
} from "@/lib/database/remote-schema";

// Import types for local use
import type {
  User,
  NewUser,
  Subject,
  QuizAttempt,
  NewQuizAttempt,
  Question,
} from "@/lib/database/local-schema";

// Application-specific types

export type Class = "SS2" | "JSS3";
export type Gender = "MALE" | "FEMALE";

// Input/Creation Types for seeding and imports
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
  duration?: number;
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
export interface SyncOperation<T = Record<string, unknown>> {
  id: string;
  type: "push" | "pull" | "conflict_resolution";
  tableName: string;
  recordId: string;
  data: T;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  pushedRecords?: number;
  pulledRecords?: number;
  conflicts?: SyncConflict<Record<string, unknown>>[];
  error?: string;
  duration?: number;
  note?: string; // Additional information about the sync operation
}

export interface SyncData {
  users: User[];
  subjects: Subject[];
  questions: Question[];
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
  subjects: {
    created: number;
    existing: number;
  };
  questions: {
    regular: number;
    passages: number;
    headers: number;
  };
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

// Student/Subject Data Types
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

// Quiz API Types
export interface QuizAPI {
  getQuestions: (subjectId: string) => Promise<Question[]>;
  findIncompleteAttempt: (
    userId: string,
    subjectId: string
  ) => Promise<QuizAttempt | null>;
  createAttempt: (
    attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt">
  ) => Promise<string>;
  getAttempt: (attemptId: string) => Promise<QuizAttempt | null>;
  saveAnswer: (
    attemptId: string,
    questionId: string,
    answer: string
  ) => Promise<void>;
  submit: (
    attemptId: string,
    score: number,
    sessionDuration: number
  ) => Promise<void>;
}

// User API Types
export interface UserAPI {
  findByStudentCode: (studentCode: string) => Promise<User | null>;
  create: (userData: Omit<NewUser, "createdAt" | "updatedAt">) => Promise<void>;
}

// Subject API Types
export interface SubjectAPI {
  findByCode: (subjectCode: string) => Promise<Subject | null>;
}

// CSV API Types
export interface CSVAPI {
  import: (csvContent: string) => Promise<ImportResult>;
  readFile: (filePath: string) => Promise<string>;
}

// App API Types
export interface AppAPI {
  getVersion: () => Promise<string>;
  getPath: (name: string) => Promise<string | null>;
}

// Sync API Types
export interface SyncAPI {
  trigger: (
    trigger?: "manual" | "startup" | "app_close"
  ) => Promise<{ success: boolean; error?: string }>;
  getStatus: () => Promise<SyncStatus>;
  queueOperation: <T = Record<string, unknown>>(operation: {
    type: "push" | "pull" | "conflict_resolution";
    tableName: string;
    recordId: string;
    data: T;
  }) => Promise<void>;
}

export interface ElectronAPI {
  database: DatabaseAPI;
  quiz: QuizAPI;
  user: UserAPI;
  subject: SubjectAPI;
  csv: CSVAPI;
  app: AppAPI;
  sync: SyncAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// CSV Import Types
export interface CSVRow {
  "Subject Code": string;
  "Question Text": string;
  "Option A": string;
  "Option B": string;
  "Option C": string;
  "Option D": string;
  "Correct Answer": string;
  "Question Order": string;
}

export interface QuestionItem {
  question: Question;
  type: "question" | "passage" | "header";
  content: string;
  options?: string[];
  answer?: string;
}

export interface ProcessedQuizData {
  questionItems: QuestionItem[];
  actualQuestions: QuestionItem[]; // Only questions that can be answered
  totalQuestions: number; // Count of answerable questions
}

// Sync Engine Types
export interface DatabaseServiceInterface {
  findUserByStudentCode(studentCode: string): Promise<any>;
  createUser(userData: any): Promise<void>;
  findSubjectByCode(subjectCode: string): Promise<any>;
  createSubject(subjectData: any): Promise<void>;
  getQuestionsForSubject(subjectId: string): Promise<any[]>;
  createQuestion(questionData: any): Promise<void>;
  getAllQuizAttempts(): Promise<any[]>;
  isConnected(): boolean;
}

export interface SyncStatus {
  lastSyncTimestamp: string | null;
  isOnline: boolean;
  localChanges: number;
  remoteChanges: number;
  syncInProgress: boolean;
}

export interface SyncConflict<T = Record<string, unknown>> {
  id: string;
  tableName: string;
  recordId: string;
  localRecord: T;
  remoteRecord: T;
  conflictType: "update_conflict" | "delete_conflict";
  timestamp: string;
}
