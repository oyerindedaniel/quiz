import { useState, useEffect, useCallback } from "react";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAdminData<T>(
  fetchFunction: (ipcDb: IPCDatabaseService) => Promise<T>,
  options: UseAdminDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const ipcDb = new IPCDatabaseService();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFunction(ipcDb);
      setData(result);
    } catch (error) {
      console.error("Failed to load data:", error);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction, ipcDb]);

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadData, autoRefresh, refreshInterval]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
