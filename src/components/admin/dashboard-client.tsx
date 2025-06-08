"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminData } from "@/hooks/use-admin-data";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import {
  Users,
  BookOpen,
  HelpCircle,
  BarChart3,
  RefreshCw,
  Upload,
  Download,
  Database,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface SystemStatus {
  databaseConnected: boolean;
  syncStatus: "idle" | "syncing" | "error";
  lastBackup?: string;
  lastSync?: string;
}

export function DashboardClient() {
  const {
    data: stats,
    isLoading,
    isRefetching,
    error,
    refresh,
  } = useAdminData((ipcDb) => ipcDb.getDashboardStats(), {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  const [systemStatus] = useState<SystemStatus>({
    databaseConnected: true,
    syncStatus: "idle" as const,
    lastBackup: new Date(Date.now() - 3600000).toISOString(),
    lastSync: new Date(Date.now() - 900000).toISOString(),
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (
    action: string,
    callback: () => Promise<void>
  ) => {
    try {
      setActionLoading(action);
      await callback();
      await refresh();
    } catch (error) {
      console.error(`${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerSync = () =>
    handleAction("Sync", async () => {
      // TODO: Implement sync trigger
      console.log("Triggering sync...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Mock delay
    });

  const handlePerformSeeding = () =>
    handleAction("Seeding", async () => {
      // TODO: Implement auto seeding
      console.log("Performing auto seeding...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Mock delay
    });

  const handleBackupDatabase = () =>
    handleAction("Backup", async () => {
      // TODO: Implement backup functionality
      console.log("Creating backup...");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Mock delay
    });

  const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-sans">No dashboard data available</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "brand",
      description: `${stats.onlineUsers || 0} currently active`,
    },
    {
      title: "Subjects",
      value: stats.totalSubjects,
      icon: BookOpen,
      color: "progress",
      description: "Active learning topics",
    },
    {
      title: "Questions",
      value: stats.totalQuestions,
      icon: HelpCircle,
      color: "pending",
      description: "In question bank",
    },
    {
      title: "Quiz Attempts",
      value: stats.totalAttempts,
      icon: BarChart3,
      color: "correct",
      description: "Total completions",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">
            Dashboard
          </h1>
          <p className="text-gray-600 font-sans mt-1">
            System overview and administrative controls
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    card.color === "brand"
                      ? "bg-brand-100"
                      : card.color === "progress"
                      ? "bg-progress-100"
                      : card.color === "pending"
                      ? "bg-pending-100"
                      : card.color === "correct"
                      ? "bg-correct-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      card.color === "brand"
                        ? "text-brand-600"
                        : card.color === "progress"
                        ? "text-progress-600"
                        : card.color === "pending"
                        ? "text-pending-600"
                        : card.color === "correct"
                        ? "text-correct-600"
                        : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500 font-sans">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 font-sans mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 font-sans">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={handleTriggerSync}
            disabled={actionLoading === "Sync"}
            className="bg-brand-600 hover:bg-brand-700 font-sans"
          >
            {actionLoading === "Sync" ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Trigger Sync
          </Button>

          <Button
            onClick={handlePerformSeeding}
            disabled={actionLoading === "Seeding"}
            variant="outline"
            className="font-sans"
          >
            {actionLoading === "Seeding" ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Auto Seed Data
          </Button>

          <Button
            onClick={handleBackupDatabase}
            disabled={actionLoading === "Backup"}
            variant="outline"
            className="font-sans"
          >
            {actionLoading === "Backup" ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Create Backup
          </Button>

          <Button variant="outline" className="font-sans">
            <Upload className="w-4 h-4 mr-2" />
            Import Questions
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 font-sans">
          System Status
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-sans">
                Database Connection
              </span>
            </div>
            <Badge
              className={`${
                systemStatus.databaseConnected
                  ? "bg-correct-100 text-correct-800 border-correct-200"
                  : "bg-incorrect-100 text-incorrect-800 border-incorrect-200"
              } font-sans border`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {systemStatus.databaseConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {systemStatus.syncStatus === "syncing" ? (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              ) : systemStatus.syncStatus === "error" ? (
                <WifiOff className="w-5 h-5 text-incorrect-500" />
              ) : (
                <Wifi className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-gray-600 font-sans">Sync Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                className={`${
                  systemStatus.syncStatus === "syncing"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : systemStatus.syncStatus === "error"
                    ? "bg-incorrect-100 text-incorrect-800 border-incorrect-200"
                    : "bg-pending-100 text-pending-800 border-pending-200"
                } font-sans border`}
              >
                {systemStatus.syncStatus === "syncing"
                  ? "Syncing"
                  : systemStatus.syncStatus === "error"
                  ? "Error"
                  : "Idle"}
              </Badge>
              {(stats.pendingSyncs || 0) > 0 && (
                <Badge variant="outline" className="font-mono text-xs">
                  {stats.pendingSyncs} pending
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-sans">Last Backup</span>
            </div>
            <span className="text-gray-500 text-sm font-mono">
              {systemStatus.lastBackup
                ? formatRelativeTime(systemStatus.lastBackup)
                : "--"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-sans">Last Sync</span>
            </div>
            <span className="text-gray-500 text-sm font-mono">
              {systemStatus.lastSync
                ? formatRelativeTime(systemStatus.lastSync)
                : "--"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 font-sans">
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-correct-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-sans">
                Auto-seeding completed successfully
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">2m ago</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-sans">
                Database sync initiated
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">15m ago</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-pending-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-sans">
                New quiz attempt submitted
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">32m ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
