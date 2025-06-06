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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">
          Loading subjects...
        </span>
      </div>
    );
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
        <div className="flex gap-2">
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
            disabled={isLoading}
            className="font-sans"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-sans">
            Subjects ({filteredSubjects.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans">Subject</TableHead>
                <TableHead className="font-sans">Code</TableHead>
                <TableHead className="font-sans">Questions</TableHead>
                <TableHead className="font-sans">Attempts</TableHead>
                <TableHead className="font-sans">Avg Score</TableHead>
                <TableHead className="font-sans">Performance</TableHead>
                <TableHead className="font-sans">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {subject.subjectCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {subject.questionCount}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {subject.attemptCount}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {subject.attemptCount > 0 ? (
                      <span className="font-mono text-sm font-medium">
                        {subject.averageScore}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm font-sans">
                        No attempts
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500 font-mono">
                      {new Date(subject.createdAt).toLocaleDateString()}
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
