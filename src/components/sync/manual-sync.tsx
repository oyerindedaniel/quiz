import { Button } from "../ui/button";
import { isElectron } from "@/utils/lib";
import { toast } from "sonner";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const dbService = new IPCDatabaseService();

// Note: This is a manual sync button for the initial sync of the local database if localDB is empty
export default function ManualSync() {
  const handleSyncLocalDB = async () => {
    if (!isElectron()) {
      toast.success("This application requires Electron to run");
      return;
    }

    const syncPromise = dbService.syncLocalDB();

    toast.promise(syncPromise, {
      loading: "Syncing local database...",
      success: (result) => {
        if (result.success) {
          return (
            result.message ||
            `Synced ${result.totalSynced || 0} questions successfully`
          );
        }
        throw new Error(result.error || "Sync failed");
      },
      error: (error) => {
        if (error.message?.includes("not empty")) {
          return "Database already contains data - sync skipped";
        }
        return `Sync failed: ${error.message || "Unknown error"}`;
      },
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSyncLocalDB}
          className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-gray-50 text-gray-700 font-sans w-10 h-10 p-0 rounded-full"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Sync Local Database (initial sync)</p>
      </TooltipContent>
    </Tooltip>
  );
}
