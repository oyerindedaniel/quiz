import { useState, useEffect, useCallback } from "react";
import type { ConnectivityStatus } from "@/types/app";

export function useConnectivity() {
  const [status, setStatus] = useState<ConnectivityStatus>({
    isOnline: navigator.onLine,
    isChecking: false,
    lastChecked: new Date(),
  });

  const checkConnectivity = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const response = await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });

      setStatus({
        isOnline: true,
        isChecking: false,
        lastChecked: new Date(),
      });
    } catch {
      setStatus({
        isOnline: false,
        isChecking: false,
        lastChecked: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        lastChecked: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        lastChecked: new Date(),
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    checkConnectivity();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnectivity]);

  return {
    ...status,
    checkConnectivity,
  };
}
