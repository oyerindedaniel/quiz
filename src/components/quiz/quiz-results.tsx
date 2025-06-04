"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SubmissionResult, User, Subject } from "@/types";

interface QuizResultsProps {
  result: SubmissionResult;
  onExit: () => void;
  onRetakeQuiz?: () => void;
  student?: User;
  subject?: Subject;
}

export function QuizResults({
  result,
  onExit,
  onRetakeQuiz,
  student,
  subject,
}: QuizResultsProps) {
  if (!result.success) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-incorrect-50 border border-incorrect-200 rounded-xl p-8 text-center shadow-lg">
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
          <h3 className="text-xl font-semibold text-incorrect-900 mb-4">
            Quiz Submission Failed
          </h3>
          <p className="text-incorrect-700 mb-6">{result.error}</p>
          <Button onClick={onExit} variant="destructive">
            Exit
          </Button>
        </div>
      </div>
    );
  }

  const { score, totalQuestions, correctAnswers, percentage } = result;

  // Determine performance level using your design system colors
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: "Excellent", color: "correct" };
    if (percentage >= 80) return { level: "Very Good", color: "brand" };
    if (percentage >= 70) return { level: "Good", color: "selected" };
    if (percentage >= 60) return { level: "Fair", color: "pending" };
    return { level: "Needs Improvement", color: "incorrect" };
  };

  const performance = getPerformanceLevel(percentage || 0);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <div className="mb-4">
          <Badge className="bg-correct-500 text-white text-base px-4 py-2">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Quiz Completed
          </Badge>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-sans uppercase">
          Quiz Results
        </h1>
        {(subject?.name || "") && (
          <p className="text-lg text-gray-600 mb-2">
            Subject:{" "}
            <span className="font-medium text-brand-700 font-mono">
              {subject?.name || ""}
            </span>
          </p>
        )}

        {student && (
          <div className="bg-gray-50 rounded-lg p-4 mx-auto max-w-md border border-gray-200 mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Student Details
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="text-sm font-medium text-brand-700">
                  {student.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Student Code:</span>
                <span className="text-sm font-mono font-medium text-brand-700">
                  {student.studentCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Class:</span>
                <span className="text-sm font-medium text-brand-700">
                  {student.class}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gender:</span>
                <span className="text-sm font-medium text-brand-700">
                  {student.gender}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div
          className={cn("px-8 py-6", {
            "bg-correct-500": performance.color === "correct",
            "bg-brand-500": performance.color === "brand",
            "bg-selected-500": performance.color === "selected",
            "bg-pending-500": performance.color === "pending",
            "bg-incorrect-500": performance.color === "incorrect",
          })}
        >
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2">
              {percentage}%
            </div>
            <div className="text-xl font-semibold text-white">
              {performance.level}
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-correct-50 rounded-lg p-6 border border-correct-200 text-center">
              <div className="text-3xl font-bold text-correct-700">
                {correctAnswers}
              </div>
              <div className="text-sm text-correct-600 font-medium">
                Correct Answers
              </div>
            </div>
            <div className="bg-incorrect-50 rounded-lg p-6 border border-incorrect-200 text-center">
              <div className="text-3xl font-bold text-incorrect-700">
                {(totalQuestions || 0) - (correctAnswers || 0)}
              </div>
              <div className="text-sm text-incorrect-600 font-medium">
                Incorrect Answers
              </div>
            </div>
            <div className="bg-brand-50 rounded-lg p-6 border border-brand-200 text-center">
              <div className="text-3xl font-bold text-brand-700">
                {totalQuestions}
              </div>
              <div className="text-sm text-brand-600 font-medium">
                Total Questions
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg
                className="w-32 h-32 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    performance.color === "correct"
                      ? "#10b981"
                      : performance.color === "brand"
                      ? "#3b82f6"
                      : performance.color === "selected"
                      ? "#f59e0b"
                      : performance.color === "pending"
                      ? "#f97316"
                      : "#ef4444"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${percentage || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {correctAnswers}/{totalQuestions}
                  </div>
                  <div className="text-xs text-gray-600">Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Message */}
      <div
        className={cn("rounded-xl border p-6", {
          "bg-correct-50 border-correct-200": performance.color === "correct",
          "bg-brand-50 border-brand-200": performance.color === "brand",
          "bg-selected-50 border-selected-200":
            performance.color === "selected",
          "bg-pending-50 border-pending-200": performance.color === "pending",
          "bg-incorrect-50 border-incorrect-200":
            performance.color === "incorrect",
        })}
      >
        <div className="flex items-start space-x-3">
          <div
            className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
              {
                "bg-correct-500": performance.color === "correct",
                "bg-brand-500": performance.color === "brand",
                "bg-selected-500": performance.color === "selected",
                "bg-pending-500": performance.color === "pending",
                "bg-incorrect-500": performance.color === "incorrect",
              }
            )}
          >
            {performance.color === "correct" ? (
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : performance.color === "brand" ? (
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div>
            <h3
              className={cn("text-lg font-medium mb-2", {
                "text-correct-800": performance.color === "correct",
                "text-brand-800": performance.color === "brand",
                "text-selected-800": performance.color === "selected",
                "text-pending-800": performance.color === "pending",
                "text-incorrect-800": performance.color === "incorrect",
              })}
            >
              {performance.level} Performance!
            </h3>
            <p
              className={cn({
                "text-correct-700": performance.color === "correct",
                "text-brand-700": performance.color === "brand",
                "text-selected-700": performance.color === "selected",
                "text-pending-700": performance.color === "pending",
                "text-incorrect-700": performance.color === "incorrect",
              })}
            >
              {(percentage || 0) >= 90
                ? "Outstanding work! You have mastered this subject."
                : (percentage || 0) >= 80
                ? "Great job! You have a strong understanding of the material."
                : (percentage || 0) >= 70
                ? "Good effort! Review the topics you missed to improve further."
                : (percentage || 0) >= 60
                ? "Keep practicing! Consider reviewing the study materials."
                : "Don't give up! More practice will help you improve significantly."}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onRetakeQuiz && (
          <Button
            onClick={onRetakeQuiz}
            className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3"
          >
            Retake Quiz
          </Button>
        )}
        <Button onClick={onExit} variant="secondary" className="px-8 py-3">
          Exit to Dashboard
        </Button>
      </div>

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Your quiz has been automatically saved and will be synced when online.
        </p>
      </div>
    </div>
  );
}
