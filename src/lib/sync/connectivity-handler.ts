import { normalizeError, SyncError } from "../../error/err.js";
import * as dns from "dns";
import * as net from "net";
import { promisify } from "util";

export type ConnectivityStatus = "online" | "offline" | "checking";

export interface NetworkInfo {
  isOnline: boolean;
  connectionType: "ethernet" | "wifi" | "unknown";
  latency?: number;
  dnsResolution?: boolean;
}

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

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
        "ConnectivityHandler: Initializing connectivity monitoring for main process..."
      );

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
        normalizeError(error)
      );
    }
  }

  /**
   * Check current connectivity status using Node.js APIs
   */
  async checkConnectivity(): Promise<boolean> {
    const now = Date.now();

    // Reduce cooldown during initialization for faster startup detection
    const cooldown = this.isInitialized ? this.checkCooldown : 1000; // 1 second during startup

    // Avoid excessive checks
    if (now - this.lastCheckTime < cooldown) {
      return this.currentStatus === "online";
    }

    this.lastCheckTime = now;

    try {
      console.log("ConnectivityHandler: Checking connectivity...");

      const isOnline = await this.performNetworkTest();
      this.updateStatus(isOnline);

      return isOnline;
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
    return {
      isOnline: this.currentStatus === "online",
      connectionType: "unknown", // In main process we can't easily detect connection type
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
    dnsResolution: boolean;
    quality: "excellent" | "good" | "fair" | "poor";
  }> {
    try {
      const startTime = Date.now();

      // Test DNS resolution
      await dnsResolve("google.com", "A");
      const latency = Date.now() - startTime;

      let quality: "excellent" | "good" | "fair" | "poor";
      if (latency < 100) quality = "excellent";
      else if (latency < 300) quality = "good";
      else if (latency < 1000) quality = "fair";
      else quality = "poor";

      return { latency, dnsResolution: true, quality };
    } catch (error) {
      console.error(
        "ConnectivityHandler: Connection quality test failed:",
        error
      );
      return { latency: 9999, dnsResolution: false, quality: "poor" };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log("ConnectivityHandler: Cleaning up...");

    this.stopMonitoring();
    this.listeners.length = 0;
    this.isInitialized = false;

    console.log("ConnectivityHandler: Cleanup completed");
  }

  /**
   * Perform network connectivity test
   */
  private async performNetworkTest(): Promise<boolean> {
    try {
      console.log("ConnectivityHandler: Performing network test...");

      // Test 1: DNS resolution to Google
      try {
        await dnsResolve("google.com", "A");
        console.log("ConnectivityHandler: DNS test passed (google.com)");
        return true;
      } catch (dnsError) {
        console.warn(
          "ConnectivityHandler: DNS test failed (google.com):",
          normalizeError(dnsError).message
        );
      }

      // Test 2: DNS resolution to alternative
      try {
        await dnsResolve("cloudflare.com", "A");
        console.log("ConnectivityHandler: DNS test passed (cloudflare.com)");
        return true;
      } catch (dnsError) {
        console.warn(
          "ConnectivityHandler: DNS test failed (cloudflare.com):",
          normalizeError(dnsError).message
        );
      }

      // Test 3: DNS lookup to Google's public DNS
      try {
        await dnsLookup("8.8.8.8");
        console.log("ConnectivityHandler: DNS lookup test passed (8.8.8.8)");
        return true;
      } catch (lookupError) {
        console.warn(
          "ConnectivityHandler: DNS lookup test failed (8.8.8.8):",
          normalizeError(lookupError).message
        );
      }

      // Test 4: Socket connection test to Google DNS
      try {
        await this.testSocketConnection("8.8.8.8", 53, 2000);
        console.log("ConnectivityHandler: Socket test passed (8.8.8.8:53)");
        return true;
      } catch (socketError) {
        console.warn(
          "ConnectivityHandler: Socket test failed (8.8.8.8:53):",
          normalizeError(socketError).message
        );
      }

      // Test 5: Socket connection test to Cloudflare DNS
      try {
        await this.testSocketConnection("1.1.1.1", 53, 2000);
        console.log("ConnectivityHandler: Socket test passed (1.1.1.1:53)");
        return true;
      } catch (socketError) {
        console.warn(
          "ConnectivityHandler: Socket test failed (1.1.1.1:53):",
          normalizeError(socketError).message
        );
      }

      console.log("ConnectivityHandler: All network tests failed - offline");
      return false;
    } catch (error) {
      console.error("ConnectivityHandler: Network test error:", error);
      return false;
    }
  }

  /**
   * Test socket connection to a host and port
   */
  private testSocketConnection(
    host: string,
    port: number,
    timeout: number = 3000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      const onError = (error: Error) => {
        socket.destroy();
        reject(error);
      };

      const onTimeout = () => {
        socket.destroy();
        reject(new Error("Socket connection timeout"));
      };

      socket.setTimeout(timeout);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);

      socket.connect(port, host, () => {
        socket.destroy();
        resolve();
      });
    });
  }

  /**
   * Update connectivity status and notify listeners
   */
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
}
