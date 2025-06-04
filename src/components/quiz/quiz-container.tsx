"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuizController } from "@/lib/quiz/quiz-controller";
import { QuestionDisplay } from "./question-display";
import { ProgressBar } from "./progress-bar";
import { QuizResults } from "./quiz-results";
import type {
  QuizSession,
  SubmissionResult,
  Question,
  User,
  Subject,
} from "@/types";

interface QuizContainerProps {
  userId: string;
  subjectId: string;
  student?: User;
  subject?: Subject;
  onExit: () => void;
}

export function QuizContainer({
  userId,
  subjectId,
  student,
  subject,
  onExit,
}: QuizContainerProps) {
  const [quizController] = useState(() => new QuizController());
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initializeQuiz();
  }, [userId, subjectId]);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await quizController.startQuiz(userId, subjectId);
      setQuizSession(session);

      const question = quizController.getCurrentQuestion();
      setCurrentQuestion(question);

      console.log(session.isResume ? "Resumed quiz" : "Started new quiz");
    } catch (error) {
      console.error("Failed to initialize quiz:", error);
      setError(error instanceof Error ? error.message : "Failed to start quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (selectedOption: string) => {
    if (!quizSession || !currentQuestion) return;

    try {
      const result = await quizController.saveAnswer(selectedOption);

      if (!result.success) {
        setError(result.error || "Failed to save answer");
        return;
      }

      const updatedSession = quizController.getCurrentSession();
      if (updatedSession) {
        setQuizSession({ ...updatedSession });
      }
    } catch (error) {
      console.error("Failed to save answer:", error);
      setError("Failed to save answer. Please try again.");
    }
  };

  const handleNextQuestion = () => {
    if (!quizSession) return;

    const result = quizController.goToNextQuestion();
    if (result.success) {
      const question = quizController.getCurrentQuestion();
      setCurrentQuestion(question);

      // Update session state
      const updatedSession = quizController.getCurrentSession();
      if (updatedSession) {
        setQuizSession({ ...updatedSession });
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (!quizSession) return;

    const result = quizController.goToPreviousQuestion();
    if (result.success) {
      const question = quizController.getCurrentQuestion();
      setCurrentQuestion(question);

      const updatedSession = quizController.getCurrentSession();
      if (updatedSession) {
        setQuizSession({ ...updatedSession });
      }
    }
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    if (!quizSession) return;

    const result = quizController.goToQuestion(questionIndex);
    if (result.success) {
      const question = quizController.getCurrentQuestion();
      setCurrentQuestion(question);

      const updatedSession = quizController.getCurrentSession();
      if (updatedSession) {
        setQuizSession({ ...updatedSession });
      }
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizSession || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await quizController.submitQuiz();

      if (result.success) {
        setSubmissionResult(result);
        setIsSubmitted(true);
      } else {
        setError(result.error || "Failed to submit quiz");
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      setError("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    setIsSubmitted(false);
    setSubmissionResult(null);
    setError(null);
    initializeQuiz();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900">
            Loading Quiz...
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {subject?.name && `Subject: ${subject.name}`}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-incorrect-200 p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-incorrect-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-incorrect-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.168 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Quiz Error
              </h3>
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="space-y-3">
                <Button onClick={initializeQuiz} className="w-full">
                  Try Again
                </Button>
                <Button onClick={onExit} variant="secondary" className="w-full">
                  Exit Quiz
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results state
  if (isSubmitted && submissionResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <QuizResults
          result={submissionResult}
          onExit={onExit}
          onRetakeQuiz={handleRetakeQuiz}
          student={student}
          subject={subject}
        />
      </div>
    );
  }

  // Quiz state
  if (!quizSession || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-pending-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-pending-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="text-lg font-medium text-gray-900 mb-4">
            No questions available
          </div>
          <Button onClick={onExit} variant="secondary">
            Exit Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Get quiz progress and navigation info
  const progress = quizController.getProgress();
  const navigationInfo = quizController.getNavigationInfo();
  const selectedAnswer = quizController.getAnswerForQuestion(
    currentQuestion.id
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Quiz Header */}
      <div className="w-full max-w-4xl mx-auto px-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-brand-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {subject?.name || "Quiz"}
                </h1>
                {student && (
                  <p className="text-brand-100 text-sm">
                    Student: {student.name}
                  </p>
                )}
              </div>
              <Button
                onClick={onExit}
                variant="secondary"
                size="sm"
                className="bg-white text-brand-700 hover:bg-brand-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="ml-2">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        currentQuestion={progress.currentQuestion}
        totalQuestions={progress.totalQuestions}
        answeredQuestions={progress.answeredQuestions}
        percentage={progress.percentage}
        questionsAnswered={navigationInfo.questionsAnswered}
        onQuestionClick={handleQuestionNavigation}
      />

      {/* Question Display */}
      <QuestionDisplay
        question={currentQuestion}
        questionNumber={progress.currentQuestion}
        totalQuestions={progress.totalQuestions}
        selectedAnswer={selectedAnswer || undefined}
        onAnswerSelect={handleAnswerSelect}
        onNextQuestion={handleNextQuestion}
        onPreviousQuestion={handlePreviousQuestion}
        canGoNext={navigationInfo.canGoNext}
        canGoPrevious={navigationInfo.canGoPrevious}
        isLastQuestion={navigationInfo.isLastQuestion}
        onSubmitQuiz={handleSubmitQuiz}
        isSubmitting={isSubmitting}
      />

      {/* Quiz Completion Notice */}
      {quizController.isQuizComplete() && !isSubmitted && (
        <div className="w-full max-w-4xl mx-auto px-6 mt-6">
          <Alert className="border-correct-200 bg-correct-50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-correct-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-correct-800">
                  All questions answered!
                </h3>
                <AlertDescription className="text-correct-700 mt-1">
                  You can review your answers or submit the quiz.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
}
