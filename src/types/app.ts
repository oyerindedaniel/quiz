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
  RemoteAdmin,
  NewRemoteAdmin,
  Gender,
  Class,
  AdminRole,
  AdminStatus,
} from "@/lib/database/remote-schema";

import type {
  User,
  NewUser,
  Subject,
  NewSubject,
  Question,
  NewQuestion,
  QuizAttempt,
  NewQuizAttempt,
} from "@/lib/database/local-schema";
import type {
  RemoteAdmin,
  Gender,
  Class,
  AdminRole,
  RemoteQuestion,
} from "@/lib/database/remote-schema";
import { SyncTrigger } from "@/lib/sync/sync-engine";

// Result Types
export interface BaseResult {
  success: boolean;
  error?: string;
}

export interface ResultWithData<T> extends BaseResult {
  data?: T;
}

export interface ResultWithCount extends BaseResult {
  created?: number;
  updated?: number;
  deleted?: number;
  updatedCount?: number;
  deletedCount?: number;
}

export interface CreateResult extends BaseResult {
  created: number;
}

export interface UpdateResult extends BaseResult {
  updated?: boolean;
}

export interface DeleteResult extends BaseResult {
  deletedCount?: number;
}

export interface ToggleResult extends BaseResult {
  updatedCount?: number;
}

export interface BulkOperationResult extends BaseResult {
  created: number;
  updated?: number;
  failed?: number;
}

export type UserToggleResult = ToggleResult;
export type UserUpdateResult = UpdateResult;
export type UserPinChangeResult = UpdateResult;
export type QuestionCreationResult = CreateResult;
export type QuizDeletionResult = DeleteResult;
export type BackupResult = BaseResult;

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

// Admin Authentication Types
export interface AdminAuthResult {
  success: boolean;
  error?: string;
  admin?: RemoteAdmin;
  sessionToken?: string;
}

export interface AdminSessionData {
  admin: RemoteAdmin;
  sessionToken: string;
  authenticatedAt: string;
}

// Session data
export interface SessionData {
  user: User;
  subject: Subject;
  sessionToken: string;
  authenticatedAt: string;
}

// Sync Types
export type SyncOperationType = "push" | "pull" | "conflict_resolution";

export interface SyncOperation<T = Record<string, unknown>> {
  id: string;
  type: SyncOperationType;
  tableName: string;
  recordId: string;
  data: T;
  timestamp: string;
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
    images: number;
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

export interface RawQuizAttemptResult {
  id: string;
  user_id: string;
  subject_id: string;
  answers: string | null;
  score: number | null;
  total_questions: number;
  submitted: number; // SQLite boolean as integer
  synced: number; // SQLite boolean as integer
  started_at: string;
  submitted_at: string | null;
  updated_at: string;
  sync_attempted_at: string | null;
  sync_error: string | null;
  session_duration: number | null;
  elapsed_time: number;
  last_active_at: string | null;
}

// Electron API Types
export interface DatabaseAPI {
  execute: (sql: string, params: unknown[]) => Promise<unknown[]>;
  run: (sql: string, params: unknown[]) => Promise<unknown>;
  backup: (backupPath: string) => Promise<BackupResult>;
  checkIntegrity: () => Promise<boolean>;
}

// Quiz API Types
export interface QuizAPI {
  getQuestions: (subjectId: string) => Promise<Question[]>;
  getProcessedQuestions: (subjectId: string) => Promise<LocalProcessedQuestion>;
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
  updateElapsedTime: (attemptId: string, elapsedTime: number) => Promise<void>;
  bulkCreateQuestions: (
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ) => Promise<QuestionCreationResult>;
  hasSubmittedAttempt: (userId: string, subjectId: string) => Promise<boolean>;
  deleteQuizAttempts: (
    studentCode: string,
    subjectCode: string
  ) => Promise<QuizDeletionResult>;
  resetLocalAttempts: (
    studentCode: string,
    subjectCode: string
  ) => Promise<QuizDeletionResult>;
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
  trigger: (trigger?: SyncTrigger) => Promise<{
    success: boolean;
    error?: string;
  }>;
  getStatus: () => Promise<SyncStatus>;
  queueOperation: <T = Record<string, unknown>>(operation: {
    type: SyncOperationType;
    tableName: string;
    recordId: string;
    data: T;
  }) => Promise<void>;
  syncQuestions: (options?: {
    replaceExisting?: boolean;
    subjectCodes?: string[];
  }) => Promise<QuestionSyncResult>;
  syncUsers: (options?: {
    replaceExisting?: boolean;
  }) => Promise<UserSyncResult>;
  syncLocalDB: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    totalSynced?: number;
  }>;
  isLocalDBEmpty: () => Promise<boolean>;
}

