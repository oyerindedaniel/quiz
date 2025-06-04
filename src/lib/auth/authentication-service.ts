import { isElectron } from "../utils";
import { IPCDatabaseService } from "../services/ipc-database-service";
import type {
  AuthResult,
  User,
  Subject,
  AdminAuthResult,
  SessionData,
} from "@/types";
import type { RemoteAdmin } from "@/lib/database/remote-schema";

export class AuthenticationService {
  private static instance: AuthenticationService;
  private ipcDb: IPCDatabaseService;

  private constructor() {
    this.ipcDb = new IPCDatabaseService();
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  private checkElectronAPI(): void {
    if (!isElectron()) {
      throw new Error(
        "Electron API not available. This service only works in Electron environment."
      );
    }
  }

  /**
   * Authenticate student with student code, subject code, and PIN
   *
   */
  async authenticateStudent(
    studentCode: string,
    subjectCode: string,
    pin: string
  ): Promise<AuthResult> {
    try {
      this.checkElectronAPI();

      const result = await this.ipcDb.authenticateStudent(
        studentCode.trim().toUpperCase(),
        subjectCode.trim().toUpperCase(),
        pin.trim()
      );

      if (
        result.success &&
        result.sessionToken &&
        result.user &&
        result.subject
      ) {
        await this.ipcDb.storeStudentSession({
          user: result.user,
          subject: result.subject,
          sessionToken: result.sessionToken,
          authenticatedAt: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error("Authentication error:", error);
      return {
        success: false,
        error: "Authentication failed. Please try again.",
      };
    }
  }

  /**
   * Validate session token via IPC
   */
  async validateSessionToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    subjectId?: string;
  }> {
    try {
      this.checkElectronAPI();
      return await this.ipcDb.validateStudentSession(token);
    } catch (error) {
      console.error("Session validation error:", error);
      return { valid: false };
    }
  }

  /**
   * Get current session from electron-store
   */
  async getCurrentSession(): Promise<{
    isAuthenticated: boolean;
    user?: User;
    subject?: Subject;
    sessionToken?: string;
  }> {
    try {
      this.checkElectronAPI();
      return await this.ipcDb.getStudentSession();
    } catch (error) {
      console.error("Get current session error:", error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Logout - clear session via IPC (secure)
   */
  async logout(): Promise<void> {
    try {
      this.checkElectronAPI();
      await this.ipcDb.logoutStudent();
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  /**
   * Authenticate admin with username and password
   */
  async authenticateAdmin(
    username: string,
    password: string
  ): Promise<AdminAuthResult> {
    try {
      this.checkElectronAPI();

      const result = await this.ipcDb.authenticateAdmin(
        username.trim(),
        password.trim()
      );

      if (result.success && result.sessionToken && result.admin) {
        await this.ipcDb.storeAdminSession({
          admin: result.admin,
          sessionToken: result.sessionToken,
          authenticatedAt: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error("Admin authentication error:", error);
      return {
        success: false,
        error: "Admin authentication failed. Please try again.",
      };
    }
  }

  /**
   * Validate admin session token
   */
  async validateAdminSessionToken(token: string): Promise<{
    valid: boolean;
    adminId?: string;
  }> {
    try {
      this.checkElectronAPI();
      return await this.ipcDb.validateAdminSession(token);
    } catch (error) {
      console.error("Admin session validation error:", error);
      return { valid: false };
    }
  }

  /**
   * Get current admin session
   */
  async getCurrentAdminSession(): Promise<{
    isAuthenticated: boolean;
    admin?: RemoteAdmin;
    sessionToken?: string;
  }> {
    try {
      this.checkElectronAPI();
      return await this.ipcDb.getAdminSession();
    } catch (error) {
      console.error("Get current admin session error:", error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Admin logout
   */
  async logoutAdmin(): Promise<void> {
    try {
      this.checkElectronAPI();
      await this.ipcDb.logoutAdmin();
      console.log("Admin logged out successfully");
    } catch (error) {
      console.error("Admin logout error:", error);
    }
  }

  /**
   * Check if we're in Electron environment
   */
  isElectronEnvironment(): boolean {
    return this.ipcDb.isElectronEnvironment();
  }

  /**
   * Set quiz time limit for user and subject
   */
  async setQuizTimeLimit(
    userId: string,
    subjectId: string,
    timeLimit: number
  ): Promise<void> {
    try {
      this.checkElectronAPI();
      await this.ipcDb.setQuizTimeLimit(userId, subjectId, timeLimit);
    } catch (error) {
      console.error("Set time limit error:", error);
      throw error;
    }
  }

  /**
   * Get quiz time limit for user and subject
   */
  async getQuizTimeLimit(
    userId: string,
    subjectId: string
  ): Promise<number | null> {
    try {
      this.checkElectronAPI();
      return await this.ipcDb.getQuizTimeLimit(userId, subjectId);
    } catch (error) {
      console.error("Get time limit error:", error);
      return null;
    }
  }

  /**
   * Clear quiz time limit for user and subject
   */
  async clearQuizTimeLimit(userId: string, subjectId: string): Promise<void> {
    try {
      this.checkElectronAPI();
      await this.ipcDb.clearQuizTimeLimit(userId, subjectId);
    } catch (error) {
      console.error("Clear time limit error:", error);
      throw error;
    }
  }
}
