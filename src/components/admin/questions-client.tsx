"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminData } from "@/hooks/use-admin-data";
import { useFilteredData } from "@/hooks/use-filtered-data";
import {
  Search,
  RefreshCw,
  HelpCircle,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Target,
  CheckCircle,
} from "lucide-react";

interface QuestionWithStats {
  id: string;
  subjectId: string;
  subjectName: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  correctAnswer: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  correctRate: number;
}

export function QuestionsClient() {
  // Use the admin data hook
  const {
    data: questions,
    isLoading,
    error,
    refresh,
  } = useAdminData((ipcDb) => ipcDb.getAllQuestions(), {
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Use the filtered data hook
  const {
    filteredData: filteredQuestions,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
  } = useFilteredData(questions || [], {
    searchFields: ["questionText", "subjectName"],
    customFilters: {
      difficulty: (question, level) => question.difficulty === level,
      type: (question, type) => question.questionType === type,
      performance: (question, level) => {
        if (level === "high") return question.correctRate >= 80;
        if (level === "medium")
          return question.correctRate >= 60 && question.correctRate < 80;
        if (level === "low") return question.correctRate < 60;
        return true;
      },
    },
  });

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-correct-100 text-correct-800 border-correct-200";
      case "medium":
        return "bg-pending-100 text-pending-800 border-pending-200";
      case "hard":
        return "bg-incorrect-100 text-incorrect-800 border-incorrect-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCorrectRateBadgeColor = (rate: number) => {
    if (rate >= 80) return "bg-correct-100 text-correct-800 border-correct-200";
    if (rate >= 60) return "bg-pending-100 text-pending-800 border-pending-200";
    return "bg-incorrect-100 text-incorrect-800 border-incorrect-200";
  };

  const uniqueSubjects = useMemo(() => {
    if (!questions) return [];
    return Array.from(new Set(questions.map((q) => q.subjectName)));
  }, [questions]);

  const uniqueDifficulties = useMemo(() => {
    if (!questions) return [];
    return Array.from(new Set(questions.map((q) => q.difficulty)));
  }, [questions]);

  const uniqueTypes = useMemo(() => {
    if (!questions) return [];
    return Array.from(new Set(questions.map((q) => q.questionType)));
  }, [questions]);

  const stats = useMemo(() => {
    if (!questions)
      return {
        totalAttempts: 0,
        avgCorrectRate: 0,
        easyQuestions: 0,
        hardQuestions: 0,
      };

    const totalAttempts = questions.reduce((sum, q) => sum + q.attemptCount, 0);
    const avgCorrectRate =
      questions.length > 0
        ? Math.round(
            questions
              .filter((q) => q.attemptCount > 0)
              .reduce((sum, q) => sum + q.correctRate, 0) /
              questions.filter((q) => q.attemptCount > 0).length
          )
        : 0;
    const easyQuestions = questions.filter(
      (q) => q.difficulty.toLowerCase() === "easy"
    ).length;
    const hardQuestions = questions.filter(
      (q) => q.difficulty.toLowerCase() === "hard"
    ).length;

    return { totalAttempts, avgCorrectRate, easyQuestions, hardQuestions };
  }, [questions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">
          Loading questions...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">
            Questions
          </h1>
          <p className="text-gray-600 font-sans mt-1">
            Manage question bank and analyze performance
          </p>
        </div>
        <Button
          onClick={refresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="font-sans"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-brand-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Questions
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {questions?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-progress-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-progress-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Attempts
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.totalAttempts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-correct-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-correct-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Avg Correct Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.avgCorrectRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-pending-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pending-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Easy Questions
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.easyQuestions}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search questions or subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-sans"
              />
            </div>
          </div>
          <div>
            <Select
              value={filters.difficulty || "all"}
              onValueChange={(value) => updateFilter("difficulty", value)}
            >
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {uniqueDifficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filters.performance || "all"}
              onValueChange={(value) => updateFilter("performance", value)}
            >
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="All Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="high">High (80%+)</SelectItem>
                <SelectItem value="medium">Medium (60-79%)</SelectItem>
                <SelectItem value="low">Low (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-sans">
            Questions ({filteredQuestions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans">Question</TableHead>
                <TableHead className="font-sans">Subject</TableHead>
                <TableHead className="font-sans">Type</TableHead>
                <TableHead className="font-sans">Difficulty</TableHead>
                <TableHead className="font-sans">Attempts</TableHead>
                <TableHead className="font-sans">Correct Rate</TableHead>
                <TableHead className="font-sans">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="font-medium text-gray-900 font-sans line-clamp-2">
                        {question.questionText.length > 100
                          ? `${question.questionText.substring(0, 100)}...`
                          : question.questionText}
                      </p>
                      <p className="text-sm text-gray-500 font-mono mt-1">
                        Answer: {question.correctAnswer}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-sans">
                      {question.subjectName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 font-sans">
                      {question.questionType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getDifficultyBadgeColor(
                        question.difficulty
                      )} border font-sans`}
                    >
                      {question.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {question.attemptCount}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {question.attemptCount > 0 ? (
                      <Badge
                        className={`${getCorrectRateBadgeColor(
                          question.correctRate
                        )} border font-mono`}
                      >
                        {question.correctRate}%
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm font-sans">
                        No attempts
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500 font-mono">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
