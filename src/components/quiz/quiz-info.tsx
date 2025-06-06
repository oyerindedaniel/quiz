"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/lib";
import type { User, Subject } from "@/lib/database/local-schema";
import type { Class, Gender } from "@/types/app";

interface QuizInfoProps {
  student: User;
  subject: Subject;
  onStartQuiz: () => void;
  isLoading?: boolean;
}

export function QuizInfo({
  student,
  subject,
  onStartQuiz,
  isLoading = false,
}: QuizInfoProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartQuiz = async () => {
    setIsStarting(true);
    try {
      await onStartQuiz();
    } finally {
      setIsStarting(false);
    }
  };

  const formatClassName = (className: Class): string => {
    switch (className) {
      case "BASIC5":
        return "Basic 5";
      case "JSS3":
        return "JSS 3";
      case "SS2":
        return "SS 2";
      default:
        return className;
    }
  };

  const formatGender = (gender: Gender): string => {
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const getSubjectIcon = (subjectCode: string): string => {
    if (subjectCode.includes("ENG")) return "📚";

    if (subjectCode.includes("MATH")) return "🔢";

    if (subjectCode.includes("PHY")) return "⚡";
    if (subjectCode.includes("CHEM")) return "🧪";
    if (subjectCode.includes("BIO")) return "🧬";
    if (subjectCode.includes("BSC")) return "🔬";

    if (subjectCode.includes("GEO")) return "🌍";
    if (subjectCode.includes("SST")) return "🌐";

    if (subjectCode.includes("HIST")) return "📜";
    if (subjectCode.includes("GOV")) return "🏛️";
    if (subjectCode.includes("CIVIC")) return "🏛️";

    if (subjectCode.includes("COMP")) return "💻";
    if (subjectCode.includes("TECH")) return "⚙️";

    if (subjectCode.includes("AGRIC")) return "🌾";
    if (subjectCode.includes("ANI") || subjectCode.includes("ANIMAL"))
      return "🐾";

    if (subjectCode.includes("HOME")) return "🏠";
    if (subjectCode.includes("BUSINESS")) return "💼";
    if (subjectCode.includes("ECON")) return "💰";

    if (subjectCode.includes("CCA") || subjectCode.includes("CREATIVE"))
      return "🎨";
    if (subjectCode.includes("MUSIC")) return "🎵";
    if (subjectCode.includes("LIT")) return "📖";

    if (subjectCode.includes("YOR")) return "🗣️";
    if (subjectCode.includes("FRENCH")) return "🇫🇷";

    if (subjectCode.includes("CRS")) return "✝️";

    if (subjectCode.includes("PHE")) return "⚽";

    return "📖";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading quiz information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-full mb-4">
            <span className="text-2xl text-white">📝</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quiz Information
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Review your details and subject information before starting your
            quiz. Make sure you're ready to begin as the timer will start once
            you click "Start Quiz".
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Student Information
                  </h2>
                  <p className="text-brand-100 text-sm">
                    Your registered details
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Full Name
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-lg font-semibold text-gray-900">
                    {student.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Student Code
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-lg font-mono font-bold text-brand-700">
                    {student.studentCode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Class
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Badge
                      variant="secondary"
                      className="text-sm font-semibold"
                    >
                      {formatClassName(student.class)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Gender
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Badge variant="outline" className="text-sm font-semibold">
                      {formatGender(student.gender)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">
                    {getSubjectIcon(subject.subjectCode)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Subject Information
                  </h2>
                  <p className="text-blue-100 text-sm">Quiz details</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Subject Name
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-lg font-semibold text-gray-900">
                    {subject.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Subject Code
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-lg font-mono font-bold text-blue-700">
                    {subject.subjectCode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Total Questions
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-green-600">
                        {subject.totalQuestions}
                      </span>
                      <span className="text-sm text-gray-500">questions</span>
                    </div>
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Class Level
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Badge className="text-sm font-semibold">
                      {formatClassName(subject.class)}
                    </Badge>
                  </div>
                </div> */}
              </div>

              {subject.description && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Description
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {subject.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Important Instructions
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Make sure you have a stable internet connection</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Answer all questions to the best of your ability</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    You can navigate between questions before submitting
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">⚠</span>
                  <span>
                    Once you start, the quiz session will begin timing
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>
                    Do not refresh or close the browser during the quiz
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            onClick={handleStartQuiz}
            disabled={isStarting}
            size="lg"
            className={cn(
              "min-w-[200px] text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200",
              isStarting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting Quiz...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Start Quiz
              </>
            )}
          </Button>

          <p className="text-sm text-gray-500 mt-3">
            Click the button above when you're ready to begin your quiz
          </p>
        </div>
      </div>
    </div>
  );
}
