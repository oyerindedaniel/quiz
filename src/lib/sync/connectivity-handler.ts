import { SyncError } from "@/lib/error";

export type ConnectivityStatus = "online" | "offline" | "checking";

export interface NetworkInfo {
  isOnline: boolean;
  connectionType?: "wifi" | "cellular" | "ethernet" | "unknown";
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink?: number; // Effective bandwidth estimate in megabits per second
  rtt?: number; // Effective round-trip time in milliseconds
}

export class ConnectivityHandler {
  private isInitialized = false;
  private currentStatus: ConnectivityStatus = "checking";
  private listeners: Array<
    (isOnline: boolean, networkInfo?: NetworkInfo) => void
  > = [];
  private checkIntervalId: NodeJS.Timeout | null = null;
  private lastCheckTime = 0;
  private checkCooldown = 5000; // 5 seconds between checks

  constructor() {}

  /**
   * Initialize connectivity monitoring
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log(
        "ConnectivityHandler: Initializing connectivity monitoring..."
      );

      // Set up browser connectivity listeners
      this.setupBrowserListeners();

      // Perform initial connectivity check
      this.checkConnectivity().then((isOnline) => {
        this.currentStatus = isOnline ? "online" : "offline";
        console.log(
          `ConnectivityHandler: Initial status: ${this.currentStatus}`
        );
      });

      this.isInitialized = true;
      console.log("ConnectivityHandler: Initialization complete");
    } catch (error) {
      console.error("ConnectivityHandler: Initialization failed:", error);
      throw new SyncError(
        "Failed to initialize connectivity handler",
        "connectivity_init",
        error as Error
      );
    }
  }

  /**
   * Check current connectivity status
   */
  async checkConnectivity(): Promise<boolean> {
    const now = Date.now();

    // Respect cooldown period to avoid excessive checks
    if (now - this.lastCheckTime < this.checkCooldown) {
      return this.currentStatus === "online";
    }

    this.lastCheckTime = now;

    try {
      console.log("ConnectivityHandler: Checking connectivity...");

      // First check navigator.onLine
      if (!navigator.onLine) {
        this.updateStatus(false);
        return false;
      }

      // Perform actual network test
      const isReallyOnline = await this.performNetworkTest();
      this.updateStatus(isReallyOnline);

      return isReallyOnline;
    } catch (error) {
      console.error("ConnectivityHandler: Connectivity check failed:", error);
      this.updateStatus(false);
      return false;
    }
  }

  /**
   * Get current connectivity status
   */
  getStatus(): ConnectivityStatus {
    return this.currentStatus;
  }

