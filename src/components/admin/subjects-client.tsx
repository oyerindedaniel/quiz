"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/lib";
import { downloadCSV, csvExtractors } from "@/utils/download";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAdminData } from "@/hooks/use-admin-data";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { SubjectsSkeleton } from "@/components/skeletons/subjects-skeleton";
import {
  Search,
  RefreshCw,
  BookOpen,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Trophy,
  Users,
  Download,
} from "lucide-react";

export function SubjectsClient() {
  const {
    data: subjects,
    isLoading,
    isRefetching,
    error,
    refresh,
  } = useAdminData((ipcDb) => ipcDb.getAllSubjects(), {
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const {
    filteredData: filteredSubjects,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
  } = useFilteredData(subjects || [], {
    searchFields: ["subjectName", "subjectCode", "description"],
    customFilters: {
      performance: (subject, level) => {
        if (level === "high") return subject.averageScore >= 80;
        if (level === "medium")
          return subject.averageScore >= 60 && subject.averageScore < 80;
        if (level === "low") return subject.averageScore < 60;
        return true;
      },
    },
  });

  const getPerformanceBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-correct-100 text-correct-800 border-correct-200";
    if (score >= 60)
      return "bg-pending-100 text-pending-800 border-pending-200";
    return "bg-incorrect-100 text-incorrect-800 border-incorrect-200";
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  };

  const stats = useMemo(() => {
    if (!subjects)
      return {
        totalQuestions: 0,
        totalAttempts: 0,
        avgScore: 0,
        activeSubjects: 0,
      };

    const totalQuestions = subjects.reduce(
      (sum, subject) => sum + subject.questionCount,
      0
    );
    const totalAttempts = subjects.reduce(
      (sum, subject) => sum + subject.attemptCount,
      0
    );
    const activeSubjects = subjects.filter(
      (subject) => subject.attemptCount > 0
    ).length;
    const avgScore =
      subjects.length > 0
        ? Math.round(
            subjects
              .filter((subject) => subject.attemptCount > 0)
              .reduce((sum, subject) => sum + subject.averageScore, 0) /
              subjects.filter((subject) => subject.attemptCount > 0).length
          )
        : 0;

    return { totalQuestions, totalAttempts, avgScore, activeSubjects };
  }, [subjects]);

  const downloadSubjects = () => {
    downloadCSV({
      data: filteredSubjects,
      headers: ["Subject Code", "Subject Name"],
      extractValues: csvExtractors.subjects,
      filename: `subjects-export-${new Date().toISOString().split("T")[0]}`,
      successMessage: "Subjects data exported to CSV file",
    });
  };

  if (isLoading) {
    return <SubjectsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">
            Subjects
          </h1>
          <p className="text-gray-600 font-sans mt-1">
            Manage subjects and view performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRefetching && (
            <div className="flex items-center text-brand-600">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm font-sans">Updating...</span>
            </div>
          )}
          <Button
            onClick={downloadSubjects}
            variant="outline"
            size="sm"
            disabled={isLoading || !subjects?.length}
            className="font-sans"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={isLoading || isRefetching}
            className="font-sans"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                isLoading || isRefetching ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
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
              <BookOpen className="w-6 h-6 text-brand-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Subjects
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {subjects?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-progress-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-progress-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Active Subjects
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.activeSubjects}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-correct-100 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-correct-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Questions
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.totalQuestions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-pending-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-pending-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Avg Performance
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.avgScore}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-sans"
              />
            </div>
          </div>
          <div className="md:w-48">
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

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-sans">
            Subjects ({filteredSubjects.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Subject
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Code
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Questions
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Attempts
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Avg Score
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Performance
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 font-sans">
                        {subject.subjectName}
                      </span>
                      {subject.description && (
                        <span className="text-sm text-gray-500 font-sans">
                          {subject.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    <Badge variant="outline" className="font-mono">
                      {subject.subjectCode}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {subject.questionCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {subject.attemptCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    {subject.attemptCount > 0 ? (
                      <span className="font-mono text-sm font-medium">
                        {subject.averageScore}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm font-sans">
                        No attempts
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    {subject.attemptCount > 0 ? (
                      <Badge
                        className={cn(
                          getPerformanceBadgeColor(subject.averageScore),
                          "border font-sans"
                        )}
                      >
                        {getPerformanceLabel(subject.averageScore)}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm font-sans">
                        N/A
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    <span className="text-sm text-gray-500 font-mono">
                      {new Date(subject.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
