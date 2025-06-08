"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { toast } from "sonner";
import { Loader2, Download, Users, CheckCircle2, XCircle } from "lucide-react";
import type { UserSyncResult } from "@/types/app";
import { isElectron } from "@/utils/lib";

const dbService = new IPCDatabaseService();

export default function UserSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<UserSyncResult | null>(
    null
  );

  const handleSync = async () => {
    if (!isElectron()) {
      toast.error("This application requires Electron to run");
      return;
    }

    setIsLoading(true);
    setLastSyncResult(null);

    try {
      const options = {
        replaceExisting: replaceMode,
      };

      console.log("Starting user sync with options:", options);

      const result = await dbService.syncUsers(options);

      setLastSyncResult(result);

      if (result.success) {
        toast.success(
          `✅ User sync completed! ${
            result.usersSynced || 0
          } users synced across ${result.classesSynced || 0} classes`,
          {
            description: result.details
              ? `New: ${result.details.newUsers || 0}, Updated: ${
                  result.details.updatedUsers || 0
                }, Skipped: ${result.details.skippedUsers || 0}`
              : undefined,
            duration: 5000,
          }
        );
      } else {
        toast.error(`❌ User sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error("User sync error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`❌ User sync failed: ${errorMessage}`);
      setLastSyncResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg border border-brand-200 p-6 space-y-6 font-sans overflow-y-auto">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-brand-900 flex items-center gap-2 font-sans">
          <Users className="h-5 w-5 text-brand-600" />
          User Sync
        </h3>
        <p className="text-sm text-brand-600 font-sans">
          Sync all user accounts from remote database to local database
        </p>
      </div>

      <Separator className="bg-brand-200" />

      <div className="space-y-4">
        <span className="text-sm font-semibold text-brand-800 font-sans">
          Sync Mode
        </span>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 p-3 rounded-lg border border-brand-200 hover:bg-brand-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="userSyncMode"
              checked={!replaceMode}
              onChange={() => setReplaceMode(false)}
              disabled={isLoading}
              className="h-4 w-4 mt-0.5 text-brand-600 border-brand-300 focus:ring-brand-200"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-900 font-sans">
                Smart Update (Recommended)
              </span>
              <span className="text-xs text-brand-600 font-sans">
                Only update changed users and add new ones
              </span>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 rounded-lg border border-brand-200 hover:bg-brand-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="userSyncMode"
              checked={replaceMode}
              onChange={() => setReplaceMode(true)}
              disabled={isLoading}
              className="h-4 w-4 mt-0.5 text-brand-600 border-brand-300 focus:ring-brand-200"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-900 font-sans">
                Complete Replace
              </span>
              <span className="text-xs text-brand-600 font-sans">
                Replace existing users with remote versions
              </span>
            </div>
          </label>
        </div>
      </div>

      <Separator className="bg-brand-200" />

      <Button
        onClick={handleSync}
        disabled={isLoading}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white border-0 font-sans font-semibold"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-pending-100">Syncing Users...</span>
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Sync All Users
          </>
        )}
      </Button>

      {lastSyncResult && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {lastSyncResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-bold text-brand-900 font-sans">
              {lastSyncResult.success ? "Sync Successful" : "Sync Failed"}
            </span>
          </div>
          {lastSyncResult.success ? (
            <div className="text-xs text-brand-700 space-y-1 font-sans">
              <div>Total Users Synced: {lastSyncResult.usersSynced || 0}</div>
              <div>Classes Covered: {lastSyncResult.classesSynced || 0}</div>
              {lastSyncResult.details && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-white rounded">
                    <div className="font-bold text-green-600">
                      {lastSyncResult.details.newUsers || 0}
                    </div>
                    <div className="text-xs">New</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <div className="font-bold text-blue-600">
                      {lastSyncResult.details.updatedUsers || 0}
                    </div>
                    <div className="text-xs">Updated</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <div className="font-bold text-gray-600">
                      {lastSyncResult.details.skippedUsers || 0}
                    </div>
                    <div className="text-xs">Skipped</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-red-700 font-sans">
              {lastSyncResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