  /**
   * Get detailed network information
   */
  getNetworkInfo(): NetworkInfo {
    const connection = this.getNetworkConnection();

    return {
      isOnline: this.currentStatus === "online",
      connectionType: this.getConnectionType(connection),
      effectiveType: connection?.effectiveType || "unknown",
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }

  /**
   * Register callback for connectivity changes
   */
  onConnectivityChange(
    callback: (isOnline: boolean, networkInfo?: NetworkInfo) => void
  ): void {
    this.listeners.push(callback);
  }

  /**
   * Unregister connectivity change callback
   */
  offConnectivityChange(
    callback: (isOnline: boolean, networkInfo?: NetworkInfo) => void
  ): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Force a connectivity check regardless of cooldown
   */
  async forceCheck(): Promise<boolean> {
    this.lastCheckTime = 0; // Reset cooldown
    return this.checkConnectivity();
  }

  /**
   * Start periodic connectivity monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkIntervalId) {
      return; // Already monitoring
    }

    this.checkIntervalId = setInterval(async () => {
      try {
        await this.checkConnectivity();
      } catch (error) {
        console.error("ConnectivityHandler: Periodic check failed:", error);
      }
    }, intervalMs);

    console.log(
      `ConnectivityHandler: Started periodic monitoring (${intervalMs}ms interval)`
    );
  }

  /**
   * Stop periodic connectivity monitoring
   */
  stopMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log("ConnectivityHandler: Stopped periodic monitoring");
    }
  }

  /**
   * Test connection quality
   */
  async testConnectionQuality(): Promise<{
    latency: number;
    bandwidth: number;
    quality: "excellent" | "good" | "fair" | "poor";
  }> {
    try {
      const startTime = performance.now();

      // Test with a small endpoint
      const response = await fetch(
        `${window.location.origin}/favicon.ico?t=${Date.now()}`,
        {
          method: "HEAD",
          cache: "no-cache",
          signal: AbortSignal.timeout(5000),
        }
      );

      const latency = performance.now() - startTime;

      if (!response.ok) {
        throw new Error("Network test request failed");
      }

      // Estimate quality based on latency
      let quality: "excellent" | "good" | "fair" | "poor";
      if (latency < 100) quality = "excellent";
      else if (latency < 300) quality = "good";
      else if (latency < 1000) quality = "fair";
      else quality = "poor";

      // Get connection info for bandwidth estimate
      const connection = this.getNetworkConnection();
      const bandwidth = connection?.downlink || 0;

      return { latency, bandwidth, quality };
    } catch (error) {
      console.error(
        "ConnectivityHandler: Connection quality test failed:",
        error
      );
      return { latency: 9999, bandwidth: 0, quality: "poor" };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log("ConnectivityHandler: Cleaning up...");

    this.stopMonitoring();
    this.removeBrowserListeners();
    this.listeners.length = 0;
    this.isInitialized = false;

    console.log("ConnectivityHandler: Cleanup completed");
  }

  // Private Methods

  private setupBrowserListeners(): void {
    if (typeof window === "undefined") {
      return; // Not in browser environment
    }

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Listen for network connection changes (if supported)
    const connection = this.getNetworkConnection();
    if (connection) {
      connection.addEventListener(
        "change",
        this.handleConnectionChange.bind(this)
      );
    }

    // Listen for visibility changes (to check connectivity when app becomes visible)
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
  }

  private removeBrowserListeners(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    const connection = this.getNetworkConnection();
    if (connection) {
      connection.removeEventListener(
        "change",
        this.handleConnectionChange.bind(this)
      );
    }

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
  }

  private async performNetworkTest(): Promise<boolean> {
    try {
      // Test multiple endpoints for reliability
      const testEndpoints = [
        `${window.location.origin}/favicon.ico`,
        "https://www.google.com/favicon.ico",
        "https://httpbin.org/status/200",
      ];

      // Try endpoints with timeouts
      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(`${endpoint}?t=${Date.now()}`, {
            method: "HEAD",
            mode: endpoint.startsWith(window.location.origin)
              ? "same-origin"
              : "no-cors",
            cache: "no-cache",
            signal: AbortSignal.timeout(3000),
          });

          // If any endpoint succeeds, we're online
          if (response.ok || response.type === "opaque") {
            console.log(
              `ConnectivityHandler: Network test passed (${endpoint})`
            );
            return true;
          }
        } catch (error) {
          console.warn(
            `ConnectivityHandler: Test failed for ${endpoint}:`,
            error
          );
          continue;
        }
      }

      console.log("ConnectivityHandler: All network tests failed");
      return false;
    } catch (error) {
      console.error("ConnectivityHandler: Network test error:", error);
      return false;
    }
  }

  private getNetworkConnection(): any {
    // Try to get network connection info (experimental API)
    if (typeof navigator !== "undefined") {
      return (
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection
      );
    }
    return null;
  }

  private getConnectionType(
    connection: any
  ): "wifi" | "cellular" | "ethernet" | "unknown" {
    if (!connection) {
      return "unknown";
    }

    const type = connection.type || connection.effectiveType;

    if (type === "wifi") return "wifi";
    if (type === "ethernet") return "ethernet";
    if (["cellular", "2g", "3g", "4g", "slow-2g"].includes(type))
      return "cellular";

    return "unknown";
  }

  private updateStatus(isOnline: boolean): void {
    const newStatus: ConnectivityStatus = isOnline ? "online" : "offline";

    if (newStatus !== this.currentStatus) {
      const oldStatus = this.currentStatus;
      this.currentStatus = newStatus;

      console.log(
        `ConnectivityHandler: Status changed from ${oldStatus} to ${newStatus}`
      );

      // Notify listeners
      const networkInfo = this.getNetworkInfo();
      this.listeners.forEach((listener) => {
        try {
          listener(isOnline, networkInfo);
        } catch (error) {
          console.error("ConnectivityHandler: Listener error:", error);
        }
      });
    }
  }

  private handleOnline(): void {
    console.log("ConnectivityHandler: Browser online event received");
    // Verify with actual network test
    this.checkConnectivity();
  }

  private handleOffline(): void {
    console.log("ConnectivityHandler: Browser offline event received");
    this.updateStatus(false);
  }

  private handleConnectionChange(): void {
    console.log("ConnectivityHandler: Network connection changed");
    // Re-check connectivity when connection properties change
    this.checkConnectivity();
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      console.log(
        "ConnectivityHandler: App became visible, checking connectivity"
      );
      // Check connectivity when app becomes visible
      this.checkConnectivity();
    }
  }
}
