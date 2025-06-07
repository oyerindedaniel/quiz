"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCDatabaseService = void 0;
class IPCDatabaseService {
    checkElectronAPI() {
        if (typeof window === "undefined" || !window.electronAPI) {
            throw new Error("Electron API not available. This service only works in Electron environment.");
        }
    }
    // User operations
    async findUserByStudentCode(studentCode) {
        this.checkElectronAPI();
        return window.electronAPI.user.findByStudentCode(studentCode);
    }
    async createUser(userData) {
        this.checkElectronAPI();
        return window.electronAPI.user.create(userData);
    }
    // Subject operations
    async findSubjectByCode(subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.subject.findByCode(subjectCode);
    }
    // Question operations
    async getQuestionsForSubject(subjectId) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.getQuestions(subjectId);
    }
    // Quiz attempt operations
    async findIncompleteAttempt(userId, subjectId) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.findIncompleteAttempt(userId, subjectId);
    }
    async createQuizAttempt(attemptData) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.createAttempt(attemptData);
    }
    async getQuizAttempt(attemptId) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.getAttempt(attemptId);
    }
    async updateQuizAnswer(attemptId, questionId, answer) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.saveAnswer(attemptId, questionId, answer);
    }
    async submitQuiz(attemptId, score, sessionDuration) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.submit(attemptId, score, sessionDuration);
    }
    async updateElapsedTime(attemptId, elapsedTime) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.updateElapsedTime(attemptId, elapsedTime);
    }
    // Bulk question operations
    async bulkCreateQuestions(questions) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.bulkCreateQuestions(questions);
    }
    // CSV Import operations
    async importCSVQuestions(csvContent) {
        this.checkElectronAPI();
        return window.electronAPI.csv.import(csvContent);
    }
    // Perform auto seeding
    async performAutoSeeding() {
        this.checkElectronAPI();
        return window.electronAPI.seed.performAutoSeeding();
    }
    async readCSVFile(filePath) {
        this.checkElectronAPI();
        return window.electronAPI.csv.readFile(filePath);
    }
    // Database management
    async checkIntegrity() {
        this.checkElectronAPI();
        return window.electronAPI.database.checkIntegrity();
    }
    // Student Authentication operations
    async authenticateStudent(studentCode, subjectCode, pin) {
        this.checkElectronAPI();
        return window.electronAPI.auth.authenticate(studentCode, subjectCode, pin);
    }
    async validateStudentSession(token) {
        this.checkElectronAPI();
        return window.electronAPI.auth.validateSession(token);
    }
    async getStudentSession() {
        this.checkElectronAPI();
        return window.electronAPI.auth.getCurrentSession();
    }
    async storeStudentSession(sessionData) {
        this.checkElectronAPI();
        return window.electronAPI.auth.storeSession(sessionData);
    }
    async logoutStudent() {
        this.checkElectronAPI();
        return window.electronAPI.auth.logout();
    }
    // Time Limit operations
    async setQuizTimeLimit(userId, subjectId, timeLimit) {
        this.checkElectronAPI();
        return window.electronAPI.auth.setTimeLimit(userId, subjectId, timeLimit);
    }
    async getQuizTimeLimit(userId, subjectId) {
        this.checkElectronAPI();
        return window.electronAPI.auth.getTimeLimit(userId, subjectId);
    }
    async clearQuizTimeLimit(userId, subjectId) {
        this.checkElectronAPI();
        return window.electronAPI.auth.clearTimeLimit(userId, subjectId);
    }
    // Admin Authentication operations
    async authenticateAdmin(username, password) {
        this.checkElectronAPI();
        return window.electronAPI.admin.authenticate(username, password);
    }
    async validateAdminSession(token) {
        this.checkElectronAPI();
        return window.electronAPI.admin.validateSession(token);
    }
    async getAdminSession() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getCurrentSession();
    }
    /**
     * Store admin session data
     * Note: Admin sessions are managed via Electron session cookies
     */
    async storeAdminSession(sessionData) {
        // Admin sessions are automatically stored as cookies in main.ts
        // This method is kept for interface compatibility but doesn't need implementation
        return { success: true };
    }
    async logoutAdmin() {
        this.checkElectronAPI();
        return window.electronAPI.admin.logout();
    }
    // Admin Dashboard operations
    async getDashboardStats() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getDashboardStats();
    }
    async getAllUsers() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getAllUsers();
    }
    async getAllSubjects() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getAllSubjects();
    }
    async getAllQuestions() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getAllQuestions();
    }
    async getAnalyticsData() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getAnalyticsData();
    }
    /**
     * Create a new admin user
     */
    async createAdmin(adminData) {
        this.checkElectronAPI();
        return window.electronAPI.admin.createAdmin(adminData);
    }
    /**
     * Delete quiz attempts for a user and subject (Admin operation via remote)
     */
    async deleteQuizAttempts(studentCode, subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.admin.deleteQuizAttempts(studentCode, subjectCode);
    }
    /**
     * Delete quiz attempts for a user and subject (Local database operation)
     */
    async deleteLocalQuizAttempts(studentCode, subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.deleteQuizAttempts(studentCode, subjectCode);
    }
    /**
     * Sync questions from remote DB to local DB
     */
    async syncQuestions(options) {
        this.checkElectronAPI();
        return window.electronAPI.sync.syncQuestions(options);
    }
    /**
     * Bulk create questions directly to remote database
     */
    async remoteBulkCreateQuestions(questions) {
        this.checkElectronAPI();
        return window.electronAPI.remote.bulkCreateQuestions(questions);
    }
    /**
     * Get student credentials (for admin panel)
     */
    async getStudentCredentials() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getStudentCredentials();
    }
    /**
     * User regulation methods for admin control
     */
    /**
     * Toggle active state for all users
     */
    async toggleAllUsersActive(isActive) {
        this.checkElectronAPI();
        return window.electronAPI.admin.toggleAllUsersActive(isActive);
    }
    /**
     * Toggle active state for a specific user
     */
    async toggleUserActive(studentCode, isActive) {
        this.checkElectronAPI();
        return window.electronAPI.admin.toggleUserActive(studentCode, isActive);
    }
    /**
     * Change user PIN
     */
    async changeUserPin(studentCode, newPin) {
        this.checkElectronAPI();
        return window.electronAPI.admin.changeUserPin(studentCode, newPin);
    }
    /**
     * Sync local database from remote (only if local DB is empty)
     */
    async syncLocalDB() {
        this.checkElectronAPI();
        return window.electronAPI.sync.syncLocalDB();
    }
    /**
     * Check if local database is empty
     */
    async isLocalDBEmpty() {
        this.checkElectronAPI();
        return window.electronAPI.sync.isLocalDBEmpty();
    }
}
exports.IPCDatabaseService = IPCDatabaseService;
