"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { QuestionSyncResult } from "@/types/app";
import { isElectron } from "@/utils/lib";

const dbService = new IPCDatabaseService();

export default function QuestionSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [subjectCodesInput, setSubjectCodesInput] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [lastSyncResult, setLastSyncResult] =
    useState<QuestionSyncResult | null>(null);

  const handleSync = async () => {
    if (!isElectron()) {
      toast.success("This application requires Electron to run");
      return;
    }

    setIsLoading(true);
    setLastSyncResult(null);

    try {
      const subjectCodes = subjectCodesInput
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0);

      const options = {
        replaceExisting: replaceMode,
        ...(subjectCodes.length > 0 && { subjectCodes }),
      };

      console.log("Starting sync with options:", options);

      const result = await dbService.syncQuestions(options);
      setLastSyncResult(result);

      if (result.success) {
        toast.success(
          `✅ Sync completed! ${result.questionsPulled} questions synced across ${result.subjectsSynced} subjects`,
          {
            description: result.details
              ? `New: ${result.details.newQuestions}, Updated: ${result.details.updatedQuestions}, Subjects: ${result.details.newSubjects}`
              : undefined,
            duration: 5000,
          }
        );
      } else {
        toast.error(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`❌ Sync failed: ${errorMessage}`);
      setLastSyncResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parsedSubjectCodes = subjectCodesInput
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0);

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg border border-brand-200 p-6 space-y-6 font-sans overflow-y-auto">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-brand-900 flex items-center gap-2 font-sans">
          <Database className="h-5 w-5 text-brand-600" />
          Question Sync
        </h3>
        <p className="text-sm text-brand-600 font-sans">
          Sync questions from remote database to local database with advanced
          options
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="subjectCodes"
          className="text-sm font-semibold text-brand-800 font-sans"
        >
          Subject Codes (Optional)
        </label>
        <Input
          id="subjectCodes"
          placeholder="Enter subject codes separated by commas (e.g., SS1_ENG, SS2_MATH, SS3_PHY)"
          value={subjectCodesInput}
          onChange={(e) => setSubjectCodesInput(e.target.value)}
          disabled={isLoading}
          className="text-sm font-mono bg-brand-50 border-brand-200 focus:border-brand-500 focus:ring-brand-200"
        />
        <div className="text-xs text-brand-500 font-sans">
          Leave empty to sync all subjects. Use comma-separated values for
          specific subjects.
        </div>

        {parsedSubjectCodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <span className="text-xs text-brand-600 font-sans">
              Target subjects:
            </span>
            {parsedSubjectCodes.map((code) => (
              <Badge
                key={code}
                className="text-xs bg-brand-100 text-brand-800 border-brand-300 font-mono"
              >
                {code}
              </Badge>
            ))}
          </div>
        )}
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
              name="syncMode"
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
                Only update changed questions and add new ones
              </span>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 rounded-lg border border-brand-200 hover:bg-brand-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="syncMode"
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
                Replace all local questions with remote versions
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
            <span className="text-pending-100">Syncing Questions...</span>
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Sync Questions
            {parsedSubjectCodes.length > 0 && (
              <Badge className="ml-2 bg-brand-100 text-brand-800 border-0 font-mono">
                {parsedSubjectCodes.length} subjects
              </Badge>
            )}
          </>
        )}
      </Button>

      {lastSyncResult && (
        <div
          className={`rounded-lg border p-4 font-sans ${
            lastSyncResult.success
              ? "border-correct-200 bg-correct-50"
              : "border-incorrect-200 bg-incorrect-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {lastSyncResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-correct-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-incorrect-600 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <div className="text-sm font-semibold font-sans">
                <span
                  className={
                    lastSyncResult.success
                      ? "text-correct-800"
                      : "text-incorrect-800"
                  }
                >
                  {lastSyncResult.success
                    ? "Sync Completed Successfully"
                    : "Sync Failed"}
                </span>
              </div>

              {lastSyncResult.success && lastSyncResult.details && (
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="font-semibold text-correct-700">
                      Questions:
                    </span>
                    <div className="text-correct-600">
                      <span className="font-mono">
                        {lastSyncResult.details.newQuestions}
                      </span>{" "}
                      new,{" "}
                      <span className="font-mono">
                        {lastSyncResult.details.updatedQuestions}
                      </span>{" "}
                      updated
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-correct-700">
                      Subjects:
                    </span>
                    <div className="text-correct-600">
                      <span className="font-mono">
                        {lastSyncResult.details.newSubjects}
                      </span>{" "}
                      new,{" "}
                      <span className="font-mono">
                        {lastSyncResult.subjectsSynced}
                      </span>{" "}
                      synced
                    </div>
                  </div>
                  {lastSyncResult.details.skippedQuestions > 0 && (
                    <div className="col-span-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-pending-500" />
                      <span className="text-pending-600 font-sans">
                        <span className="font-mono">
                          {lastSyncResult.details.skippedQuestions}
                        </span>{" "}
                        questions skipped
                      </span>
                    </div>
                  )}
                </div>
              )}

              {lastSyncResult.error && (
                <div className="text-xs text-incorrect-700 font-mono bg-incorrect-100 p-2 rounded">
                  {lastSyncResult.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
