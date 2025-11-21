import type {
  User,
  Subject,
  Question,
  QuizAttempt,
  NewUser,
  NewQuizAttempt,
  NewQuestion,
} from "../database/local-schema.js";
import type {
  ImportResult,
  AuthResult,
  SessionData,
  AdminAuthResult,
  AdminSessionData,
  CreateAdminData,
  AdminCreationResult,
  AdminDashboardStats,
  UserWithAttempts,
  SubjectWithStats,
  QuestionWithStats,
  AnalyticsData,
  UserSeedData,
  UserSyncResult,
  QuestionSyncResult,
  LocalProcessedQuestion,
} from "../../types/app.js";
import type { RemoteAdmin } from "../database/remote-schema.js";

export class IPCDatabaseService {
  private checkElectronAPI(): void {
    if (typeof window === "undefined" || !window.electronAPI) {
      throw new Error(
        "Electron API not available. This service only works in Electron environment."
      );
    }
  }

  // User operations
  async findUserByStudentCode(studentCode: string): Promise<User | null> {
    this.checkElectronAPI();
    return window.electronAPI.user.findByStudentCode(studentCode);
  }

  async createUser(
    userData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.user.create(userData);
  }

  async createStudent(
    studentData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.remote.createStudent(studentData);
  }

  // Subject operations
  async findSubjectByCode(subjectCode: string): Promise<Subject | null> {
    this.checkElectronAPI();
    return window.electronAPI.subject.findByCode(subjectCode);
  }

