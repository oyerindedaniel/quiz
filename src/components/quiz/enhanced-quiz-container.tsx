"use client";

import { useState, useEffect } from "react";
import { QuizController } from "@/lib/quiz/quiz-controller";
import { QuestionProcessor } from "@/lib/quiz/question-processor";
import { EnhancedQuestionDisplay } from "./enhanced-question-display";
import { ProgressBar } from "./progress-bar";
import { QuizResults } from "./quiz-results";
import type { Subject, User } from "@/lib/database/local-schema";
import type { ProcessedQuizData, QuestionItem } from "@/types";

interface EnhancedQuizContainerProps {
  user: User;
  subject: Subject;
  onExit: () => void;
}

interface QuizState {
  isLoading: boolean;
  error: string | null;
  processedData: ProcessedQuizData | null;
  currentIndex: number;
  answers: Record<string, string>;
  quizController: QuizController | null;
  isSubmitted: boolean;
  submissionResult: any | null;
  isSubmitting: boolean;
}

export function EnhancedQuizContainer({
  user,
  subject,
  onExit,
}: EnhancedQuizContainerProps) {
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
  });

  useEffect(() => {
    initializeQuiz();
  }, [user.id, subject.id]);

  const initializeQuiz = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const controller = new QuizController();

      const session = await controller.startQuiz(user.id, subject.id);

      const processedData = QuestionProcessor.processQuestions(
        session.questions
      );

      // Validate question structure
      const validation = QuestionProcessor.validateQuestionStructure(
        processedData.questionItems
      );
      if (!validation.isValid) {
        console.warn("Question structure issues:", validation.issues);
      }

      // Find current position based on session state
      let currentIndex = session.currentQuestionIndex;

      // For enhanced quiz, we need to map question index to item index
      if (session.isResume && Object.keys(session.answers).length > 0) {
        // Find the first unanswered question in the processed items
        for (let i = 0; i < processedData.questionItems.length; i++) {
          const item = processedData.questionItems[i];
          if (
            item.type === "question" &&
            !(item.question.id in session.answers)
          ) {
            currentIndex = i;
            break;
          }
          // For headers, check if the paired question is answered
          if (
            item.type === "header" &&
            i + 1 < processedData.questionItems.length &&
            processedData.questionItems[i + 1].type === "question"
          ) {
            const pairedQuestion = processedData.questionItems[i + 1];
            if (!(pairedQuestion.question.id in session.answers)) {
              currentIndex = i; // Start from header
              break;
            }
          }
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        processedData,
        answers: session.answers,
        quizController: controller,
        currentIndex,
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
      // Use quiz controller to save answer
      const result = await state.quizController.saveAnswer(selectedOption);

      if (!result.success) {
        throw new Error(result.error || "Failed to save answer");
      }

      // Update local state with current session answers
      const session = state.quizController.getCurrentSession();
      if (session) {
        setState((prev) => ({
          ...prev,
          answers: session.answers,
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
    if (!state.processedData) return;

    const nextIndex = QuestionProcessor.getNextAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    );

    if (nextIndex !== null) {
      setState((prev) => ({ ...prev, currentIndex: nextIndex }));
    }
  };

  const handlePreviousQuestion = () => {
    if (!state.processedData) return;

    const prevIndex = QuestionProcessor.getPreviousAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    );

    if (prevIndex !== null) {
      setState((prev) => ({ ...prev, currentIndex: prevIndex }));
    }
  };

  const handleSubmitQuiz = async () => {
    if (!state.quizController) return;

    try {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      // Submit quiz via controller
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

  // Loading state
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

  // Error state
  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-incorrect-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Quiz Error
          </h2>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <button
            onClick={onExit}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Return to Menu
          </button>
        </div>
      </div>
    );
  }

  // Results state
  if (state.isSubmitted && state.submissionResult) {
    return (
      <QuizResults
        result={state.submissionResult}
        onExit={onExit}
        onRetakeQuiz={() => {
          setState((prev) => ({
            ...prev,
            isSubmitted: false,
            submissionResult: null,
            currentIndex: 0,
            answers: {},
          }));
          initializeQuiz();
        }}
      />
    );
  }

  // Quiz state
  if (!state.processedData) {
    return null;
  }

  const currentItem = state.processedData.questionItems[state.currentIndex];
  const answeredCount = QuestionProcessor.countAnsweredQuestions(
    state.processedData.actualQuestions,
    state.answers
  );

  // Determine selected answer for current question
  let selectedAnswer: string | undefined;
  if (currentItem.type === "question") {
    selectedAnswer = state.answers[currentItem.question.id];
  } else if (
    currentItem.type === "header" &&
    state.currentIndex + 1 < state.processedData.questionItems.length &&
    state.processedData.questionItems[state.currentIndex + 1].type ===
      "question"
  ) {
    const pairedQuestion =
      state.processedData.questionItems[state.currentIndex + 1];
    selectedAnswer = state.answers[pairedQuestion.question.id];
  }

  const canGoNext =
    QuestionProcessor.getNextAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    ) !== null;

  const canGoPrevious =
    QuestionProcessor.getPreviousAnswerableQuestionIndex(
      state.processedData.questionItems,
      state.currentIndex
    ) !== null;

  const isLastQuestion = QuestionProcessor.isLastAnswerableQuestion(
    state.processedData.questionItems,
    state.currentIndex
  );

  const percentage = Math.round(
    (answeredCount / state.processedData.totalQuestions) * 100
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {subject.name}
            </h1>
            <span className="text-sm text-gray-600">
              {user.name} • {user.studentCode}
            </span>
          </div>
          <ProgressBar
            currentQuestion={QuestionProcessor.getCurrentQuestionNumber(
              state.processedData.questionItems,
              state.processedData.actualQuestions,
              state.currentIndex
            )}
            totalQuestions={state.processedData.totalQuestions}
            answeredQuestions={answeredCount}
            percentage={percentage}
          />
        </div>
      </div>

      {/* Question Display */}
      <div className="py-8">
        <EnhancedQuestionDisplay
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
        />
      </div>
    </div>
  );
}
