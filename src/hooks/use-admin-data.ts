import { useState, useEffect, useCallback, useRef } from "react";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { useStableHandler } from "./use-stable-handler";
import { useLatestValue } from "./use-latest-value";

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxRetries?: number;
}

const ipcDb = new IPCDatabaseService();

export function useAdminData<T>(
  fetchFunction: (ipcDb: IPCDatabaseService) => Promise<T>,
  options: UseAdminDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isLoadingRef = useLatestValue(isLoading);

  const {
    autoRefresh = false,
    refreshInterval = 60000,
    maxRetries = 3,
  } = options;

  const fetchFunctionRef = useStableHandler(fetchFunction);

  const loadData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFunctionRef(ipcDb);
      setData(result as T);
      retryCountRef.current = 0;
    } catch (error) {
      console.error("Failed to load data:", error);
      retryCountRef.current++;

      if (retryCountRef.current >= maxRetries) {
        setError("Failed to load data after multiple attempts");
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunctionRef, maxRetries]);

  useEffect(() => {
    loadData();

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh && retryCountRef.current < maxRetries) {
      interval = setInterval(() => {
        if (!isLoadingRef.current) {
          loadData();
        }
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    retryCountRef.current = 0;
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
