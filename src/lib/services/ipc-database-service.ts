import type {
  User,
  Subject,
  Question,
  QuizAttempt,
  NewUser,
  NewQuizAttempt,
} from "../database/local-schema";
import type { ImportResult } from "@/types";
import { isElectron } from "../utils";

export class IPCDatabaseService {
  private checkElectronAPI(): void {
    if (!isElectron()) {
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

  // Quiz attempt operations
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<QuizAttempt | null> {
    this.checkElectronAPI();
    return window.electronAPI.quiz.findIncompleteAttempt(userId, subjectId);
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

  // CSV Import operations
  async importCSVQuestions(csvContent: string): Promise<ImportResult> {
    this.checkElectronAPI();
    return window.electronAPI.csv.import(csvContent);
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

  // Utility method to check if we're in Electron environment
  isElectronEnvironment(): boolean {
    return typeof window !== "undefined" && !!window.electronAPI;
  }
}
