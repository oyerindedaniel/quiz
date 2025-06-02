import bcrypt from "bcryptjs";
import { LocalDatabaseService } from "../database/local-database-service";
import {
  generateUUID,
  validateStudentCode,
  validateSubjectCode,
} from "../utils";
import type {
  User,
  Subject,
  AuthResult,
  CreateUserData,
  DatabaseUserData,
} from "@/types";

export class AuthenticationService {
  private static instance: AuthenticationService;
  private localDb: LocalDatabaseService;

  private constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Authenticate student with student code, subject code, and PIN
   */
  async authenticateStudent(
    studentCode: string,
    subjectCode: string,
    pin: string
  ): Promise<AuthResult> {
    try {
      if (!validateStudentCode(studentCode)) {
        return {
          success: false,
          error:
            "Invalid student code format. Must be 6-12 alphanumeric characters.",
        };
      }

      if (!validateSubjectCode(subjectCode)) {
        return {
          success: false,
          error:
            "Invalid subject code format. Must be letters followed by numbers (e.g., MATH101).",
        };
      }

      if (!this.validatePin(pin)) {
        return {
          success: false,
          error: "PIN must be exactly 6 digits.",
        };
      }

      const user = await this.localDb.findUserByStudentCode(studentCode);
      if (!user) {
        return {
          success: false,
          error: "Student not found. Please check your student code.",
        };
      }

      const isValidPin = await this.verifyPin(pin, user.passwordHash);
      if (!isValidPin) {
        return {
          success: false,
          error: "Invalid PIN. Please try again.",
        };
      }

      const subject = await this.localDb.findSubjectByCode(subjectCode);
      if (!subject) {
        return {
          success: false,
          error: "Subject not found. Please check your subject code.",
        };
      }

      const existingAttempt = await this.localDb.findIncompleteAttempt(
        user.id,
        subject.id
      );

      const sessionToken = this.generateSessionToken(user.id, subject.id);

      return {
        success: true,
        user,
        subject,
        existingAttempt,
        sessionToken,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return {
        success: false,
        error: "Authentication failed. Please try again.",
      };
    }
  }

  /**
   * Create new user (for seeding/admin purposes)
   */
  async createUser(userData: CreateUserData): Promise<string> {
    try {
      const existingUser = await this.localDb.findUserByStudentCode(
        userData.studentCode
      );

      if (existingUser) {
        throw new Error("Student code already exists");
      }

      const passwordHash = await this.hashPin(userData.pin);

      const userId = generateUUID();
      await this.localDb.createUser({
        id: userId,
        name: userData.name,
        studentCode: userData.studentCode,
        passwordHash,
        class: userData.class,
        gender: userData.gender,
      } as DatabaseUserData);

      return userId;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }

  /**
   * Validate session token
   */
  validateSessionToken(
    token: string
  ): { userId: string; subjectId: string } | null {
    try {
      const decoded = atob(token);
      const [userId, subjectId, timestamp] = decoded.split(":");

      // Check if token is not too old (24 hours)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - tokenTime > maxAge) {
        return null;
      }

      return { userId, subjectId };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate session token
   */
  private generateSessionToken(userId: string, subjectId: string): string {
    const timestamp = Date.now().toString();
    const payload = `${userId}:${subjectId}:${timestamp}`;
    return btoa(payload);
  }

  /**
   * Hash PIN using bcrypt
   */
  private async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
  }

  /**
   * Verify PIN against hash
   */
  private async verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
  }

  /**
   * Validate PIN format (6 digits)
   */
  private validatePin(pin: string): boolean {
    const pattern = /^\d{6}$/;
    return pattern.test(pin.trim());
  }

  /**
   * Logout (clear session)
   */
  logout(): void {
    // Clear any stored session data
    if (typeof window !== "undefined") {
      localStorage.removeItem("quiz_session_token");
      localStorage.removeItem("quiz_current_user");
    }
  }
}
