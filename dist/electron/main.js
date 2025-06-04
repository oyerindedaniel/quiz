"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const electron_store_1 = __importDefault(require("electron-store"));
const fs_1 = require("fs");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const database_service_js_1 = require("./services/database-service.js");
const auto_seeding_service_js_1 = require("../src/lib/seeding/auto-seeding-service.js");
const isDev = process.env.NODE_ENV === "development" || !electron_1.app.isPackaged;
console.log({
    isDev,
    nodeEnv: process.env.NODE_ENV,
    isPackaged: electron_1.app.isPackaged,
    __dirname,
});
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log("Another instance is already running. Exiting...");
    electron_1.app.quit();
}
else {
    console.log("Single instance lock acquired successfully");
}
// interface AppStoreSchema {
//   currentSession: SessionData | null;
//   settings: {
//     autoBackup: boolean;
//   };
//   [key: string]: unknown;
// }
class QuizApp {
    constructor() {
        this.mainWindow = null;
        // private store: Store<AppStoreSchema>;
        this.isQuitting = false;
        this.dbService = new database_service_js_1.MainDatabaseService();
        this.store = new electron_store_1.default({
            name: "quiz-app-session",
            defaults: {
                currentSession: null,
                settings: {
                    autoBackup: true,
                },
            },
        });
        // Handle second instance
        electron_1.app.on("second-instance", () => {
            console.log("Second instance detected, focusing existing window...");
            this.focusMainWindow();
        });
        this.init();
    }
    focusMainWindow() {
        // Someone tried to run a second instance, focus our window instead
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.focus();
            this.mainWindow.show();
        }
    }
    async init() {
        // Register custom protocol before app ready
        electron_1.protocol.registerSchemesAsPrivileged([
            {
                scheme: "app",
                privileges: {
                    secure: true,
                    standard: true,
                    supportFetchAPI: true,
                    corsEnabled: true,
                },
            },
        ]);
        await electron_1.app.whenReady();
        this.registerAppProtocol();
        try {
            await this.dbService.initialize();
            console.log("Main database service initialized successfully");
        }
        catch (error) {
            console.error("Failed to initialize database service:", error);
        }
        await this.createWindow();
        this.setupIPC();
        this.setupAppEvents();
    }
    registerAppProtocol() {
        electron_1.protocol.handle("app", (request) => {
            const url = new URL(request.url);
            const pathname = url.pathname;
            const staticPath = (0, path_1.join)(__dirname, "../out");
            // Handle root path
            let filePath = pathname === "/" ? "index.html" : pathname.slice(1);
            // Security: prevent directory traversal
            if (filePath.includes("..")) {
                return new Response("Not Found", { status: 404 });
            }
            const fullPath = (0, path_1.join)(staticPath, filePath);
            try {
                // Check if file exists
                if (!(0, fs_1.existsSync)(fullPath)) {
                    // For SPA routing, fallback to index.html
                    const indexPath = (0, path_1.join)(staticPath, "index.html");
                    if ((0, fs_1.existsSync)(indexPath)) {
                        return new Response(require("fs").readFileSync(indexPath), {
                            headers: { "content-type": "text/html" },
                        });
                    }
                    else {
                        return new Response("Not Found", { status: 404 });
                    }
                }
                // Determine content type based on file extension
                const ext = filePath.split(".").pop()?.toLowerCase();
                let contentType = "text/plain";
                switch (ext) {
                    case "html":
                        contentType = "text/html";
                        break;
                    case "css":
                        contentType = "text/css";
                        break;
                    case "js":
                        contentType = "application/javascript";
                        break;
                    case "json":
                        contentType = "application/json";
                        break;
                    case "png":
                        contentType = "image/png";
                        break;
                    case "jpg":
                    case "jpeg":
                        contentType = "image/jpeg";
                        break;
                    case "svg":
                        contentType = "image/svg+xml";
                        break;
                    case "ico":
                        contentType = "image/x-icon";
                        break;
                }
                return new Response(require("fs").readFileSync(fullPath), {
                    headers: { "content-type": contentType },
                });
            }
            catch (error) {
                console.error("Error serving file:", error);
                return new Response("Internal Server Error", { status: 500 });
            }
        });
        console.log("App protocol registered successfully");
    }
    /**
     * Validate admin authentication for secure operations
     */
    async validateAdminAuth() {
        try {
            const mainSession = electron_1.session.defaultSession;
            const cookieUrl = isDev ? "http://localhost:3000" : "app://localhost";
            const sessionCookie = await mainSession.cookies.get({
                url: cookieUrl,
                name: "admin_session",
            });
            if (sessionCookie.length === 0) {
                return { valid: false };
            }
            const sessionToken = sessionCookie[0].value;
            const validation = await this.dbService.validateAdminSession(sessionToken);
            if (!validation.valid) {
                await mainSession.cookies.remove(cookieUrl, "admin_session");
                await mainSession.cookies.remove(cookieUrl, "admin_user");
                return { valid: false };
            }
            return { valid: true, adminId: validation.adminId };
        }
        catch (error) {
            console.error("Admin authentication validation error:", error);
            return { valid: false };
        }
    }
    async createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            show: false,
            autoHideMenuBar: true,
            webPreferences: {
                zoomFactor: 1.0,
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, "preload.js"),
            },
        });
        if (isDev) {
            // Development mode - connect to Next.js dev server
            const devUrl = "http://localhost:3000";
            console.log(`Loading development URL: ${devUrl}`);
            this.mainWindow.loadURL(devUrl);
            this.mainWindow.webContents.openDevTools();
        }
        else {
            // Production mode - custom protocol
            const prodUrl = "app://localhost/";
            console.log(`Loading production URL: ${prodUrl}`);
            this.mainWindow.loadURL(prodUrl);
        }
        // Show window when ready
        this.mainWindow.once("ready-to-show", () => {
            this.mainWindow?.show();
            console.log("Electron window shown");
        });
        // Handle window close with confirmation dialog
        this.mainWindow.on("close", async (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                await this.handleWindowClose();
            }
        });
        // Handle window closed
        this.mainWindow.on("closed", () => {
            this.mainWindow = null;
        });
        // Handle navigation errors
        this.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
            console.error(`Failed to load URL: ${validatedURL}`, {
                errorCode,
                errorDescription,
            });
        });
    }
    async handleWindowClose() {
        if (!this.mainWindow)
            return;
        try {
            const response = await electron_1.dialog.showMessageBox(this.mainWindow, {
                type: "question",
                buttons: ["Quit", "Cancel"],
                defaultId: 1, // Default to Cancel
                cancelId: 1, // Cancel button index
                title: "Confirm Quit",
                message: "Are you sure you want to quit?",
                detail: "Any unsaved progress will be lost. The app will also perform a final sync before closing.",
                noLink: true,
            });
            if (response.response === 0) {
                console.log("User confirmed quit, starting cleanup...");
                this.isQuitting = true;
                try {
                    // Perform cleanup and final sync
                    await this.cleanup();
                    console.log("Cleanup completed, quitting app...");
                    electron_1.app.quit();
                }
                catch (error) {
                    console.error("Cleanup failed during quit:", error);
                    // Still quit even if cleanup fails
                    electron_1.app.quit();
                }
            }
            else {
                console.log("User cancelled quit operation");
                // User clicked "Cancel" or closed dialog, do nothing
            }
        }
        catch (error) {
            console.error("Error showing quit confirmation dialog:", error);
            // If dialog fails, allow normal quit
            this.isQuitting = true;
            electron_1.app.quit();
        }
    }
    setupIPC() {
        // Raw database operations
        electron_1.ipcMain.handle("db:execute", async (_, sql, params) => {
            try {
                return await this.dbService.executeRawSQL(sql, params);
            }
            catch (error) {
                console.error("Database execute error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("db:run", async (_, sql, params) => {
            try {
                return await this.dbService.runRawSQL(sql, params);
            }
            catch (error) {
                console.error("Database run error:", error);
                throw error;
            }
        });
        // Database management operations
        electron_1.ipcMain.handle("db:backup", async (_, backupPath) => {
            try {
                return await this.dbService.backupDatabase(backupPath);
            }
            catch (error) {
                console.error("Database backup error:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });
        electron_1.ipcMain.handle("db:integrity-check", async () => {
            try {
                return await this.dbService.checkIntegrity();
            }
            catch (error) {
                console.error("Database integrity check error:", error);
                return false;
            }
        });
        // Quiz operations via centralized database service
        electron_1.ipcMain.handle("quiz:get-questions", async (_, subjectId) => {
            try {
                return await this.dbService.getQuestionsForSubject(subjectId);
            }
            catch (error) {
                console.error("Get questions error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:find-incomplete-attempt", async (_, userId, subjectId) => {
            try {
                return await this.dbService.findIncompleteAttempt(userId, subjectId);
            }
            catch (error) {
                console.error("Find incomplete attempt error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:create-attempt", async (_, attemptData) => {
            try {
                return await this.dbService.createQuizAttempt(attemptData);
            }
            catch (error) {
                console.error("Create quiz attempt error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:get-attempt", async (_, attemptId) => {
            try {
                return await this.dbService.getQuizAttempt(attemptId);
            }
            catch (error) {
                console.error("Get quiz attempt error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:save-answer", async (_, attemptId, questionId, answer) => {
            try {
                return await this.dbService.updateQuizAnswer(attemptId, questionId, answer);
            }
            catch (error) {
                console.error("Save answer error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:submit", async (_, attemptId, score, sessionDuration) => {
            try {
                return await this.dbService.submitQuiz(attemptId, score, sessionDuration);
            }
            catch (error) {
                console.error("Submit quiz error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:update-elapsed-time", async (_, attemptId, elapsedTime) => {
            try {
                return await this.dbService.updateElapsedTime(attemptId, elapsedTime);
            }
            catch (error) {
                console.error("Update elapsed time error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("quiz:bulk-create-questions", async (_, questions) => {
            try {
                return await this.dbService.bulkCreateQuestions(questions);
            }
            catch (error) {
                console.error("Bulk create questions error:", error);
                return {
                    success: false,
                    created: 0,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });
        electron_1.ipcMain.handle("quiz:delete-quiz-attempts", async (_, studentCode, subjectCode) => {
            try {
                return await this.dbService.deleteLocalQuizAttempts(studentCode, subjectCode);
            }
            catch (error) {
                console.error("Delete local quiz attempts error:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });
        // Remote operations
        electron_1.ipcMain.handle("remote:bulk-create-questions", async (_, questions) => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.remoteBulkCreateQuestions(questions);
            }
            catch (error) {
                console.error("Remote bulk create questions error:", error);
                if (error instanceof Error &&
                    error.message.includes("Unauthorized")) {
                    throw error;
                }
                return {
                    success: false,
                    created: 0,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });
        // User operations
        electron_1.ipcMain.handle("user:find-by-student-code", async (_, studentCode) => {
            try {
                return await this.dbService.findUserByStudentCode(studentCode);
            }
            catch (error) {
                console.error("Find user error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("user:create", async (_, userData) => {
            try {
                return await this.dbService.createUser(userData);
            }
            catch (error) {
                console.error("Create user error:", error);
                throw error;
            }
        });
        // Subject operations
        electron_1.ipcMain.handle("subject:find-by-code", async (_, subjectCode) => {
            try {
                return await this.dbService.findSubjectByCode(subjectCode);
            }
            catch (error) {
                console.error("Find subject error:", error);
                throw error;
            }
        });
        // CSV Import operations
        electron_1.ipcMain.handle("csv:import", async (_, csvContent) => {
            try {
                return await this.dbService.importCSVQuestions(csvContent);
            }
            catch (error) {
                console.error("CSV import error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("csv:read-file", async (_, filePath) => {
            try {
                const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
                return await fs.readFile(filePath, "utf-8");
            }
            catch (error) {
                console.error("Read CSV file error:", error);
                throw error;
            }
        });
        // App information
        electron_1.ipcMain.handle("app:get-version", () => {
            return electron_1.app.getVersion();
        });
        electron_1.ipcMain.handle("app:get-path", (_, name) => {
            try {
                return electron_1.app.getPath(name);
            }
            catch (error) {
                console.error("Get app path error:", error);
                return null;
            }
        });
        // Sync operations
        electron_1.ipcMain.handle("sync:trigger", async (_, trigger) => {
            try {
                return await this.dbService.triggerSync(trigger || "manual");
            }
            catch (error) {
                console.error("Trigger sync error:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });
        electron_1.ipcMain.handle("sync:get-status", async () => {
            try {
                return await this.dbService.getSyncStatus();
            }
            catch (error) {
                console.error("Get sync status error:", error);
                return {
                    lastSyncTimestamp: null,
                    isOnline: false,
                    localChanges: 0,
                    remoteChanges: 0,
                    syncInProgress: false,
                };
            }
        });
        electron_1.ipcMain.handle("sync:queue-operation", async (_, operation) => {
            try {
                return await this.dbService.queueSyncOperation(operation);
            }
            catch (error) {
                console.error("Queue sync operation error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("sync:sync-questions", async (_, options) => {
            try {
                return await this.dbService.syncQuestions(options);
            }
            catch (error) {
                console.error("Sync questions error:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown sync error",
                };
            }
        });
        // Seed operations
        electron_1.ipcMain.handle("seed:auto-seeding", async () => {
            try {
                return await auto_seeding_service_js_1.AutoSeedingService.performAutoSeeding();
            }
            catch (error) {
                console.error("Auto seeding error:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                    totalRecords: 0,
                };
            }
        });
        // Admin Authentication operations
        electron_1.ipcMain.handle("admin:create-admin", async (_, adminData) => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.createAdmin(adminData);
            }
            catch (error) {
                console.error("Create admin error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to create admin",
                };
            }
        });
        electron_1.ipcMain.handle("admin:authenticate", async (_, username, password) => {
            try {
                const result = await this.dbService.authenticateAdmin(username, password);
                if (result.success && result.sessionToken && result.admin) {
                    const mainSession = electron_1.session.defaultSession;
                    const cookieUrl = isDev
                        ? "http://localhost:3000"
                        : "app://localhost";
                    await mainSession.cookies.set({
                        url: cookieUrl,
                        name: "admin_session",
                        value: result.sessionToken,
                        secure: !isDev,
                        httpOnly: true,
                        sameSite: "strict",
                        expirationDate: Math.floor(Date.now() / 1000) + 86400, // 24 hours
                    });
                    await mainSession.cookies.set({
                        url: cookieUrl,
                        name: "admin_user",
                        value: JSON.stringify({
                            id: result.admin.id,
                            username: result.admin.username,
                            email: result.admin.email,
                            role: result.admin.role,
                            firstName: result.admin.firstName,
                            lastName: result.admin.lastName,
                        }),
                        secure: !isDev,
                        httpOnly: true,
                        sameSite: "strict",
                        expirationDate: Math.floor(Date.now() / 1000) + 86400,
                    });
                }
                return result;
            }
            catch (error) {
                console.error("Admin authentication error:", error);
                return {
                    success: false,
                    error: "Admin authentication failed. Please try again.",
                };
            }
        });
        electron_1.ipcMain.handle("admin:validate-session", async (_, token) => {
            try {
                return await this.dbService.validateAdminSession(token);
            }
            catch (error) {
                console.error("Admin session validation error:", error);
                return { valid: false };
            }
        });
        electron_1.ipcMain.handle("admin:logout", async () => {
            try {
                const mainSession = electron_1.session.defaultSession;
                const cookieUrl = isDev ? "http://localhost:3000" : "app://localhost";
                await mainSession.cookies.remove(cookieUrl, "admin_session");
                await mainSession.cookies.remove(cookieUrl, "admin_user");
                console.log("Admin logged out successfully");
                return { success: true };
            }
            catch (error) {
                console.error("Admin logout error:", error);
                return { success: false, error: "Failed to logout" };
            }
        });
        electron_1.ipcMain.handle("admin:get-current-session", async () => {
            try {
                const mainSession = electron_1.session.defaultSession;
                const cookieUrl = isDev ? "http://localhost:3000" : "app://localhost";
                const sessionCookie = await mainSession.cookies.get({
                    url: cookieUrl,
                    name: "admin_session",
                });
                const userCookie = await mainSession.cookies.get({
                    url: cookieUrl,
                    name: "admin_user",
                });
                if (sessionCookie.length === 0 || userCookie.length === 0) {
                    return { isAuthenticated: false };
                }
                const sessionToken = sessionCookie[0].value;
                const userData = JSON.parse(userCookie[0].value);
                const validation = await this.dbService.validateAdminSession(sessionToken);
                if (!validation.valid) {
                    await mainSession.cookies.remove(cookieUrl, "admin_session");
                    await mainSession.cookies.remove(cookieUrl, "admin_user");
                    return { isAuthenticated: false };
                }
                return {
                    isAuthenticated: true,
                    admin: userData,
                    sessionToken: sessionToken,
                };
            }
            catch (error) {
                console.error("Get current admin session error:", error);
                return { isAuthenticated: false };
            }
        });
        // Admin dashboard operations
        electron_1.ipcMain.handle("admin:get-dashboard-stats", async () => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.getAdminDashboardStats();
            }
            catch (error) {
                console.error("Get admin dashboard stats error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return {
                    totalUsers: 0,
                    totalSubjects: 0,
                    totalQuestions: 0,
                    totalAttempts: 0,
                    onlineUsers: 0,
                    pendingSyncs: 0,
                };
            }
        });
        electron_1.ipcMain.handle("admin:get-all-users", async () => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.getAllUsersWithAttempts();
            }
            catch (error) {
                console.error("Get all users error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return [];
            }
        });
        electron_1.ipcMain.handle("admin:get-all-subjects", async () => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.getAllSubjectsWithStats();
            }
            catch (error) {
                console.error("Get all subjects error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return [];
            }
        });
        electron_1.ipcMain.handle("admin:get-all-questions", async () => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.getAllQuestionsWithStats();
            }
            catch (error) {
                console.error("Get all questions error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return [];
            }
        });
        electron_1.ipcMain.handle("admin:get-analytics-data", async () => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.getAnalyticsData();
            }
            catch (error) {
                console.error("Get analytics data error:", error);
                if (error instanceof Error && error.message.includes("Unauthorized")) {
                    throw error;
                }
                return {
                    quizAttemptsByDay: [],
                    scoreDistribution: [],
                    subjectPerformance: [],
                    topPerformers: [],
                };
            }
        });
        electron_1.ipcMain.handle("admin:delete-quiz-attempts", async (_, studentCode, subjectCode) => {
            try {
                const authCheck = await this.validateAdminAuth();
                if (!authCheck.valid) {
                    throw new Error("Unauthorized: Admin authentication required");
                }
                return await this.dbService.deleteQuizAttempts(studentCode, subjectCode);
            }
            catch (error) {
                console.error("Delete quiz attempts error:", error);
                if (error instanceof Error &&
                    error.message.includes("Unauthorized")) {
                    throw error;
                }
                return {
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : "Failed to delete quiz attempts",
                };
            }
        });
        // Authentication operations
        electron_1.ipcMain.handle("auth:authenticate", async (_, studentCode, subjectCode, pin) => {
            try {
                const result = await this.dbService.authenticate(studentCode, subjectCode, pin);
                if (result.success && result.sessionToken) {
                    this.store.set("currentSession", {
                        user: result.user,
                        subject: result.subject,
                        sessionToken: result.sessionToken,
                        authenticatedAt: new Date().toISOString(),
                    });
                }
                return result;
            }
            catch (error) {
                console.error("Authentication error:", error);
                return {
                    success: false,
                    error: "Authentication failed. Please try again.",
                };
            }
        });
        electron_1.ipcMain.handle("auth:validate-session", async (_, token) => {
            try {
                return await this.dbService.validateSession(token);
            }
            catch (error) {
                console.error("Session validation error:", error);
                return { valid: false };
            }
        });
        electron_1.ipcMain.handle("auth:logout", async () => {
            try {
                this.store.delete("currentSession");
                console.log("User logged out successfully");
                return { success: true };
            }
            catch (error) {
                console.error("Logout error:", error);
                return { success: false, error: "Failed to logout" };
            }
        });
        electron_1.ipcMain.handle("auth:get-current-session", async () => {
            try {
                const session = this.store.get("currentSession");
                if (!session) {
                    return { isAuthenticated: false };
                }
                const validation = await this.dbService.validateSession(session.sessionToken);
                if (!validation.valid) {
                    this.store.delete("currentSession");
                    return { isAuthenticated: false };
                }
                return {
                    isAuthenticated: true,
                    ...session,
                };
            }
            catch (error) {
                console.error("Get current session error:", error);
                return { isAuthenticated: false };
            }
        });
        // Session management helper
        electron_1.ipcMain.handle("auth:store-session", async (_, sessionData) => {
            try {
                this.store.set("currentSession", sessionData);
                return { success: true };
            }
            catch (error) {
                console.error("Store session error:", error);
                return { success: false };
            }
        });
        // Time Limit management
        electron_1.ipcMain.handle("auth:set-time-limit", async (_, userId, subjectId, timeLimit) => {
            try {
                const key = `timeLimit:${userId}:${subjectId}`;
                this.store.set(key, timeLimit);
                console.log("Time limit set:", { userId, subjectId, timeLimit });
                return { success: true };
            }
            catch (error) {
                console.error("Set time limit error:", error);
                throw error;
            }
        });
        electron_1.ipcMain.handle("auth:get-time-limit", async (_, userId, subjectId) => {
            try {
                const key = `timeLimit:${userId}:${subjectId}`;
                const timeLimit = this.store.get(key);
                return timeLimit || null;
            }
            catch (error) {
                console.error("Get time limit error:", error);
                return null;
            }
        });
        electron_1.ipcMain.handle("auth:clear-time-limit", async (_, userId, subjectId) => {
            try {
                const key = `timeLimit:${userId}:${subjectId}`;
                this.store.delete(key);
                console.log("Time limit cleared:", { userId, subjectId });
                return { success: true };
            }
            catch (error) {
                console.error("Clear time limit error:", error);
                throw error;
            }
        });
    }
    setupAppEvents() {
        // Handle window creation on macOS
        electron_1.app.on("activate", () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
        // Handle app quit
        electron_1.app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                // On non-macOS platforms, quit when all windows are closed
                this.isQuitting = true;
                this.cleanup();
                electron_1.app.quit();
            }
        });
        // Handle before quit - only perform cleanup if not already quitting
        electron_1.app.on("before-quit", async (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                try {
                    console.log("App is quitting, performing final cleanup...");
                    await this.cleanup();
                    this.isQuitting = true;
                    electron_1.app.quit();
                }
                catch (error) {
                    console.error("Cleanup failed during quit:", error);
                    this.isQuitting = true;
                    electron_1.app.quit();
                }
            }
        });
        // Handle app will quit
        electron_1.app.on("will-quit", (event) => {
            if (!this.isQuitting) {
                console.log("App will quit event triggered");
            }
        });
    }
    async cleanup() {
        console.log("QuizApp: Starting application cleanup...");
        try {
            await this.dbService.triggerSync("app_close");
            await this.dbService.cleanup();
            console.log("QuizApp: Application cleanup completed successfully");
        }
        catch (error) {
            console.error("QuizApp: Application cleanup failed:", error);
            throw error;
        }
    }
}
// Only create the app if we got the single instance lock
if (gotTheLock) {
    new QuizApp();
}
