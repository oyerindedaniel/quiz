import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // Database operations (raw SQL - legacy)
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
    createAttempt: (attemptData: any) =>
      ipcRenderer.invoke("quiz:create-attempt", attemptData),
    getAttempt: (attemptId: string) =>
      ipcRenderer.invoke("quiz:get-attempt", attemptId),
    saveAnswer: (attemptId: string, questionId: string, answer: string) =>
      ipcRenderer.invoke("quiz:save-answer", attemptId, questionId, answer),
    submit: (attemptId: string, score: number, sessionDuration: number) =>
      ipcRenderer.invoke("quiz:submit", attemptId, score, sessionDuration),
  },

  // User operations (secure)
  user: {
    findByStudentCode: (studentCode: string) =>
      ipcRenderer.invoke("user:find-by-student-code", studentCode),
    create: (userData: any) => ipcRenderer.invoke("user:create", userData),
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
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
