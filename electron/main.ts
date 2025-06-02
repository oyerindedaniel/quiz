import { app, BrowserWindow, ipcMain } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sqliteManager } from "../src/lib/database/sqlite.js";

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

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await app.whenReady();

    try {
      await sqliteManager.initialize();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
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
    // Database operations
    ipcMain.handle("db:execute", async (_, sql: string, params: unknown[]) => {
      try {
        return sqliteManager.executeRawSQL(sql, params);
      } catch (error) {
        console.error("Database execute error:", error);
        throw error;
      }
    });

    ipcMain.handle("db:run", async (_, sql: string, params: unknown[]) => {
      try {
        return sqliteManager.runRawSQL(sql, params);
      } catch (error) {
        console.error("Database run error:", error);
        throw error;
      }
    });

    // Database management
    ipcMain.handle("db:backup", async (_, backupPath: string) => {
      try {
        sqliteManager.backup(backupPath);
        return { success: true };
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
        return sqliteManager.checkIntegrity();
      } catch (error) {
        console.error("Database integrity check error:", error);
        return false;
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

    // Handle before quit
    app.on("before-quit", () => {
      this.cleanup();
    });
  }

  private cleanup(): void {
    // Close database connection
    sqliteManager.close();
    // Note: If we add NeonDB cleanup later, it should be handled async in before-quit
    console.log("Application cleanup completed");
  }
}

new QuizApp();
