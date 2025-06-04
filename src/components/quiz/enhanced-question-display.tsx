"use client";

import { useState } from "react";
import { cn } from "@/utils/lib";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionItem } from "@/types/app";
import { parseTextWithUnderlines } from "@/utils/text-parser";

interface EnhancedQuestionDisplayProps {
  questionItems: QuestionItem[];
  currentIndex: number;
  selectedAnswer?: string;
  onAnswerSelect: (option: string) => void;
  onNextQuestion: () => void;
  onPreviousQuestion: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastQuestion: boolean;
  onSubmitQuiz?: () => void;
  isSubmitting?: boolean;
  totalQuestions: number;
  answeredCount: number;
}

export function EnhancedQuestionDisplay({
  questionItems,
  currentIndex,
  selectedAnswer,
  onAnswerSelect,
  onNextQuestion,
  onPreviousQuestion,
  canGoNext,
  canGoPrevious,
  isLastQuestion,
  onSubmitQuiz,
  isSubmitting = false,
  totalQuestions,
  answeredCount,
}: EnhancedQuestionDisplayProps) {
  const [localSelectedAnswer, setLocalSelectedAnswer] =
    useState(selectedAnswer);

  const currentItem = questionItems[currentIndex];
  if (!currentItem) return null;

  const optionLabels = ["A", "B", "C", "D"];

  const handleAnswerSelect = (option: string) => {
    setLocalSelectedAnswer(option);
    onAnswerSelect(option);
  };

  const handleNext = () => {
    if (canGoNext) {
      onNextQuestion();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPreviousQuestion();
    }
  };

  // Render passage content
  const renderPassage = (content: string) => (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-brand-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-white text-brand-700">
              Reading Passage
            </Badge>
            <span className="text-white text-sm">
              {currentIndex + 1} of {questionItems.length}
            </span>
          </div>
        </div>

        <div className="p-8">
          {content.split("\n\n").map((paragraph, index) => {
            if (paragraph.trim().startsWith("PASSAGE")) {
              return (
                <h3
                  key={index}
                  className="text-lg font-bold text-brand-700 mb-4"
                >
                  {parseTextWithUnderlines(paragraph.trim())}
                </h3>
              );
            }
            if (paragraph.trim().startsWith("Read the following")) {
              return (
                <p
                  key={index}
                  className="text-gray-700 font-medium mb-6 italic"
                >
                  {parseTextWithUnderlines(paragraph.trim())}
                </p>
              );
            }
            return (
              <p
                key={index}
                className="text-gray-800 leading-relaxed mb-4 text-justify"
              >
                {parseTextWithUnderlines(paragraph.trim())}
              </p>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={!canGoPrevious || isSubmitting}
            variant="secondary"
            className={cn(
              "flex items-center space-x-2",
              (!canGoPrevious || isSubmitting) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Previous</span>
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Reading Passage</p>
            <p className="text-xs text-gray-500">
              Take your time to read carefully
            </p>
          </div>

          <Button
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
            className={cn(
              "flex items-center space-x-2",
              (!canGoNext || isSubmitting) && "opacity-50 cursor-not-allowed"
            )}
          >
            <span>Continue</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );

  // Render header with paired question
  const renderHeaderWithQuestion = (
    headerContent: string,
    questionItem: QuestionItem
  ) => (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-progress-500 px-6 py-4">
          <Badge variant="secondary" className="bg-white text-progress-700">
            Instructions
          </Badge>
        </div>
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {headerContent}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-brand-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-white text-brand-700">
              Question {answeredCount + 1} of {totalQuestions}
            </Badge>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
            {parseTextWithUnderlines(questionItem.content)}
          </h2>

          {questionItem.options && questionItem.options.length > 0 && (
            <div className="space-y-4">
              {questionItem.options.map((option, index) => {
                const optionLabel = optionLabels[index];
                const isSelected =
                  localSelectedAnswer === optionLabel ||
                  selectedAnswer === optionLabel;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(optionLabel)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                      isSelected
                        ? "border-selected-500 bg-selected-50 text-selected-900 shadow-md"
                        : "border-gray-200 hover:border-brand-300 hover:bg-brand-25 hover:shadow-sm"
                    )}
                    disabled={isSubmitting}
                  >
                    <div className="flex items-start space-x-3">
                      <span
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                          isSelected
                            ? "bg-selected-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {optionLabel}
                      </span>
                      <span className="text-base leading-relaxed pt-1">
                        {parseTextWithUnderlines(option)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={!canGoPrevious || isSubmitting}
            variant="secondary"
            className={cn(
              "flex items-center space-x-2",
              (!canGoPrevious || isSubmitting) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {answeredCount + 1} / {totalQuestions}
            </span>
            {selectedAnswer && (
              <Badge className="bg-correct-500 text-white">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Answered
              </Badge>
            )}
          </div>

          {isLastQuestion ? (
            <Button
              onClick={onSubmitQuiz}
              disabled={isSubmitting}
              className={cn(
                "flex items-center space-x-2 bg-correct-500 hover:bg-correct-600",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Quiz</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canGoNext || isSubmitting}
              className={cn(
                "flex items-center space-x-2",
                (!canGoNext || isSubmitting) && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>Next</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Render regular question
  const renderRegularQuestion = (questionItem: QuestionItem) => (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-brand-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-white text-brand-700">
              Question {answeredCount + 1} of {totalQuestions}
            </Badge>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
            {parseTextWithUnderlines(questionItem.content)}
          </h2>

          {questionItem.options && questionItem.options.length > 0 && (
            <div className="space-y-4">
              {questionItem.options.map((option, index) => {
                const optionLabel = optionLabels[index];
                const isSelected =
                  localSelectedAnswer === optionLabel ||
                  selectedAnswer === optionLabel;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(optionLabel)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                      isSelected
                        ? "border-selected-500 bg-selected-50 text-selected-900 shadow-md"
                        : "border-gray-200 hover:border-brand-300 hover:bg-brand-25 hover:shadow-sm"
                    )}
                    disabled={isSubmitting}
                  >
                    <div className="flex items-start space-x-3">
                      <span
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                          isSelected
                            ? "bg-selected-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {optionLabel}
                      </span>
                      <span className="text-base leading-relaxed pt-1">
                        {parseTextWithUnderlines(option)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={!canGoPrevious || isSubmitting}
            variant="secondary"
            className={cn(
              "flex items-center space-x-2",
              (!canGoPrevious || isSubmitting) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {answeredCount + 1} / {totalQuestions}
            </span>
            {selectedAnswer && (
              <Badge className="bg-correct-500 text-white">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Answered
              </Badge>
            )}
          </div>

          {isLastQuestion ? (
            <Button
              onClick={onSubmitQuiz}
              disabled={isSubmitting}
              className={cn(
                "flex items-center space-x-2 bg-correct-500 hover:bg-correct-600",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Quiz</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canGoNext || isSubmitting}
              className={cn(
                "flex items-center space-x-2",
                (!canGoNext || isSubmitting) && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>Next</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Main render logic
  if (currentItem.type === "passage") {
    return renderPassage(currentItem.content);
  }

  if (currentItem.type === "header") {
    // Check if next item is a question to pair with
    const nextItem = questionItems[currentIndex + 1];
    if (nextItem && nextItem.type === "question") {
      return renderHeaderWithQuestion(currentItem.content, nextItem);
    }
    // If no next question, render as regular question (fallback)
    return renderRegularQuestion(currentItem);
  }

  return renderRegularQuestion(currentItem);
}
