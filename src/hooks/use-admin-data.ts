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
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isLoadingRef = useLatestValue(isLoading);
  const isRefetchingRef = useLatestValue(isRefetching);
  const hasDataRef = useLatestValue(!!data);

  const {
    autoRefresh = false,
    refreshInterval = 60000,
    maxRetries = 3,
  } = options;

  const fetchFunctionRef = useStableHandler(fetchFunction);

  const loadData = useCallback(
    async (isBackgroundRefetch = false) => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 1000) {
        return;
      }
      lastFetchTimeRef.current = now;

      try {
        // For background refetch (when we have data), show refetching indicator
        // For initial load (no data), show loading indicator
        if (isBackgroundRefetch && hasDataRef.current) {
          setIsRefetching(true);
        } else {
          setIsLoading(true);
        }

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
        setIsRefetching(false);
      }
    },
    [fetchFunctionRef, maxRetries, hasDataRef]
  );

  useEffect(() => {
    loadData(false); // Initial load

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh && retryCountRef.current < maxRetries) {
      interval = setInterval(() => {
        if (!isLoadingRef.current && !isRefetchingRef.current) {
          loadData(true); // Background refetch
        }
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    // removed all dependencies to avoid re-renders
    // sole purpose of this useeffect is to trigger inital fetch and set up auto refresh
  }, []);

  const refresh = useCallback(() => {
    retryCountRef.current = 0;
    loadData(!!data); // Use background refetch if we have existing data
  }, [loadData, data]);

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refresh,
  };
}
