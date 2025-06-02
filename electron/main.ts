import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MainDatabaseService } from "./services/database-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

console.log({
  isDev,
  nodeEnv: process.env.NODE_ENV,
  isPackaged: app.isPackaged,
  __dirname,
});

class QuizApp {
  private mainWindow: BrowserWindow | null = null;
  private dbService: MainDatabaseService;

  constructor() {
    this.dbService = new MainDatabaseService();
    this.init();
  }

  private async init(): Promise<void> {
    await app.whenReady();

    try {
      await this.dbService.initialize();
      console.log("Main database service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database service:", error);
    }

    this.createWindow();
    this.setupIPC();
    this.setupAppEvents();
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, "preload.js"),
      },
    });

    if (isDev) {
      // Development mode - connect to Next.js dev server
      const devUrl = "http://localhost:3000";
      console.log(`Loading development URL: ${devUrl}`);
      this.mainWindow.loadURL(devUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production mode - load static files
      const indexPath = join(__dirname, "../out/index.html");
      console.log(`Loading production file: ${indexPath}`);
      this.mainWindow.loadFile(indexPath);
    }

    // Show window when ready
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
      console.log("Electron window shown");
    });

    // Handle window closed
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Handle navigation errors
    this.mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load URL: ${validatedURL}`, {
          errorCode,
          errorDescription,
        });
      }
    );
  }

  private setupIPC(): void {
    // Raw database operations (legacy support)
    ipcMain.handle("db:execute", async (_, sql: string, params: unknown[]) => {
      try {
        return await this.dbService.executeRawSQL(sql, params);
      } catch (error) {
        console.error("Database execute error:", error);
        throw error;
      }
    });

    ipcMain.handle("db:run", async (_, sql: string, params: unknown[]) => {
      try {
        return await this.dbService.runRawSQL(sql, params);
      } catch (error) {
        console.error("Database run error:", error);
        throw error;
      }
    });

    // Database management operations
    ipcMain.handle("db:backup", async (_, backupPath: string) => {
      try {
        return await this.dbService.backupDatabase(backupPath);
      } catch (error) {
        console.error("Database backup error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("db:integrity-check", async () => {
      try {
        return await this.dbService.checkIntegrity();
      } catch (error) {
        console.error("Database integrity check error:", error);
        return false;
      }
    });

    // Quiz operations via centralized database service
    ipcMain.handle("quiz:get-questions", async (_, subjectId: string) => {
      try {
        return await this.dbService.getQuestionsForSubject(subjectId);
      } catch (error) {
        console.error("Get questions error:", error);
        throw error;
      }
    });

    ipcMain.handle(
      "quiz:find-incomplete-attempt",
      async (_, userId: string, subjectId: string) => {
        try {
          return await this.dbService.findIncompleteAttempt(userId, subjectId);
        } catch (error) {
          console.error("Find incomplete attempt error:", error);
          throw error;
        }
      }
    );

    ipcMain.handle("quiz:create-attempt", async (_, attemptData: any) => {
      try {
        return await this.dbService.createQuizAttempt(attemptData);
      } catch (error) {
        console.error("Create quiz attempt error:", error);
        throw error;
      }
    });

    ipcMain.handle("quiz:get-attempt", async (_, attemptId: string) => {
      try {
        return await this.dbService.getQuizAttempt(attemptId);
      } catch (error) {
        console.error("Get quiz attempt error:", error);
        throw error;
      }
    });

    ipcMain.handle(
      "quiz:save-answer",
      async (_, attemptId: string, questionId: string, answer: string) => {
        try {
          return await this.dbService.updateQuizAnswer(
            attemptId,
            questionId,
            answer
          );
        } catch (error) {
          console.error("Save answer error:", error);
          throw error;
        }
      }
    );

    ipcMain.handle(
      "quiz:submit",
      async (_, attemptId: string, score: number, sessionDuration: number) => {
        try {
          return await this.dbService.submitQuiz(
            attemptId,
            score,
            sessionDuration
          );
        } catch (error) {
          console.error("Submit quiz error:", error);
          throw error;
        }
      }
    );

    // User operations
    ipcMain.handle(
      "user:find-by-student-code",
      async (_, studentCode: string) => {
        try {
          return await this.dbService.findUserByStudentCode(studentCode);
        } catch (error) {
          console.error("Find user error:", error);
          throw error;
        }
      }
    );

    ipcMain.handle("user:create", async (_, userData: any) => {
      try {
        return await this.dbService.createUser(userData);
      } catch (error) {
        console.error("Create user error:", error);
        throw error;
      }
    });

    // Subject operations
    ipcMain.handle("subject:find-by-code", async (_, subjectCode: string) => {
      try {
        return await this.dbService.findSubjectByCode(subjectCode);
      } catch (error) {
        console.error("Find subject error:", error);
        throw error;
      }
    });

    // CSV Import operations
    ipcMain.handle("csv:import", async (_, csvContent: string) => {
      try {
        return await this.dbService.importCSVQuestions(csvContent);
      } catch (error) {
        console.error("CSV import error:", error);
        throw error;
      }
    });

    ipcMain.handle("csv:read-file", async (_, filePath: string) => {
      try {
        const fs = await import("fs/promises");
        return await fs.readFile(filePath, "utf-8");
      } catch (error) {
        console.error("Read CSV file error:", error);
        throw error;
      }
    });

    // App information
    ipcMain.handle("app:get-version", () => {
      return app.getVersion();
    });

    ipcMain.handle("app:get-path", (_, name: string) => {
      try {
        return app.getPath(name as any);
      } catch (error) {
        console.error("Get app path error:", error);
        return null;
      }
    });

    // Sync operations
    ipcMain.handle("sync:trigger", async (_, trigger?: string) => {
      try {
        return await this.dbService.triggerSync(trigger as any);
      } catch (error) {
        console.error("Trigger sync error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    ipcMain.handle("sync:get-status", async () => {
      try {
        return await this.dbService.getSyncStatus();
      } catch (error) {
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

    ipcMain.handle("sync:queue-operation", async (_, operation: any) => {
      try {
        return await this.dbService.queueSyncOperation(operation);
      } catch (error) {
        console.error("Queue sync operation error:", error);
        throw error;
      }
    });
  }

  private setupAppEvents(): void {
    // Handle window creation on macOS
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle app quit
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        this.cleanup();
        app.quit();
      }
    });

    // Handle before quit - properly cleanup database connections
    app.on("before-quit", async (event) => {
      try {
        event.preventDefault();
        await this.cleanup();
        app.quit();
      } catch (error) {
        console.error("Cleanup failed during quit:", error);
        app.quit();
      }
    });
  }

  private async cleanup(): Promise<void> {
    console.log("QuizApp: Starting application cleanup...");
    try {
      await this.dbService.cleanup();
      console.log("QuizApp: Application cleanup completed successfully");
    } catch (error) {
      console.error("QuizApp: Application cleanup failed:", error);
      throw error;
    }
  }
}

new QuizApp();
