"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    // Database operations (raw SQL)
    database: {
        execute: (sql, params = []) => electron_1.ipcRenderer.invoke("db:execute", sql, params),
        run: (sql, params = []) => electron_1.ipcRenderer.invoke("db:run", sql, params),
        backup: (backupPath) => electron_1.ipcRenderer.invoke("db:backup", backupPath),
        checkIntegrity: () => electron_1.ipcRenderer.invoke("db:integrity-check"),
    },
    // Quiz operations (secure)
    quiz: {
        getQuestions: (subjectId) => electron_1.ipcRenderer.invoke("quiz:get-questions", subjectId),
        getProcessedQuestions: (subjectId) => electron_1.ipcRenderer.invoke("quiz:get-processed-questions", subjectId),
        findIncompleteAttempt: (userId, subjectId) => electron_1.ipcRenderer.invoke("quiz:find-incomplete-attempt", userId, subjectId),
        hasSubmittedAttempt: (userId, subjectId) => electron_1.ipcRenderer.invoke("quiz:has-submitted-attempt", userId, subjectId),
        createAttempt: (attemptData) => electron_1.ipcRenderer.invoke("quiz:create-attempt", attemptData),
        getAttempt: (attemptId) => electron_1.ipcRenderer.invoke("quiz:get-attempt", attemptId),
        saveAnswer: (attemptId, questionId, answer) => electron_1.ipcRenderer.invoke("quiz:save-answer", attemptId, questionId, answer),
        submit: (attemptId, score, sessionDuration) => electron_1.ipcRenderer.invoke("quiz:submit", attemptId, score, sessionDuration),
        updateElapsedTime: (attemptId, elapsedTime) => electron_1.ipcRenderer.invoke("quiz:update-elapsed-time", attemptId, elapsedTime),
        bulkCreateQuestions: (questions) => electron_1.ipcRenderer.invoke("quiz:bulk-create-questions", questions),
        deleteQuizAttempts: (studentCode, subjectCode) => electron_1.ipcRenderer.invoke("quiz:delete-quiz-attempts", studentCode, subjectCode),
    },
    // User operations (secure)
    user: {
        findByStudentCode: (studentCode) => electron_1.ipcRenderer.invoke("user:find-by-student-code", studentCode),
        create: (userData) => electron_1.ipcRenderer.invoke("user:create", userData),
    },
    // Subject operations (secure)
    subject: {
        findByCode: (subjectCode) => electron_1.ipcRenderer.invoke("subject:find-by-code", subjectCode),
    },
    // CSV operations (secure)
    csv: {
        import: (csvContent) => electron_1.ipcRenderer.invoke("csv:import", csvContent),
        readFile: (filePath) => electron_1.ipcRenderer.invoke("csv:read-file", filePath),
    },
    // App information
    app: {
        getVersion: () => electron_1.ipcRenderer.invoke("app:get-version"),
        getPath: (name) => electron_1.ipcRenderer.invoke("app:get-path", name),
    },
    // Sync operations (secure)
    sync: {
        trigger: (trigger) => electron_1.ipcRenderer.invoke("sync:trigger", trigger),
        getStatus: () => electron_1.ipcRenderer.invoke("sync:get-status"),
        queueOperation: (operation) => electron_1.ipcRenderer.invoke("sync:queue-operation", operation),
        syncQuestions: (options) => electron_1.ipcRenderer.invoke("sync:sync-questions", options),
        syncUsers: (options) => electron_1.ipcRenderer.invoke("sync:sync-users", options),
        syncLocalDB: () => electron_1.ipcRenderer.invoke("sync:sync-local-db"),
        isLocalDBEmpty: () => electron_1.ipcRenderer.invoke("sync:is-local-db-empty"),
    },
    // Seed operations (secure)
    seed: {
        performAutoSeeding: () => electron_1.ipcRenderer.invoke("seed:auto-seeding"),
    },
    // Authentication operations (secure)
    auth: {
        authenticate: (studentCode, subjectCode, pin) => electron_1.ipcRenderer.invoke("auth:authenticate", studentCode, subjectCode, pin),
        validateSession: (token) => electron_1.ipcRenderer.invoke("auth:validate-session", token),
        logout: () => electron_1.ipcRenderer.invoke("auth:logout"),
        getCurrentSession: () => electron_1.ipcRenderer.invoke("auth:get-current-session"),
        storeSession: (sessionData) => electron_1.ipcRenderer.invoke("auth:store-session", sessionData),
        setTimeLimit: (userId, subjectId, timeLimit) => electron_1.ipcRenderer.invoke("auth:set-time-limit", userId, subjectId, timeLimit),
        getTimeLimit: (userId, subjectId) => electron_1.ipcRenderer.invoke("auth:get-time-limit", userId, subjectId),
        clearTimeLimit: (userId, subjectId) => electron_1.ipcRenderer.invoke("auth:clear-time-limit", userId, subjectId),
    },
    // Admin authentication operations (secure)
    admin: {
        authenticate: (username, password) => electron_1.ipcRenderer.invoke("admin:authenticate", username, password),
        validateSession: (token) => electron_1.ipcRenderer.invoke("admin:validate-session", token),
        logout: () => electron_1.ipcRenderer.invoke("admin:logout"),
        getCurrentSession: () => electron_1.ipcRenderer.invoke("admin:get-current-session"),
        storeSession: (sessionData) => electron_1.ipcRenderer.invoke("admin:store-session", sessionData),
        getDashboardStats: () => electron_1.ipcRenderer.invoke("admin:get-dashboard-stats"),
        getAllUsers: () => electron_1.ipcRenderer.invoke("admin:get-all-users"),
        getAllSubjects: () => electron_1.ipcRenderer.invoke("admin:get-all-subjects"),
        getAllQuestions: () => electron_1.ipcRenderer.invoke("admin:get-all-questions"),
        getAnalyticsData: () => electron_1.ipcRenderer.invoke("admin:get-analytics-data"),
        createAdmin: (adminData) => electron_1.ipcRenderer.invoke("admin:create-admin", adminData),
        deleteQuizAttempts: (studentCode, subjectCode) => electron_1.ipcRenderer.invoke("admin:delete-quiz-attempts", studentCode, subjectCode),
        getStudentCredentials: () => electron_1.ipcRenderer.invoke("admin:get-student-credentials"),
        // User regulation methods
        toggleAllUsersActive: (isActive) => electron_1.ipcRenderer.invoke("admin:toggle-all-users-active", isActive),
        toggleUserActive: (studentCode, isActive) => electron_1.ipcRenderer.invoke("admin:toggle-user-active", studentCode, isActive),
        changeUserPin: (studentCode, newPin) => electron_1.ipcRenderer.invoke("admin:change-user-pin", studentCode, newPin),
    },
    // Remote operations (secure)
    remote: {
        bulkCreateQuestions: (questions) => electron_1.ipcRenderer.invoke("remote:bulk-create-questions", questions),
        createStudent: (studentData) => electron_1.ipcRenderer.invoke("remote:create-student", studentData),
    },
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
