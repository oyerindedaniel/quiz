import { IPCDatabaseService } from "../services/ipc-database-service";
import { generateUUID } from "../utils";
import type {
  Question,
  QuizAttempt,
  QuizSession,
  AnswerResult,
  SubmissionResult,
} from "@/types";
import type { NewQuizAttempt } from "../database/local-schema";

export class QuizController {
  private ipcDb: IPCDatabaseService;
  private currentSession: QuizSession | null = null;

  constructor() {
    this.ipcDb = new IPCDatabaseService();
  }

  /**
   * Start a new quiz or resume existing one
   */
  async startQuiz(userId: string, subjectId: string): Promise<QuizSession> {
    try {
      if (!this.ipcDb.isElectronEnvironment()) {
        throw new Error("This application requires Electron environment");
      }

      const existingAttempt = await this.ipcDb.findIncompleteAttempt(
        userId,
        subjectId
      );

      if (existingAttempt) {
        return await this.resumeQuiz(existingAttempt);
      } else {
        return await this.createNewQuiz(userId, subjectId);
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
      throw new Error("Failed to start quiz. Please try again.");
    }
  }

  /**
   * Resume existing quiz attempt
   */
  private async resumeQuiz(attempt: QuizAttempt): Promise<QuizSession> {
    const questions = await this.ipcDb.getQuestionsForSubject(
      attempt.subjectId
    );

    if (questions.length === 0) {
      throw new Error("No questions available for this subject");
    }

    const answers = attempt.answers ? JSON.parse(attempt.answers) : {};
    const currentQuestionIndex = Math.min(
      Object.keys(answers).length,
      questions.length - 1
    );

    this.currentSession = {
      attemptId: attempt.id,
      questions,
      currentQuestionIndex,
      answers,
      isResume: true,
    };

    return this.currentSession;
  }

  /**
   * Create new quiz attempt
   */
  private async createNewQuiz(
    userId: string,
    subjectId: string
  ): Promise<QuizSession> {
    const questions = await this.ipcDb.getQuestionsForSubject(subjectId);

    if (questions.length === 0) {
      throw new Error("No questions available for this subject");
    }

    const attemptData: Omit<NewQuizAttempt, "startedAt" | "updatedAt"> = {
      id: generateUUID(),
      userId,
      subjectId,
      totalQuestions: questions.length,
    };

    const attemptId = await this.ipcDb.createQuizAttempt(attemptData);

    this.currentSession = {
      attemptId,
      questions,
      currentQuestionIndex: 0,
      answers: {},
      isResume: false,
    };

    return this.currentSession;
  }

  /**
   * Navigate to next question
   */
  goToNextQuestion(): AnswerResult {
    if (!this.currentSession) {
      return { success: false, error: "No active quiz session" };
    }

    const { questions, currentQuestionIndex } = this.currentSession;

    if (currentQuestionIndex >= questions.length - 1) {
      return {
        success: true,
        nextQuestionIndex: currentQuestionIndex,
        isComplete: true,
      };
    }

    this.currentSession.currentQuestionIndex = currentQuestionIndex + 1;

    return {
      success: true,
      nextQuestionIndex: this.currentSession.currentQuestionIndex,
      isComplete: false,
    };
  }

  /**
   * Navigate to previous question
   */
  goToPreviousQuestion(): AnswerResult {
    if (!this.currentSession) {
      return { success: false, error: "No active quiz session" };
    }

    if (this.currentSession.currentQuestionIndex <= 0) {
      return {
        success: true,
        nextQuestionIndex: 0,
        isComplete: false,
      };
    }

    this.currentSession.currentQuestionIndex -= 1;

    return {
      success: true,
      nextQuestionIndex: this.currentSession.currentQuestionIndex,
      isComplete: false,
    };
  }

  /**
   * Navigate to specific question by index
   */
  goToQuestion(questionIndex: number): AnswerResult {
    if (!this.currentSession) {
      return { success: false, error: "No active quiz session" };
    }

    const { questions } = this.currentSession;

    if (questionIndex < 0 || questionIndex >= questions.length) {
      return { success: false, error: "Invalid question index" };
    }

    this.currentSession.currentQuestionIndex = questionIndex;

    return {
      success: true,
      nextQuestionIndex: questionIndex,
      isComplete: questionIndex >= questions.length - 1,
    };
  }

  /**
   * Save answer for current question
   */
  async saveAnswer(selectedOption: string): Promise<AnswerResult> {
    if (!this.currentSession) {
      return { success: false, error: "No active quiz session" };
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      return { success: false, error: "No current question" };
    }

    if (!["A", "B", "C", "D"].includes(selectedOption.toUpperCase())) {
      return { success: false, error: "Invalid answer option" };
    }

    try {
      await this.ipcDb.updateQuizAnswer(
        this.currentSession.attemptId,
        currentQuestion.id,
        selectedOption.toUpperCase()
      );

      this.currentSession.answers[currentQuestion.id] =
        selectedOption.toUpperCase();

      return {
        success: true,
        nextQuestionIndex: this.currentSession.currentQuestionIndex,
        isComplete: this.isQuizComplete(),
      };
    } catch (error) {
      console.error("Failed to save answer:", error);
      return {
        success: false,
        error: "Failed to save answer. Please try again.",
      };
    }
  }

  /**
   * Submit the quiz
   */
  async submitQuiz(): Promise<SubmissionResult> {
    if (!this.currentSession) {
      return { success: false, error: "No active quiz session" };
    }

    try {
      const attempt = await this.ipcDb.getQuizAttempt(
        this.currentSession.attemptId
      );
      if (!attempt) {
        throw new Error("Quiz attempt not found");
      }

      const scoreResult = this.calculateScore();
      const sessionDuration = this.calculateSessionDuration(attempt.startedAt);

      await this.ipcDb.submitQuiz(
        this.currentSession.attemptId,
        scoreResult.correctAnswers,
        sessionDuration
      );

      this.currentSession = null;

      return {
        success: true,
        score: scoreResult.totalScore,
        totalQuestions: scoreResult.totalQuestions,
        correctAnswers: scoreResult.correctAnswers,
        percentage: Math.round(
          (scoreResult.correctAnswers / scoreResult.totalQuestions) * 100
        ),
        duration: sessionDuration,
      };
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      return {
        success: false,
        error: "Failed to submit quiz. Please try again.",
      };
    }
  }

  /**
   * Get current question
   */
  getCurrentQuestion(): Question | null {
    if (!this.currentSession) return null;

    const { questions, currentQuestionIndex } = this.currentSession;
    return questions[currentQuestionIndex] || null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): QuizSession | null {
    return this.currentSession;
  }

  /**
   * Check if quiz is complete (all questions answered)
   */
  isQuizComplete(): boolean {
    if (!this.currentSession) return false;

    const { questions, answers } = this.currentSession;
    return Object.keys(answers).length >= questions.length;
  }

  /**
   * Get quiz progress
   */
  getProgress(): {
    answeredQuestions: number;
    totalQuestions: number;
    percentage: number;
    currentQuestion: number;
  } {
    if (!this.currentSession) {
      return {
        answeredQuestions: 0,
        totalQuestions: 0,
        percentage: 0,
        currentQuestion: 0,
      };
    }

    const { questions, answers, currentQuestionIndex } = this.currentSession;
    const answeredQuestions = Object.keys(answers).length;

    return {
      answeredQuestions,
      totalQuestions: questions.length,
      percentage: Math.round((answeredQuestions / questions.length) * 100),
      currentQuestion: currentQuestionIndex + 1,
    };
  }

  /**
   * Calculate quiz score
   */
  private calculateScore(): {
    totalScore: number;
    totalQuestions: number;
    correctAnswers: number;
  } {
    if (!this.currentSession) {
      return { totalScore: 0, totalQuestions: 0, correctAnswers: 0 };
    }

    const { questions, answers } = this.currentSession;
    let correctAnswers = 0;

    for (const question of questions) {
      const userAnswer = answers[question.id];
      if (userAnswer && userAnswer === question.answer) {
        correctAnswers++;
      }
    }

    return {
      totalScore: correctAnswers,
      totalQuestions: questions.length,
      correctAnswers,
    };
  }

  /**
   * Calculate session duration in seconds
   */
  private calculateSessionDuration(startedAt: string): number {
    const startTime = new Date(startedAt);
    const endTime = new Date();
    return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  }

  /**
   * Get answer for specific question
   */
  getAnswerForQuestion(questionId: string): string | null {
    if (!this.currentSession) return null;
    return this.currentSession.answers[questionId] || null;
  }

  /**
   * Check if question is answered
   */
  isQuestionAnswered(questionId: string): boolean {
    if (!this.currentSession) return false;
    return questionId in this.currentSession.answers;
  }

  /**
   * Get question navigation info
   */
  getNavigationInfo(): {
    canGoNext: boolean;
    canGoPrevious: boolean;
    isFirstQuestion: boolean;
    isLastQuestion: boolean;
    questionsAnswered: number[];
  } {
    if (!this.currentSession) {
      return {
        canGoNext: false,
        canGoPrevious: false,
        isFirstQuestion: true,
        isLastQuestion: true,
        questionsAnswered: [],
      };
    }

    const { questions, currentQuestionIndex, answers } = this.currentSession;
    const questionsAnswered = questions
      .map((q, index) => (answers[q.id] ? index : -1))
      .filter((index) => index >= 0);

    return {
      canGoNext: currentQuestionIndex < questions.length - 1,
      canGoPrevious: currentQuestionIndex > 0,
      isFirstQuestion: currentQuestionIndex === 0,
      isLastQuestion: currentQuestionIndex === questions.length - 1,
      questionsAnswered,
    };
  }
}
