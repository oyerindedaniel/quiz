"use client";

import { cn } from "@/utils/lib";
import { Badge } from "@/components/ui/badge";

interface ProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
  percentage: number;
  questionsAnswered?: number[];
  onQuestionClick?: (questionIndex: number) => void;
}

export function ProgressBar({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  percentage,
  questionsAnswered = [],
  onQuestionClick,
}: ProgressBarProps) {
  const handleQuestionClick = (questionIndex: number) => {
    if (onQuestionClick) {
      onQuestionClick(questionIndex);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-brand-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Quiz Progress</h3>
            <Badge variant="secondary" className="bg-white text-brand-700">
              {answeredQuestions} of {totalQuestions} answered
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-brand-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium">{percentage}% Complete</span>
            <span>
              Current: Question {currentQuestion} of {totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Question Grid Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-brand-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Question Navigation
        </h4>

        <div className="grid grid-cols-10 gap-2 md:grid-cols-15 lg:grid-cols-20">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const questionNum = index + 1;
            const isAnswered = questionsAnswered.includes(index);
            const isCurrent = questionNum === currentQuestion;

            return (
              <button
                key={index}
                onClick={() => handleQuestionClick(index)}
                disabled={!onQuestionClick}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
                  isCurrent
                    ? "bg-brand-500 text-white ring-2 ring-brand-300"
                    : isAnswered
                    ? "bg-correct-100 text-correct-800 hover:bg-correct-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  onQuestionClick
                    ? "cursor-pointer hover:shadow-md"
                    : "cursor-default"
                )}
                title={`Question ${questionNum}${
                  isAnswered ? " (Answered)" : ""
                }${isCurrent ? " (Current)" : ""}`}
              >
                {questionNum}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-brand-500 rounded"></div>
            <span className="text-sm text-gray-600 font-medium">Current</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-correct-100 rounded border border-correct-200"></div>
            <span className="text-sm text-gray-600 font-medium">Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 rounded border border-gray-200"></div>
            <span className="text-sm text-gray-600 font-medium">
              Not Answered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
