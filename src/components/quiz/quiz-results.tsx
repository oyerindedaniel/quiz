"use client";

import { cn } from "@/utils/lib";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import { useRouter } from "next/navigation";
import { downloadCSV } from "@/utils/download";
import type { SubmissionResult, User, Subject } from "@/types/app";

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
  const router = useRouter();
  const authService = AuthenticationService.getInstance();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/");
    }
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90)
      return {
        level: "Excellent",
        color: "correct",
        message: "Outstanding work! You have mastered this subject.",
      };
    if (percentage >= 80)
      return {
        level: "Very Good",
        color: "brand",
        message: "Great job! You have a strong understanding of the material.",
      };
    if (percentage >= 70)
      return {
        level: "Good",
        color: "selected",
        message:
          "Good effort! Review the topics you missed to improve further.",
      };
    if (percentage >= 60)
      return {
        level: "Fair",
        color: "pending",
        message: "Keep practicing! Consider reviewing the study materials.",
      };
    return {
      level: "Needs Improvement",
      color: "incorrect",
      message:
        "Don't give up! More practice will help you improve significantly.",
    };
  };

  const handleDownloadResults = () => {
    if (!result.success) return;

    const { score, totalQuestions, correctAnswers, percentage } = result;
    const performance = getPerformanceLevel(percentage || 0);

    const resultsData = [
      {
        studentName: student?.name || "N/A",
        studentCode: student?.studentCode || "N/A",
        class: student?.class || "N/A",
        gender: student?.gender || "N/A",
        subject: subject?.name || "N/A",
        subjectId: subject?.id || "N/A",
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        incorrectAnswers: (totalQuestions || 0) - (correctAnswers || 0),
        score: score || 0,
        percentage: percentage || 0,
        performanceLevel: performance.level,
        submissionDate: new Date().toISOString().split("T")[0],
        submissionTime: new Date().toLocaleTimeString(),
      },
    ];

    downloadCSV({
      data: resultsData,
      headers: [
        "Student Name",
        "Student Code",
        "Class",
        "Gender",
        "Subject",
        "Subject ID",
        "Total Questions",
        "Correct Answers",
        "Incorrect Answers",
        "Score",
        "Percentage (%)",
        "Performance Level",
        "Submission Date",
        "Submission Time",
      ],
      extractValues: (item) => [
        item.studentName,
        item.studentCode,
        item.class,
        item.gender,
        item.subject,
        item.subjectId,
        item.totalQuestions,
        item.correctAnswers,
        item.incorrectAnswers,
        item.score,
        item.percentage,
        item.performanceLevel,
        item.submissionDate,
        item.submissionTime,
      ],
      filename: `quiz-results-${student?.studentCode || "student"}-${
        new Date().toISOString().split("T")[0]
      }`,
      successMessage: "Quiz results downloaded successfully!",
    });
  };

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-incorrect-100 dark:bg-incorrect-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-incorrect-600 dark:text-incorrect-400"
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
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Submission Failed
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                {result.error}
              </p>
              <Button
                onClick={onExit}
                variant="destructive"
                className="w-full py-3"
              >
                Exit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { score, totalQuestions, correctAnswers, percentage } = result;
  const performance = getPerformanceLevel(percentage || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <Badge className="bg-correct-500 hover:bg-correct-500 text-white text-sm font-medium px-4 py-2 mb-4">
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

          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            Quiz Results
          </h1>

          {subject?.name && (
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Subject:{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {subject.name}
              </span>
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div
                className={cn("px-8 py-12 text-center", {
                  "bg-gradient-to-r from-correct-500 to-correct-600":
                    performance.color === "correct",
                  "bg-gradient-to-r from-brand-500 to-brand-600":
                    performance.color === "brand",
                  "bg-gradient-to-r from-selected-500 to-selected-600":
                    performance.color === "selected",
                  "bg-gradient-to-r from-pending-500 to-pending-600":
                    performance.color === "pending",
                  "bg-gradient-to-r from-incorrect-500 to-incorrect-600":
                    performance.color === "incorrect",
                })}
              >
                <div className="text-7xl font-bold text-white mb-2 tracking-tight">
                  {percentage}%
                </div>
                <div className="text-2xl font-semibold text-white/90 mb-1">
                  {performance.level}
                </div>
                <div className="text-white/80 text-lg">
                  {correctAnswers} out of {totalQuestions} correct
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-correct-100 dark:bg-correct-900/30 rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-correct-600 dark:text-correct-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-correct-600 dark:text-correct-400 mb-1">
                      {correctAnswers}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Correct
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-incorrect-100 dark:bg-incorrect-900/30 rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-incorrect-600 dark:text-incorrect-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-incorrect-600 dark:text-incorrect-400 mb-1">
                      {(totalQuestions || 0) - (correctAnswers || 0)}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Incorrect
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-brand-600 dark:text-brand-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-1">
                      {totalQuestions}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn("rounded-2xl border p-6 shadow-lg", {
                "bg-correct-50 border-correct-200 dark:bg-correct-900/20 dark:border-correct-800":
                  performance.color === "correct",
                "bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800":
                  performance.color === "brand",
                "bg-selected-50 border-selected-200 dark:bg-selected-900/20 dark:border-selected-800":
                  performance.color === "selected",
                "bg-pending-50 border-pending-200 dark:bg-pending-900/20 dark:border-pending-800":
                  performance.color === "pending",
                "bg-incorrect-50 border-incorrect-200 dark:bg-incorrect-900/20 dark:border-incorrect-800":
                  performance.color === "incorrect",
              })}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
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
                      className="w-6 h-6 text-white"
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
                      className="w-6 h-6 text-white"
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
                      className="w-6 h-6 text-white"
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
                <div className="flex-1">
                  <h3
                    className={cn("text-xl font-bold mb-2", {
                      "text-correct-800 dark:text-correct-200":
                        performance.color === "correct",
                      "text-brand-800 dark:text-brand-200":
                        performance.color === "brand",
                      "text-selected-800 dark:text-selected-200":
                        performance.color === "selected",
                      "text-pending-800 dark:text-pending-200":
                        performance.color === "pending",
                      "text-incorrect-800 dark:text-incorrect-200":
                        performance.color === "incorrect",
                    })}
                  >
                    {performance.level} Performance!
                  </h3>
                  <p
                    className={cn("text-base leading-relaxed", {
                      "text-correct-700 dark:text-correct-300":
                        performance.color === "correct",
                      "text-brand-700 dark:text-brand-300":
                        performance.color === "brand",
                      "text-selected-700 dark:text-selected-300":
                        performance.color === "selected",
                      "text-pending-700 dark:text-pending-300":
                        performance.color === "pending",
                      "text-incorrect-700 dark:text-incorrect-300":
                        performance.color === "incorrect",
                    })}
                  >
                    {performance.message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {student && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Student Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Name
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {student.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Student Code
                    </span>
                    <span className="text-sm font-mono font-semibold text-brand-600 dark:text-brand-400">
                      {student.studentCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Class
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {student.class}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Gender
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {student.gender}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">
                Score Breakdown
              </h3>
              <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg
                    className="w-32 h-32 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
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
                      <div className="text-xl font-bold text-slate-900 dark:text-white">
                        {correctAnswers}/{totalQuestions}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Correct
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleDownloadResults}
            variant="outline"
            className="px-8 py-3 text-base font-medium border-brand-300 dark:border-brand-600 text-brand-700 dark:text-brand-300 hover:bg-brand-50 rounded-xl"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Results
          </Button>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="px-8 py-3 text-base font-medium rounded-xl"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 inline-block shadow-sm border border-slate-200 dark:border-slate-700">
            <svg
              className="w-4 h-4 inline mr-2 text-brand-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Your quiz has been securely saved and will sync automatically
          </p>
        </div>
      </div>
    </div>
  );
}
