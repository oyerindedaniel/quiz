"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QuizController } from "@/lib/quiz/quiz-controller";
import { QuestionProcessor } from "@/lib/quiz/question-processor";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import { EnhancedQuestionDisplay } from "./enhanced-question-display";
import { ProgressBar } from "./progress-bar";
import { QuizResults } from "./quiz-results";
import { QuizTimer } from "./quiz-timer";
import { QuizInfo } from "./quiz-info";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type {
  ProcessedQuizData,
  QuestionItem,
  SubmissionResult,
  User,
  Subject,
} from "@/types/app";

type QuizPhase = "loading" | "info" | "active" | "completed";

interface QuizState {
  isLoading: boolean;
  error: string | null;
  processedData: ProcessedQuizData | null;
  currentIndex: number;
  answers: Record<string, string>;
  quizController: QuizController | null;
  isSubmitted: boolean;
  submissionResult: SubmissionResult | null;
  isSubmitting: boolean;
  startTime: number;
  user: User | null;
  subject: Subject | null;
  timeLimit: number | null; // in seconds
  timeRemaining: number | null; // in seconds
  phase: QuizPhase;
  autoSubmitTriggered: boolean; // Flag to prevent multiple auto-submit attempts
}

export function EnhancedQuizContainer() {
  const router = useRouter();
  const [authService] = useState(() => AuthenticationService.getInstance());

  const [state, setState] = useState<QuizState>({
    isLoading: true,
    error: null,
    processedData: null,
    currentIndex: 0,
    answers: {},
    quizController: null,
    isSubmitted: false,
    submissionResult: null,
    isSubmitting: false,
    startTime: Date.now(),
    user: null,
    subject: null,
    timeLimit: null,
    timeRemaining: null,
    phase: "loading",
    autoSubmitTriggered: false,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!authService.isElectronEnvironment()) {
        throw new Error("This application requires Electron environment");
      }

      const session = await authService.getCurrentSession();

      if (
        !session ||
        !session.isAuthenticated ||
        !session.user ||
        !session.subject
      ) {
        router.push("/");
        return;
      }

      const controller = new QuizController();
      const hasProgress = await controller.hasIncompleteAttemptWithProgress(
        session.user.id,
        session.subject.id
      );

      if (hasProgress) {
        await initializeQuiz();
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        user: session.user!,
        subject: session.subject!,
        phase: "info",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to initialize quiz",
      }));
    }
  };

  const initializeQuiz = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const session = await authService.getCurrentSession();

      if (!session.isAuthenticated || !session.user || !session.subject) {
        router.push("/");
        return;
      }

      const controller = new QuizController();

      const quizSession = await controller.startQuiz(
        session.user.id,
        session.subject.id
      );

      const processedData = QuestionProcessor.processQuestions(
        quizSession.questions
      );

      const validation = QuestionProcessor.validateQuestionStructure(
        processedData.questionItems
      );
      if (!validation.isValid) {
        console.warn("Question structure issues:", validation.issues);
      }

      let currentIndex = 0;

      // For enhanced quiz, we need to map question index to item index
      if (quizSession.isResume && Object.keys(quizSession.answers).length > 0) {
        // Find the first unanswered question in the processed items
        for (let i = 0; i < processedData.questionItems.length; i++) {
          const item = processedData.questionItems[i];
          if (
            item.type === "question" &&
            !(item.question.id in quizSession.answers)
          ) {
            currentIndex = i;
            // Sync controller's current question index
            controller.syncCurrentQuestionIndex(item.question.id);
            break;
          }
          // For headers, check if the paired question is answered
          if (
            item.type === "header" &&
            i + 1 < processedData.questionItems.length &&
            processedData.questionItems[i + 1].type === "question"
          ) {
            const pairedQuestion = processedData.questionItems[i + 1];
            if (!(pairedQuestion.question.id in quizSession.answers)) {
              currentIndex = i; // Start from header
              // Sync controller's current question index with the paired question
              controller.syncCurrentQuestionIndex(pairedQuestion.question.id);
              break;
            }
          }
        }
      } else {
        // Starting fresh - sync with first question
        const firstQuestionItem = processedData.questionItems.find(
          (item) => item.type === "question"
        );
        if (firstQuestionItem && firstQuestionItem.type === "question") {
          controller.syncCurrentQuestionIndex(firstQuestionItem.question.id);
        }
      }

      let timeLimit: number | null = null;
      let timeRemaining: number | null = null;

      try {
        timeLimit = await authService.getQuizTimeLimit(
          session.user.id,
          session.subject.id
        );

        if (timeLimit) {
          const currentElapsed = quizSession.elapsedTime || 0;
          timeRemaining = Math.max(0, timeLimit - currentElapsed);
        }
      } catch (error) {
        console.warn("Failed to get time limit:", error);
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        processedData,
        answers: quizSession.answers,
        quizController: controller,
        currentIndex,
        startTime: Date.now(),
        user: session.user || null,
        subject: session.subject || null,
        timeLimit,
        timeRemaining,
        phase: "active",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to initialize quiz",
      }));
    }
  };

  const handleStartQuiz = async () => {
    await initializeQuiz();
  };

  const handleAnswerSelect = async (selectedOption: string) => {
    if (!state.processedData || !state.quizController) return;

    const currentItem = state.processedData.questionItems[state.currentIndex];
    let questionToAnswer: QuestionItem | null = null;

    // Determine which question to answer
    if (currentItem.type === "question") {
      questionToAnswer = currentItem;
    } else if (
      currentItem.type === "header" &&
      state.currentIndex + 1 < state.processedData.questionItems.length &&
      state.processedData.questionItems[state.currentIndex + 1].type ===
        "question"
    ) {
      questionToAnswer =
        state.processedData.questionItems[state.currentIndex + 1];
    }

    if (!questionToAnswer) return;

    try {
      // Sync the controller's current question index with the current question
      state.quizController.syncCurrentQuestionIndex(
        questionToAnswer.question.id
      );

      const result = await state.quizController.saveAnswerForQuestion(
        questionToAnswer.question.id,
        selectedOption
      );

      console.log("result", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to save answer");
      }

      const session = state.quizController.getCurrentSession();

      console.log("session", session);
      if (session) {
        setState((prev) => ({
          ...prev,
          answers: { ...session.answers },
        }));
      }
    } catch (error) {
      console.error("Failed to save answer:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to save answer. Please try again.",
      }));
    }
  };

  const handleNextQuestion = () => {
    if (!state.processedData || !state.quizController) return;

    const nextIndex = QuestionProcessor.getNextAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    );

    if (nextIndex !== null) {
      setState((prev) => ({ ...prev, currentIndex: nextIndex }));

      // Sync controller's current question index with the new position
      const nextItem = state.processedData.questionItems[nextIndex];
      if (nextItem.type === "question") {
        state.quizController.syncCurrentQuestionIndex(nextItem.question.id);
      } else if (
        nextItem.type === "header" &&
        nextIndex + 1 < state.processedData.questionItems.length &&
        state.processedData.questionItems[nextIndex + 1].type === "question"
      ) {
        const pairedQuestion = state.processedData.questionItems[nextIndex + 1];
        state.quizController.syncCurrentQuestionIndex(
          pairedQuestion.question.id
        );
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (!state.processedData || !state.quizController) return;

    const prevIndex = QuestionProcessor.getPreviousAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    );

    if (prevIndex !== null) {
      setState((prev) => ({ ...prev, currentIndex: prevIndex }));

      // Sync controller's current question index with the new position
      const prevItem = state.processedData.questionItems[prevIndex];
      if (prevItem.type === "question") {
        state.quizController.syncCurrentQuestionIndex(prevItem.question.id);
      } else if (
        prevItem.type === "header" &&
        prevIndex + 1 < state.processedData.questionItems.length &&
        state.processedData.questionItems[prevIndex + 1].type === "question"
      ) {
        const pairedQuestion = state.processedData.questionItems[prevIndex + 1];
        state.quizController.syncCurrentQuestionIndex(
          pairedQuestion.question.id
        );
      }
    }
  };

  const handleSubmitQuiz = async () => {
    if (!state.quizController) return;

    try {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      const result = await state.quizController.submitQuiz();

      if (!result.success) {
        throw new Error(result.error || "Failed to submit quiz");
      }

      setState((prev) => ({
        ...prev,
        isSubmitted: true,
        submissionResult: result,
        isSubmitting: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: "Failed to submit quiz. Please try again.",
      }));
    }
  };

  const handleExit = () => {
    router.push("/");
  };

  const handleTimerTick = useCallback(
    (remainingTime: number) => {
      // Auto-submit when time expires
      if (
        remainingTime <= 0 &&
        state.phase === "active" &&
        !state.isSubmitted &&
        !state.isSubmitting &&
        !state.autoSubmitTriggered
      ) {
        setState((prev) => ({ ...prev, autoSubmitTriggered: true }));
        handleSubmitQuiz();
        return;
      }

      // setState((prev) => ({
      //   ...prev,
      //   timeRemaining: remainingTime,
      // }));
    },
    [
      state.phase,
      state.isSubmitted,
      state.isSubmitting,
      state.autoSubmitTriggered,
    ]
  );

  // Current question number - force recalculation on navigation
  const currentQuestion = useMemo(() => {
    if (!state.processedData) return 1;
    return QuestionProcessor.getCurrentQuestionNumber(
      state.processedData.questionItems,
      state.processedData.actualQuestions,
      state.currentIndex
    );
  }, [state.processedData, state.currentIndex]);

  // Selected answer and current question ID
  const { selectedAnswer, currentQuestionId } = useMemo(() => {
    if (
      !state.processedData ||
      state.currentIndex < 0 ||
      state.currentIndex >= state.processedData.questionItems.length
    ) {
      console.log("no processed data");
      return { selectedAnswer: undefined, currentQuestionId: undefined };
    }

    const currentItem = state.processedData.questionItems[state.currentIndex];

    console.log("currentItem", currentItem);

    if (currentItem.type === "question") {
      const questionId = currentItem.question.id;

      return {
        selectedAnswer: state.answers[questionId] || undefined,
        currentQuestionId: questionId,
      };
    } else if (
      currentItem.type === "header" &&
      state.currentIndex + 1 < state.processedData.questionItems.length &&
      state.processedData.questionItems[state.currentIndex + 1].type ===
        "question"
    ) {
      const pairedQuestion =
        state.processedData.questionItems[state.currentIndex + 1];
      const questionId = pairedQuestion.question.id;
      return {
        selectedAnswer: state.answers[questionId] || undefined,
        currentQuestionId: questionId,
      };
    }

    return { selectedAnswer: undefined, currentQuestionId: undefined };
  }, [state.processedData, state.currentIndex, state.answers]);

  // Navigation calculations
  const { canGoNext, canGoPrevious, isLastQuestion } = useMemo(() => {
    if (!state.processedData) {
      return { canGoNext: false, canGoPrevious: false, isLastQuestion: false };
    }

    return {
      canGoNext:
        QuestionProcessor.getNextAnswerableQuestionIndex(
          state.processedData.questionItems,
          state.currentIndex
        ) !== null,
      canGoPrevious:
        QuestionProcessor.getPreviousAnswerableQuestionIndex(
          state.processedData.questionItems,
          state.currentIndex
        ) !== null,
      isLastQuestion: QuestionProcessor.isLastAnswerableQuestion(
        state.processedData.questionItems,
        state.currentIndex
      ),
    };
  }, [state.processedData, state.currentIndex]);

  // Answer count and percentage
  const { answeredCount, percentage } = useMemo(() => {
    if (!state.processedData) {
      return { answeredCount: 0, percentage: 0 };
    }

    const count = QuestionProcessor.countAnsweredQuestions(
      state.processedData.actualQuestions,
      state.answers
    );
    const percent = Math.round(
      (count / state.processedData.totalQuestions) * 100
    );

    return { answeredCount: count, percentage: percent };
  }, [state.processedData, state.answers]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-incorrect-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Quiz Error
          </h2>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <Button onClick={handleExit} variant="outline" className="w-full">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "info" && state.user && state.subject) {
    return (
      <QuizInfo
        student={state.user}
        subject={state.subject}
        onStartQuiz={handleStartQuiz}
        isLoading={state.isLoading}
      />
    );
  }

  if (state.isSubmitted && state.submissionResult) {
    return (
      <QuizResults
        result={state.submissionResult}
        onExit={handleExit}
        student={state.user || undefined}
        subject={state.subject || undefined}
        onRetakeQuiz={() => {
          setState((prev) => ({
            ...prev,
            isSubmitted: false,
            submissionResult: null,
            currentIndex: 0,
            answers: {},
            startTime: Date.now(),
            timeRemaining: state.timeLimit,
          }));
          initializeQuiz();
        }}
      />
    );
  }

  if (!state.processedData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {state.subject?.name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {state.user?.name} • {state.user?.studentCode}
              </span>
              <QuizTimer
                startTime={state.startTime}
                timeLimit={state.timeLimit || 3600}
                previousElapsedTime={
                  state.quizController?.getCurrentSession()?.elapsedTime || 0
                }
                onTimeUpdate={handleTimerTick}
              />
            </div>
          </div>
          <ProgressBar
            key={`progress-${state.currentIndex}-${currentQuestion}-${answeredCount}`}
            currentQuestion={currentQuestion}
            totalQuestions={state.processedData.totalQuestions}
            answeredQuestions={answeredCount}
            percentage={percentage}
          />
        </div>
      </div>

      <div className="py-8">
        <EnhancedQuestionDisplay
          key={`question-display-${state.currentIndex}-${currentQuestionId}`}
          questionItems={state.processedData.questionItems}
          currentIndex={state.currentIndex}
          selectedAnswer={selectedAnswer}
          onAnswerSelect={handleAnswerSelect}
          onNextQuestion={handleNextQuestion}
          onPreviousQuestion={handlePreviousQuestion}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          isLastQuestion={isLastQuestion}
          onSubmitQuiz={handleSubmitQuiz}
          isSubmitting={state.isSubmitting}
          totalQuestions={state.processedData.totalQuestions}
          answeredCount={answeredCount}
          currentQuestion={currentQuestion}
        />
      </div>
    </div>
  );
}