export interface SeedAPI {
  performAutoSeeding: () => Promise<{
    success: boolean;
    totalRecords: number;
    error?: string;
  }>;
}

export interface AuthAPI {
  authenticate: (
    studentCode: string,
    subjectCode: string,
    pin: string
  ) => Promise<AuthResult>;
  validateSession: (token: string) => Promise<{
    valid: boolean;
    userId?: string;
    subjectId?: string;
  }>;
  logout: () => Promise<void>;
  getCurrentSession: () => Promise<{
    isAuthenticated: boolean;
    user?: User;
    subject?: Subject;
    sessionToken?: string;
  }>;
  storeSession: (sessionData: SessionData) => Promise<{ success: boolean }>;
  setTimeLimit: (
    userId: string,
    subjectId: string,
    timeLimit: number
  ) => Promise<void>;
  getTimeLimit: (userId: string, subjectId: string) => Promise<number | null>;
  clearTimeLimit: (userId: string, subjectId: string) => Promise<void>;
}

export interface AdminAPI {
  authenticate: (
    username: string,
    password: string
  ) => Promise<AdminAuthResult>;
  validateSession: (token: string) => Promise<{
    valid: boolean;
    adminId?: string;
  }>;
  logout: () => Promise<void>;
  getCurrentSession: () => Promise<{
    isAuthenticated: boolean;
    admin?: RemoteAdmin;
    sessionToken?: string;
  }>;
  getDashboardStats: () => Promise<AdminDashboardStats>;
  getAllUsers: () => Promise<UserWithAttempts[]>;
  getAllSubjects: () => Promise<SubjectWithStats[]>;
  getAllQuestions: () => Promise<QuestionWithStats[]>;
  getAnalyticsData: () => Promise<AnalyticsData>;
  createAdmin: (adminData: CreateAdminData) => Promise<AdminCreationResult>;
  deleteQuizAttempts: (
    studentCode: string,
    subjectCode: string
  ) => Promise<QuizDeletionResult>;
  getStudentCredentials: () => Promise<Array<UserSeedData>>;
  // User regulation methods
  toggleAllUsersActive: (isActive: boolean) => Promise<UserToggleResult>;
  toggleUserActive: (
    studentCode: string,
    isActive: boolean
  ) => Promise<UserUpdateResult>;
  changeUserPin: (
    studentCode: string,
    newPin: string
  ) => Promise<UserUpdateResult>;
}

// Remote API Types
export interface RemoteAPI {
  bulkCreateQuestions: (
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ) => Promise<QuestionCreationResult>;
  createStudent: (
    studentData: Omit<NewUser, "createdAt" | "updatedAt">
  ) => Promise<void>;
}

export interface ElectronAPI {
  database: DatabaseAPI;
  quiz: QuizAPI;
  user: UserAPI;
  subject: SubjectAPI;
  csv: CSVAPI;
  app: AppAPI;
  sync: SyncAPI;
  seed: SeedAPI;
  auth: AuthAPI;
  admin: AdminAPI;
  remote: RemoteAPI;
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
  "Option E"?: string; // Optional for 5-option questions
  "Correct Answer": string;
  "Question Order": string;
}

export type ImagePosition = "up" | "down";

export type QuestionType = "question" | "passage" | "header" | "image";

export interface QuestionItem {
  question: Question;
  type: QuestionType;
  content: string;
  options?: string[];
  answer?: string;
  imageUrl?: string;
  imagePosition?: ImagePosition;
}

// For in app question processing
export interface ProcessedQuestionSet<T> {
  questionItems: T[];
  actualQuestions: T[];
  totalQuestions: number;
}

export type ProcessedQuizData = ProcessedQuestionSet<QuestionItem>;
export type LocalProcessedQuestion = ProcessedQuestionSet<Question>;
export type RemoteProcessedQuestion = ProcessedQuestionSet<RemoteQuestion>;

