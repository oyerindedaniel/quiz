import type {
  User,
  Subject,
  Question,
  QuizAttempt,
  CreateUserData,
  DatabaseUserData,
  CreateSubjectData,
  CreateQuestionData,
  CreateQuizAttemptData,
} from "@/types";

export class LocalDatabaseService {
  private static instance: LocalDatabaseService;

  private constructor() {}

  public static getInstance(): LocalDatabaseService {
    if (!LocalDatabaseService.instance) {
      LocalDatabaseService.instance = new LocalDatabaseService();
    }
    return LocalDatabaseService.instance;
  }

  private async executeQuery<T>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    if (typeof window !== "undefined" && window.electronAPI) {
      return window.electronAPI.database.execute(sql, params) as Promise<T[]>;
    }
    throw new Error("Database not available in browser context");
  }

  async runQuery(sql: string, params: unknown[] = []): Promise<any> {
    if (typeof window !== "undefined" && window.electronAPI) {
      return window.electronAPI.database.run(sql, params);
    }
    throw new Error("Database not available in browser context");
  }

  // User operations
  async findUserByStudentCode(studentCode: string): Promise<User | null> {
    const users = await this.executeQuery<User>(
      "SELECT * FROM users WHERE student_code = ? AND is_active = 1",
      [studentCode]
    );
    return users[0] || null;
  }

  async createUser(userData: DatabaseUserData): Promise<void> {
    await this.runQuery(
      "INSERT INTO users (id, name, student_code, password_hash, class, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userData.id,
        userData.name,
        userData.studentCode,
        userData.passwordHash,
        userData.class,
        userData.gender,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  // Subject operations
  async findSubjectByCode(subjectCode: string): Promise<Subject | null> {
    const subjects = await this.executeQuery<Subject>(
      "SELECT * FROM subjects WHERE subject_code = ? AND is_active = 1",
      [subjectCode]
    );
    return subjects[0] || null;
  }

  async createSubject(subjectData: CreateSubjectData): Promise<void> {
    await this.runQuery(
      "INSERT INTO subjects (id, name, subject_code, description, class, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        subjectData.id,
        subjectData.name,
        subjectData.subjectCode,
        subjectData.description || null,
        subjectData.class,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  // Quiz attempt operations
  async findIncompleteAttempt(
    userId: string,
    subjectId: string
  ): Promise<QuizAttempt | null> {
    const attempts = await this.executeQuery<QuizAttempt>(
      "SELECT * FROM quiz_attempts WHERE user_id = ? AND subject_id = ? AND submitted = 0",
      [userId, subjectId]
    );
    return attempts[0] || null;
  }

  async createQuizAttempt(attemptData: CreateQuizAttemptData): Promise<string> {
    const id = attemptData.id;
    await this.runQuery(
      "INSERT INTO quiz_attempts (id, user_id, subject_id, total_questions, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        attemptData.userId,
        attemptData.subjectId,
        attemptData.totalQuestions,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    return id;
  }

  async getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
    const attempts = await this.executeQuery<QuizAttempt>(
      "SELECT * FROM quiz_attempts WHERE id = ?",
      [attemptId]
    );
    return attempts[0] || null;
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    // Get current answers
    const attempts = await this.executeQuery<QuizAttempt>(
      "SELECT answers FROM quiz_attempts WHERE id = ?",
      [attemptId]
    );

    if (attempts.length === 0) {
      throw new Error("Quiz attempt not found");
    }

    const currentAnswers = attempts[0].answers
      ? JSON.parse(attempts[0].answers)
      : {};
    currentAnswers[questionId] = answer;

    await this.runQuery(
      "UPDATE quiz_attempts SET answers = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify(currentAnswers), new Date().toISOString(), attemptId]
    );
  }

  // Question operations
  async getQuestionsForSubject(subjectId: string): Promise<Question[]> {
    return this.executeQuery<Question>(
      "SELECT * FROM questions WHERE subject_id = ? AND is_active = 1 ORDER BY question_order, RANDOM()",
      [subjectId]
    );
  }

  async createQuestion(questionData: CreateQuestionData): Promise<void> {
    await this.runQuery(
      "INSERT INTO questions (id, subject_id, text, options, answer, difficulty_level, question_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        questionData.id,
        questionData.subjectId,
        questionData.text,
        questionData.options,
        questionData.answer,
        questionData.difficultyLevel || 1,
        questionData.questionOrder || null,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  // Utility operations
  async checkIntegrity(): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI) {
      return window.electronAPI.database.checkIntegrity();
    }
    return false;
  }
}
