import { contextBridge, ipcRenderer } from "electron";
import type {
  NewQuizAttempt,
  NewUser,
  NewQuestion,
  SessionData,
  SyncOperationType,
  AdminSessionData,
  CreateAdminData,
} from "../src/types/app.js";
import type { SyncTrigger } from "../src/lib/sync/sync-engine.js";

const electronAPI = {
  // Database operations (raw SQL)
  database: {
    execute: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:execute", sql, params),
    run: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:run", sql, params),
    backup: (backupPath: string) => ipcRenderer.invoke("db:backup", backupPath),
    checkIntegrity: () => ipcRenderer.invoke("db:integrity-check"),
  },

  // Quiz operations (secure)
  quiz: {
    getQuestions: (subjectId: string) =>
      ipcRenderer.invoke("quiz:get-questions", subjectId),
    findIncompleteAttempt: (userId: string, subjectId: string) =>
      ipcRenderer.invoke("quiz:find-incomplete-attempt", userId, subjectId),
    hasSubmittedAttempt: (userId: string, subjectId: string) =>
      ipcRenderer.invoke("quiz:has-submitted-attempt", userId, subjectId),
    createAttempt: (
      attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt">
    ) => ipcRenderer.invoke("quiz:create-attempt", attemptData),
    getAttempt: (attemptId: string) =>
      ipcRenderer.invoke("quiz:get-attempt", attemptId),
    saveAnswer: (attemptId: string, questionId: string, answer: string) =>
      ipcRenderer.invoke("quiz:save-answer", attemptId, questionId, answer),
    submit: (attemptId: string, score: number, sessionDuration: number) =>
      ipcRenderer.invoke("quiz:submit", attemptId, score, sessionDuration),
    updateElapsedTime: (attemptId: string, elapsedTime: number) =>
      ipcRenderer.invoke("quiz:update-elapsed-time", attemptId, elapsedTime),
    bulkCreateQuestions: (
      questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
    ) => ipcRenderer.invoke("quiz:bulk-create-questions", questions),
    deleteQuizAttempts: (studentCode: string, subjectCode: string) =>
      ipcRenderer.invoke("quiz:delete-quiz-attempts", studentCode, subjectCode),
  },

  // User operations (secure)
  user: {
    findByStudentCode: (studentCode: string) =>
      ipcRenderer.invoke("user:find-by-student-code", studentCode),
    create: (userData: Omit<NewUser, "createdAt" | "updatedAt">) =>
      ipcRenderer.invoke("user:create", userData),
  },

  // Subject operations (secure)
  subject: {
    findByCode: (subjectCode: string) =>
      ipcRenderer.invoke("subject:find-by-code", subjectCode),
  },

  // CSV operations (secure)
  csv: {
    import: (csvContent: string) =>
      ipcRenderer.invoke("csv:import", csvContent),
    readFile: (filePath: string) =>
      ipcRenderer.invoke("csv:read-file", filePath),
  },

  // App information
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPath: (name: string) => ipcRenderer.invoke("app:get-path", name),
  },

  // Sync operations (secure)
  sync: {
    trigger: (trigger?: SyncTrigger) =>
      ipcRenderer.invoke("sync:trigger", trigger),
    getStatus: () => ipcRenderer.invoke("sync:get-status"),
    queueOperation: <T = Record<string, unknown>>(operation: {
      type: SyncOperationType;
      tableName: string;
      recordId: string;
      data: T;
    }) => ipcRenderer.invoke("sync:queue-operation", operation),
    syncQuestions: (options?: {
      replaceExisting?: boolean;
      subjectCodes?: string[];
    }) => ipcRenderer.invoke("sync:sync-questions", options),
    syncUsers: (options?: { replaceExisting?: boolean }) =>
      ipcRenderer.invoke("sync:sync-users", options),
    syncLocalDB: () => ipcRenderer.invoke("sync:sync-local-db"),
    isLocalDBEmpty: () => ipcRenderer.invoke("sync:is-local-db-empty"),
  },

  // Seed operations (secure)
  seed: {
    performAutoSeeding: () => ipcRenderer.invoke("seed:auto-seeding"),
  },

  // Authentication operations (secure)
  auth: {
    authenticate: (studentCode: string, subjectCode: string, pin: string) =>
      ipcRenderer.invoke("auth:authenticate", studentCode, subjectCode, pin),
    validateSession: (token: string) =>
      ipcRenderer.invoke("auth:validate-session", token),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getCurrentSession: () => ipcRenderer.invoke("auth:get-current-session"),
    storeSession: (sessionData: SessionData) =>
      ipcRenderer.invoke("auth:store-session", sessionData),
    setTimeLimit: (userId: string, subjectId: string, timeLimit: number) =>
      ipcRenderer.invoke("auth:set-time-limit", userId, subjectId, timeLimit),
    getTimeLimit: (userId: string, subjectId: string) =>
      ipcRenderer.invoke("auth:get-time-limit", userId, subjectId),
    clearTimeLimit: (userId: string, subjectId: string) =>
      ipcRenderer.invoke("auth:clear-time-limit", userId, subjectId),
  },

  // Admin authentication operations (secure)
  admin: {
    authenticate: (username: string, password: string) =>
      ipcRenderer.invoke("admin:authenticate", username, password),
    validateSession: (token: string) =>
      ipcRenderer.invoke("admin:validate-session", token),
    logout: () => ipcRenderer.invoke("admin:logout"),
    getCurrentSession: () => ipcRenderer.invoke("admin:get-current-session"),
    storeSession: (sessionData: AdminSessionData) =>
      ipcRenderer.invoke("admin:store-session", sessionData),
    getDashboardStats: () => ipcRenderer.invoke("admin:get-dashboard-stats"),
    getAllUsers: () => ipcRenderer.invoke("admin:get-all-users"),
    getAllSubjects: () => ipcRenderer.invoke("admin:get-all-subjects"),
    getAllQuestions: () => ipcRenderer.invoke("admin:get-all-questions"),
    getAnalyticsData: () => ipcRenderer.invoke("admin:get-analytics-data"),
    createAdmin: (adminData: CreateAdminData) =>
      ipcRenderer.invoke("admin:create-admin", adminData),
    deleteQuizAttempts: (studentCode: string, subjectCode: string) =>
      ipcRenderer.invoke(
        "admin:delete-quiz-attempts",
        studentCode,
        subjectCode
      ),
    getStudentCredentials: () =>
      ipcRenderer.invoke("admin:get-student-credentials"),
    // User regulation methods
    toggleAllUsersActive: (isActive: boolean) =>
      ipcRenderer.invoke("admin:toggle-all-users-active", isActive),
    toggleUserActive: (studentCode: string, isActive: boolean) =>
      ipcRenderer.invoke("admin:toggle-user-active", studentCode, isActive),
    changeUserPin: (studentCode: string, newPin: string) =>
      ipcRenderer.invoke("admin:change-user-pin", studentCode, newPin),
  },

  // Remote operations (secure)
  remote: {
    bulkCreateQuestions: (
      questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
    ) => ipcRenderer.invoke("remote:bulk-create-questions", questions),
    createStudent: (studentData: Omit<NewUser, "createdAt" | "updatedAt">) =>
      ipcRenderer.invoke("remote:create-student", studentData),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
