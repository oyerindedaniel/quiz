"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
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
} from "recharts";
import {
  RefreshCw,
  AlertCircle,
  Users,
  Target,
  Trophy,
  BarChart3,
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
  const [data, setData] = useState<AnalyticsData>({
    quizAttemptsByDay: [],
    scoreDistribution: [],
    subjectPerformance: [],
    topPerformers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ipcDb = new IPCDatabaseService();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const analyticsData = await ipcDb.getAnalyticsData();
      setData(analyticsData);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">
          Loading analytics...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">
            Analytics
          </h1>
          <p className="text-gray-600 font-sans mt-1">
            Quiz performance analytics and insights
          </p>
        </div>
        <Button
          onClick={loadAnalyticsData}
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
              <BarChart3 className="w-6 h-6 text-brand-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Attempts
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {data.quizAttemptsByDay.reduce(
                  (sum, day) => sum + day.attempts,
                  0
                )}
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
                Active Students
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {data.topPerformers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-correct-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-correct-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Subjects
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {data.subjectPerformance.length}
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
                Avg Score
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {data.topPerformers.length > 0
                  ? Math.round(
                      data.topPerformers.reduce(
                        (sum, performer) => sum + performer.averageScore,
                        0
                      ) / data.topPerformers.length
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 font-sans mb-4">
            Quiz Attempts Over Time
          </h3>
          <ChartContainer config={chartConfig} className="min-h-[300px]">
            <AreaChart data={data.quizAttemptsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
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
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 font-sans mb-4">
            Score Distribution
          </h3>
          <ChartContainer config={chartConfig} className="min-h-[300px]">
            <PieChart>
              <Pie
                data={data.scoreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, percent }) =>
                  `${range}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
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
          </ChartContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 font-sans mb-4">
            Subject Performance
          </h3>
          <ChartContainer config={chartConfig} className="min-h-[300px]">
            <BarChart data={data.subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="subjectName"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="averageScore" fill="#10B981" name="Average Score" />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 font-sans mb-4">
            Top Performers
          </h3>
          <div className="space-y-4">
            {data.topPerformers.slice(0, 5).map((performer, index) => (
              <div
                key={performer.studentCode}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-brand-600 font-mono">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-sans">
                      {performer.studentName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {performer.studentCode}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 font-mono">
                    {performer.averageScore}%
                  </p>
                  <p className="text-xs text-gray-500 font-sans">
                    {performer.totalAttempts} attempts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