// Quiz Flow Types
export interface QuizSession {
  attemptId: string;
  questions: Question[];
  currentQuestionIndex: number;
  totalQuestions?: number;
  answers: Record<string, string>;
  isResume: boolean;
  elapsedTime?: number; // Accumulated time spent in seconds
}

// Sync Engine Types
export interface DatabaseServiceInterface {
  findUserByStudentCode(studentCode: string): Promise<User | null>;
  createUser(userData: Omit<NewUser, "createdAt" | "updatedAt">): Promise<void>;
  findSubjectByCode(subjectCode: string): Promise<Subject | null>;
  createSubject(
    subjectData: Omit<NewSubject, "createdAt" | "updatedAt">
  ): Promise<void>;
  getQuestionsForSubject(subjectId: string): Promise<Question[]>;
  createQuestion(
    questionData: Omit<NewQuestion, "createdAt" | "updatedAt">
  ): Promise<void>;
  getAllQuizAttempts(): Promise<QuizAttempt[]>;
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

export interface BaseSyncResult {
  success: boolean;
  error?: string;
  pushedRecords?: number;
  pulledRecords?: number;
  note?: string;
}

export interface QuestionSyncResult extends BaseSyncResult {
  questionsPulled?: number;
  subjectsSynced?: number;
  details?: {
    newSubjects: number;
    updatedQuestions: number;
    newQuestions: number;
    skippedQuestions: number;
    replacedSubjects: number;
  };
}

export interface UserSyncResult extends BaseSyncResult {
  usersSynced?: number;
  classesSynced?: number;
  details?: {
    newUsers: number;
    updatedUsers: number;
    skippedUsers: number;
  };
}

export type SyncResult = QuestionSyncResult | UserSyncResult;

// Admin Dashboard Types
export interface AdminDashboardStats {
  totalUsers: number;
  totalSubjects: number;
  totalQuestions: number;
  totalAttempts: number;
  onlineUsers: number;
  pendingSyncs: number;
}

export interface UserWithAttempts {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  gender: string;
  pin: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  quizAttempts: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    score: number;
    completedAt: string;
    sessionDuration: number;
    totalQuestions: number;
  }>;
}

export interface SubjectWithStats {
  id: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  attemptCount: number;
  averageScore: number;
}

export interface QuestionWithStats {
  id: string;
  subjectId: string;
  subjectName: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  correctAnswer: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  correctRate: number;
}

export interface AnalyticsData {
  quizAttemptsByDay: Array<{ date: string; attempts: number }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  subjectPerformance: Array<{
    subjectName: string;
    averageScore: number;
    totalAttempts: number;
  }>;
  topPerformers: Array<{
    studentName: string;
    studentCode: string;
    averageScore: number;
    totalAttempts: number;
  }>;
}

// Admin Creation Types
export interface CreateAdminData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  phoneNumber?: string;
  permissions?: Record<string, boolean>;
}

export interface AdminCreationResult extends ResultWithData<RemoteAdmin> {
  admin?: RemoteAdmin;
}

export type UserWithQuizAttempts = {
  id: string;
  name: string;
  studentCode: string;
  class: string;
  gender: string;
  createdAt: Date;
  updatedAt: Date;
  quizAttempts: Array<{
    id: string;
    subjectId: string;
    score: number | null;
    submittedAt: Date | null;
    sessionDuration: number | null;
    totalQuestions: number;
    subject?: {
      id: string;
      name: string;
      subjectCode: string;
    };
  }>;
};

export type SubjectWithQuestionsAndAttempts = {
  id: string;
  name: string;
  subjectCode: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: Array<{
    id: string;
    text: string;
    answer: string;
  }>;
  quizAttempts: Array<{
    id: string;
    score: number | null;
  }>;
};

// Generic types for query patterns
export interface QueryWithClause<T, H = unknown> {
  where?: (item: T, helpers: H) => boolean;
  columns?: Record<string, boolean>;
}

export interface QueryWithRelations<T, H = unknown> {
  with?: {
    [K: string]:
      | boolean
      | (QueryWithClause<T, H> & {
          with?: Record<string, boolean>;
        });
  };
}

export interface QueryWithOptions {
  users: QueryWithRelations<QuizAttempt>;
  subjects: QueryWithRelations<Question | QuizAttempt>;
}

export interface ConnectivityStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}
