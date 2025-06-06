"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCDatabaseService = void 0;
class IPCDatabaseService {
    checkElectronAPI() {
        if (typeof window === "undefined" || !window.electronAPI) {
            throw new Error("Electron API not available. This service only works in Electron environment.");
        }
    }
    async findUserByStudentCode(studentCode) {
        this.checkElectronAPI();
        return window.electronAPI.user.findByStudentCode(studentCode);
    }
    async createUser(userData) {
        this.checkElectronAPI();
        return window.electronAPI.user.create(userData);
    }
    async findSubjectByCode(subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.subject.findByCode(subjectCode);
    }
    async getQuestionsForSubject(subjectId) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.getQuestions(subjectId);
    }
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
    async bulkCreateQuestions(questions) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.bulkCreateQuestions(questions);
    }
    async importCSVQuestions(csvContent) {
        this.checkElectronAPI();
        return window.electronAPI.csv.import(csvContent);
    }
    async performAutoSeeding() {
        this.checkElectronAPI();
        return window.electronAPI.seed.performAutoSeeding();
    }
    async readCSVFile(filePath) {
        this.checkElectronAPI();
        return window.electronAPI.csv.readFile(filePath);
    }
    async checkIntegrity() {
        this.checkElectronAPI();
        return window.electronAPI.database.checkIntegrity();
    }
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
    async storeAdminSession(sessionData) {
        return { success: true };
    }
    async logoutAdmin() {
        this.checkElectronAPI();
        return window.electronAPI.admin.logout();
    }
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
    async createAdmin(adminData) {
        this.checkElectronAPI();
        return window.electronAPI.admin.createAdmin(adminData);
    }
    async deleteQuizAttempts(studentCode, subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.admin.deleteQuizAttempts(studentCode, subjectCode);
    }
    async deleteLocalQuizAttempts(studentCode, subjectCode) {
        this.checkElectronAPI();
        return window.electronAPI.quiz.deleteQuizAttempts(studentCode, subjectCode);
    }
    async syncQuestions(options) {
        this.checkElectronAPI();
        return window.electronAPI.sync.syncQuestions(options);
    }
    async remoteBulkCreateQuestions(questions) {
        this.checkElectronAPI();
        return window.electronAPI.remote.bulkCreateQuestions(questions);
    }
    async getStudentCredentials() {
        this.checkElectronAPI();
        return window.electronAPI.admin.getStudentCredentials();
    }
    async toggleAllUsersActive(isActive) {
        this.checkElectronAPI();
        return window.electronAPI.admin.toggleAllUsersActive(isActive);
    }
    async toggleUserActive(studentCode, isActive) {
        this.checkElectronAPI();
        return window.electronAPI.admin.toggleUserActive(studentCode, isActive);
    }
    async changeUserPin(studentCode, newPin) {
        this.checkElectronAPI();
        return window.electronAPI.admin.changeUserPin(studentCode, newPin);
    }
}
exports.IPCDatabaseService = IPCDatabaseService;