  // Question operations
  async getQuestionsForSubject(subjectId: string): Promise<Question[]> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.getQuestions(subjectId);
  }

  async getProcessedQuestionsForSubject(
    subjectId: string
  ): Promise<LocalProcessedQuestion> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.getProcessedQuestions(subjectId);
  }

  // Quiz attempt operations
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<QuizAttempt | null> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.findIncompleteAttempt(userId, subjectId);
  }

  async hasSubmittedAttempt(
    userId: string,
    subjectId: string
  ): Promise<boolean> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.hasSubmittedAttempt(userId, subjectId);
  }

  async createQuizAttempt(
    attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt">
  ): Promise<string> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.createAttempt(attemptData);
  }

  async getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.getAttempt(attemptId);
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.saveAnswer(attemptId, questionId, answer);
  }

  async submitQuiz(
    attemptId: string,
    score: number,
    sessionDuration: number
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.submit(attemptId, score, sessionDuration);
  }

  async updateElapsedTime(
    attemptId: string,
    elapsedTime: number
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.updateElapsedTime(attemptId, elapsedTime);
  }

  // Bulk question operations
  async bulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.bulkCreateQuestions(questions);
  }

  // CSV Import operations
  async importCSVQuestions(csvContent: string): Promise<ImportResult> {
    this.checkElectronAPI();
    return window.electronAPI.csv.import(csvContent);
  }

  // Perform auto seeding
  async performAutoSeeding(): Promise<{
    success: boolean;
    totalRecords: number;
    error?: string;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.seed.performAutoSeeding();
  }

  async readCSVFile(filePath: string): Promise<string> {
    this.checkElectronAPI();
    return window.electronAPI.csv.readFile(filePath);
  }

  // Database management
  async checkIntegrity(): Promise<boolean> {
    this.checkElectronAPI();
    return window.electronAPI.database.checkIntegrity();
  }

  // Student Authentication operations
  async authenticateStudent(
    studentCode: string,
    subjectCode: string,
    pin: string
  ): Promise<AuthResult> {
    this.checkElectronAPI();
    return window.electronAPI.auth.authenticate(studentCode, subjectCode, pin);
  }

  async validateStudentSession(token: string): Promise<{
    valid: boolean;
    userId?: string;
    subjectId?: string;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.auth.validateSession(token);
  }

  async getStudentSession(): Promise<{
    isAuthenticated: boolean;
    user?: User;
    subject?: Subject;
    sessionToken?: string;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.auth.getCurrentSession();
  }

  async storeStudentSession(
    sessionData: SessionData
  ): Promise<{ success: boolean }> {
    this.checkElectronAPI();
    return window.electronAPI.auth.storeSession(sessionData);
  }

  async logoutStudent(): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.auth.logout();
  }

  // Time Limit operations
  async setQuizTimeLimit(
    userId: string,
    subjectId: string,
    timeLimit: number
  ): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.auth.setTimeLimit(userId, subjectId, timeLimit);
  }

  async getQuizTimeLimit(
    userId: string,
    subjectId: string
  ): Promise<number | null> {
    this.checkElectronAPI();
    return window.electronAPI.auth.getTimeLimit(userId, subjectId);
  }

  async clearQuizTimeLimit(userId: string, subjectId: string): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.auth.clearTimeLimit(userId, subjectId);
  }

  // Admin Authentication operations
  async authenticateAdmin(
    username: string,
    password: string
  ): Promise<AdminAuthResult> {
    this.checkElectronAPI();
    return window.electronAPI.admin.authenticate(username, password);
  }

  async validateAdminSession(token: string): Promise<{
    valid: boolean;
    adminId?: string;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.validateSession(token);
  }

  async getAdminSession(): Promise<{
    isAuthenticated: boolean;
    admin?: RemoteAdmin;
    sessionToken?: string;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getCurrentSession();
  }

  /**
   * Store admin session data
   * Note: Admin sessions are managed via Electron session cookies
   */
  async storeAdminSession(
    sessionData: AdminSessionData
  ): Promise<{ success: boolean }> {
    // Admin sessions are automatically stored as cookies in main.ts
    // This method is kept for interface compatibility but doesn't need implementation
    return { success: true };
  }

  async logoutAdmin(): Promise<void> {
    this.checkElectronAPI();
    return window.electronAPI.admin.logout();
  }

  // Admin Dashboard operations
  async getDashboardStats(): Promise<AdminDashboardStats> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getDashboardStats();
  }

  async getAllUsers(): Promise<UserWithAttempts[]> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getAllUsers();
  }

  async getAllSubjects(): Promise<SubjectWithStats[]> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getAllSubjects();
  }

  async getAllQuestions(): Promise<QuestionWithStats[]> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getAllQuestions();
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getAnalyticsData();
  }

  /**
   * Create a new admin user
   */
  async createAdmin(adminData: CreateAdminData): Promise<AdminCreationResult> {
    this.checkElectronAPI();
    return window.electronAPI.admin.createAdmin(adminData);
  }

  /**
   * Delete quiz attempts for a user and subject (Admin operation via remote)
   */
  async deleteQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.deleteQuizAttempts(
      studentCode,
      subjectCode
    );
  }

  /**
   * Delete quiz attempts for a user and subject (Local database operation)
   */
  async deleteLocalQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.deleteQuizAttempts(studentCode, subjectCode);
  }

  async resetLocalQuizAttempts(
    studentCode: string,
    subjectCode: string
  ): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.resetLocalAttempts(studentCode, subjectCode);
  }

  /**
   * Sync questions from remote DB to local DB
   */
  async syncQuestions(options?: {
    replaceExisting?: boolean;
    subjectCodes?: string[];
  }): Promise<QuestionSyncResult> {
    this.checkElectronAPI();
    return window.electronAPI.sync.syncQuestions(options);
  }

  /**
   * Sync users from remote DB to local DB
   */
  async syncUsers(options?: {
    replaceExisting?: boolean;
  }): Promise<UserSyncResult> {
    this.checkElectronAPI();
    return window.electronAPI.sync.syncUsers(options);
  }

  /**
   * Bulk create questions directly to remote database
   */
  async remoteBulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<{ success: boolean; created: number; error?: string }> {
    this.checkElectronAPI();
    return window.electronAPI.remote.bulkCreateQuestions(questions);
  }

  /**
   * Get student credentials (for admin panel)
   */
  async getStudentCredentials(): Promise<Array<UserSeedData>> {
    this.checkElectronAPI();
    return window.electronAPI.admin.getStudentCredentials();
  }

  /**
   * User regulation methods for admin control
   */

  /**
   * Toggle active state for all users
   */
  async toggleAllUsersActive(
    isActive: boolean
  ): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.toggleAllUsersActive(isActive);
  }

  /**
   * Toggle active state for a specific user
   */
  async toggleUserActive(
    studentCode: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string; updated?: boolean }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.toggleUserActive(studentCode, isActive);
  }

  /**
   * Change user PIN
   */
  async changeUserPin(
    studentCode: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string; updated?: boolean }> {
    this.checkElectronAPI();
    return window.electronAPI.admin.changeUserPin(studentCode, newPin);
  }

  /**
   * Sync local database from remote (only if local DB is empty)
   */
  async syncLocalDB(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    totalSynced?: number;
  }> {
    this.checkElectronAPI();
    return window.electronAPI.sync.syncLocalDB();
  }

  /**
   * Check if local database is empty
   */
  async isLocalDBEmpty(): Promise<boolean> {
    this.checkElectronAPI();
    return window.electronAPI.sync.isLocalDBEmpty();
  }
}
