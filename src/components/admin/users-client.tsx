"use client";

import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminData } from "@/hooks/use-admin-data";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { useConnectivity } from "@/hooks/use-connectivity";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Trophy,
  Clock,
  Target,
  Power,
  PowerOff,
  Key,
  Shield,
  ShieldOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { UserWithAttempts } from "@/types/app";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";

const ipcDb = new IPCDatabaseService();

export function UsersClient() {
  const [changePinDialogOpen, setChangePinDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAttempts | null>(
    null
  );
  const [newPin, setNewPin] = useState("");
  const [isTogglingUser, setIsTogglingUser] = useState<string | null>(null);
  const [isTogglingAll, setIsTogglingAll] = useState(false);

  const {
    data: users,
    isLoading,
    error,
    refresh,
  } = useAdminData((ipcDb) => ipcDb.getAllUsers(), {
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // const connectivity = useConnectivity();

  const {
    filteredData: filteredUsers,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
  } = useFilteredData(users || [], {
    searchFields: ["firstName", "lastName", "studentCode"],
    customFilters: {
      class: (user, className) => user.className === className,
    },
  });

  const calculateUserStats = (user: UserWithAttempts) => {
    const attempts = user.quizAttempts;
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        totalSubjects: 0,
      };
    }

    const scores = attempts.map((attempt) => attempt.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const uniqueSubjects = new Set(
      attempts.map((attempt) => attempt.subjectId)
    );

    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore,
      totalSubjects: uniqueSubjects.size,
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-correct-100 text-correct-800 border-correct-200";
    if (score >= 60)
      return "bg-pending-100 text-pending-800 border-pending-200";
    return "bg-incorrect-100 text-incorrect-800 border-incorrect-200";
  };

  const handleToggleAllUsers = async (isActive: boolean) => {
    setIsTogglingAll(true);
    try {
      const { IPCDatabaseService } = await import(
        "@/lib/services/ipc-database-service"
      );
      const ipcDb = new IPCDatabaseService();

      const result = await ipcDb.toggleAllUsersActive(isActive);

      if (result.success) {
        await refresh();
        console.log(
          `Successfully ${isActive ? "activated" : "deactivated"} ${
            result.updatedCount
          } users`
        );
      } else {
        console.error("Failed to toggle all users:", result.error);
      }
    } catch (error) {
      console.error("Error toggling all users:", error);
    } finally {
      setIsTogglingAll(false);
    }
  };

  const handleToggleUser = async (user: UserWithAttempts) => {
    setIsTogglingUser(user.studentCode);
    try {
      const result = await ipcDb.toggleUserActive(
        user.studentCode,
        !user.isActive
      );

      if (result.success && result.updated) {
        await refresh();
        console.log(
          `Successfully ${!user.isActive ? "activated" : "deactivated"} user ${
            user.studentCode
          }`
        );
      } else {
        const errorMessage =
          result.error ||
          `Failed to ${
            !user.isActive ? "activate" : "deactivate"
          } user. No error message provided.`;
        console.error("Failed to toggle user:", errorMessage);

        if (result.error?.includes("Unauthorized")) {
          console.error(
            "Authentication error - admin session may have expired"
          );
        }
      }
    } catch (error) {
      console.error("Error toggling user:", error);
    } finally {
      setIsTogglingUser(null);
    }
  };

  const handleChangePinSubmit = async () => {
    if (!selectedUser || !newPin || newPin.length !== 6) {
      return;
    }

    try {
      const result = await ipcDb.changeUserPin(
        selectedUser.studentCode,
        newPin
      );

      if (result.success && result.updated) {
        await refresh();
        setChangePinDialogOpen(false);
        setSelectedUser(null);
        setNewPin("");
        console.log(
          `Successfully changed PIN for user ${selectedUser.studentCode}`
        );
      } else {
        console.error("Failed to change PIN:", result.error);
      }
    } catch (error) {
      console.error("Error changing PIN:", error);
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    try {
      return format(new Date(lastLogin), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  const uniqueClasses = useMemo(() => {
    if (!users) return [];
    return Array.from(new Set(users.map((user) => user.className)));
  }, [users]);

  const stats = useMemo(() => {
    if (!users) return { activeStudents: 0, totalAttempts: 0, avgScore: 0 };

    const activeStudents = users.filter(
      (user) => user.quizAttempts.length > 0
    ).length;
    const totalAttempts = users.reduce(
      (sum, user) => sum + user.quizAttempts.length,
      0
    );
    const avgScore =
      users.length > 0
        ? Math.round(
            users
              .filter((user) => user.quizAttempts.length > 0)
              .reduce((sum, user) => {
                const userAvg =
                  user.quizAttempts.reduce((s, a) => s + a.score, 0) /
                  user.quizAttempts.length;
                return sum + userAvg;
              }, 0) /
              users.filter((user) => user.quizAttempts.length > 0).length
          )
        : 0;

    return { activeStudents, totalAttempts, avgScore };
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans">Users</h1>
          <p className="text-gray-600 font-sans mt-1">
            Manage student accounts and view quiz performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
            {connectivity.isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {connectivity.isOnline ? "Online" : "Offline"}
            </span>
          </div> */}

          <Button
            onClick={() => handleToggleAllUsers(false)}
            variant="outline"
            size="sm"
            disabled={isTogglingAll}
            className="font-sans text-red-600 border-red-200 hover:bg-red-50"
          >
            {isTogglingAll ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldOff className="w-4 h-4 mr-2" />
            )}
            Disable All
          </Button>

          <Button
            onClick={() => handleToggleAllUsers(true)}
            variant="outline"
            size="sm"
            disabled={isTogglingAll}
            className="font-sans text-green-600 border-green-200 hover:bg-green-50"
          >
            {isTogglingAll ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Enable All
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
              <Users className="w-6 h-6 text-brand-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Total Users
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {users?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-progress-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-progress-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Active Students
              </p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {stats.activeStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-correct-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-correct-600" />
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
            <div className="w-12 h-12 rounded-lg bg-pending-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-pending-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 font-sans">
                Avg Score
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
                placeholder="Search by name or student code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-sans"
              />
            </div>
          </div>
          <div className="md:w-48">
            <Select
              value={filters.class || "all"}
              onValueChange={(value) => updateFilter("class", value)}
            >
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-sans">
            Students ({filteredUsers.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans">Student</TableHead>
                <TableHead className="font-sans">Status</TableHead>
                <TableHead className="font-sans">Class</TableHead>
                <TableHead className="font-sans">Gender</TableHead>
                <TableHead className="font-sans">Last Login</TableHead>
                <TableHead className="font-sans">Quiz Attempts</TableHead>
                <TableHead className="font-sans">Subjects</TableHead>
                <TableHead className="font-sans">Best Score</TableHead>
                <TableHead className="font-sans">Avg Score</TableHead>
                <TableHead className="font-sans">Recent Activity</TableHead>
                <TableHead className="font-sans">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const userStats = calculateUserStats(user);
                const recentAttempt = user.quizAttempts.sort(
                  (a, b) =>
                    new Date(b.completedAt).getTime() -
                    new Date(a.completedAt).getTime()
                )[0];

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 font-sans">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-sm text-gray-500 font-mono">
                          {user.studentCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {user.className}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 font-sans">
                        {user.gender}
                      </span>
                    </TableCell>
                    <TableCell>{formatLastLogin(user.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">
                          {userStats.totalAttempts}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">
                          {userStats.totalSubjects}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {userStats.totalAttempts > 0 ? (
                        <Badge
                          className={`${getScoreBadgeColor(
                            userStats.bestScore
                          )} border font-mono`}
                        >
                          {userStats.bestScore}%
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm font-sans">
                          No attempts
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {userStats.totalAttempts > 0 ? (
                        <Badge
                          className={`${getScoreBadgeColor(
                            userStats.averageScore
                          )} border font-mono`}
                        >
                          {userStats.averageScore}%
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm font-sans">
                          No attempts
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recentAttempt ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 font-sans">
                            {recentAttempt.subjectName}
                          </span>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">
                              {formatDuration(recentAttempt.sessionDuration)}
                            </span>
                            <span className="font-sans">
                              •{" "}
                              {new Date(
                                recentAttempt.completedAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm font-sans">
                          No recent activity
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleToggleUser(user)}
                          variant="outline"
                          size="sm"
                          disabled={isTogglingUser === user.studentCode}
                          className="font-sans text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {isTogglingUser === user.studentCode ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <PowerOff className="w-4 h-4 mr-2" />
                          )}
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setChangePinDialogOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="font-sans text-gray-600 border-gray-200 hover:bg-gray-50"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Change PIN
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={changePinDialogOpen} onOpenChange={setChangePinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User PIN</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Change PIN for {selectedUser.firstName}{" "}
                  {selectedUser.lastName} ({selectedUser.studentCode})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="newPin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New PIN (6 digits)
              </label>
              <Input
                id="newPin"
                type="password"
                placeholder="Enter 6-digit PIN"
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePinDialogOpen(false);
                setSelectedUser(null);
                setNewPin("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePinSubmit}
              disabled={!newPin || newPin.length !== 6}
            >
              Change PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
