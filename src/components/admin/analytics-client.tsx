"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useAdminData } from "@/hooks/use-admin-data";
import { AnalyticsSkeleton } from "@/components/skeletons/analytics-skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  AlertCircle,
  Users,
  Target,
  Trophy,
  BarChart3,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface AnalyticsData {
  quizAttemptsByDay: Array<{ date: string; attempts: number }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  subjectPerformance: Array<{
    subjectName: string;
    averageScore: number;
    totalAttempts: number;
  }>;
  topPerformers: Array<{
    studentName: string;
    studentCode: string;
    averageScore: number;
    totalAttempts: number;
  }>;
}

const chartConfig = {
  attempts: {
    label: "Attempts",
    color: "hsl(var(--chart-1))",
  },
  score: {
    label: "Score",
    color: "hsl(var(--chart-2))",
  },
  count: {
    label: "Count",
    color: "hsl(var(--chart-3))",
  },
};

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export function AnalyticsClient() {
  const { data, isLoading, isRefetching, error, refresh } = useAdminData(
    (ipcDb) => ipcDb.getAnalyticsData(),
    {
      autoRefresh: true,
      refreshInterval: 300000, // 5 minutes
    }
  );

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-sans">
              No analytics data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalAttempts = data.quizAttemptsByDay.reduce(
    (sum, day) => sum + day.attempts,
    0
  );
  const averageScore =
    data.topPerformers.length > 0
      ? Math.round(
          data.topPerformers.reduce(
            (sum, performer) => sum + performer.averageScore,
            0
          ) / data.topPerformers.length
        )
      : 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 font-sans mt-2">
            Comprehensive quiz performance analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRefetching && (
            <div className="flex items-center text-brand-600">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm font-sans">Updating...</span>
            </div>
          )}
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
            Refresh Data
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 font-sans mb-1">
                Total Quiz Attempts
              </p>
              <p className="text-3xl font-bold text-gray-900 font-mono">
                {totalAttempts.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 font-sans mb-1">
                Active Students
              </p>
              <p className="text-3xl font-bold text-gray-900 font-mono">
                {data.topPerformers.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 font-sans mb-1">
                Active Subjects
              </p>
              <p className="text-3xl font-bold text-gray-900 font-mono">
                {data.subjectPerformance.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 font-sans mb-1">
                Average Score
              </p>
              <p className="text-3xl font-bold text-gray-900 font-mono">
                {averageScore}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-sans">
              Quiz Attempts Over Time
            </h3>
            <p className="text-sm text-gray-600 font-sans">
              Daily quiz attempt trends
            </p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="min-h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.quizAttemptsByDay}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                className="text-sm"
              />
              <YAxis className="text-sm" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="attempts"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-sans">
              Score Distribution
            </h3>
            <p className="text-sm text-gray-600 font-sans">
              How students are performing across different score ranges
            </p>
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="min-h-80 w-full flex justify-center"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.scoreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, percent }) =>
                  `${range}: ${(percent * 100).toFixed(1)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {data.scoreDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-sans">
              Subject Performance
            </h3>
            <p className="text-sm text-gray-600 font-sans">
              Average scores by subject
            </p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="min-h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.subjectPerformance} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="subjectName"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                className="text-sm"
              />
              <YAxis className="text-sm" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="averageScore"
                fill="#10B981"
                name="Average Score"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 font-sans">
              Top Performers
            </h3>
            <p className="text-sm text-gray-600 font-sans">
              Students with highest average scores
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {data.topPerformers.slice(0, 8).map((performer, index) => (
            <div
              key={performer.studentCode}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0
                      ? "bg-yellow-500"
                      : index === 1
                      ? "bg-gray-400"
                      : index === 2
                      ? "bg-orange-500"
                      : "bg-blue-500"
                  }`}
                >
                  <span className="text-sm font-mono">{index + 1}</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 font-sans">
                    {performer.studentName}
                  </p>
                  <p className="text-sm text-gray-500 font-mono">
                    {performer.studentCode}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {performer.averageScore}%
                </p>
                <p className="text-sm text-gray-500 font-sans">
                  {performer.totalAttempts}{" "}
                  {performer.totalAttempts === 1 ? "attempt" : "attempts"}
                </p>
              </div>
            </div>
          ))}
          {data.topPerformers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-sans">
                No performance data available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
