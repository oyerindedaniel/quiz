"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectivityHandler = void 0;
const err_js_1 = require("../../error/err.js");
class ConnectivityHandler {
    constructor() {
        this.isInitialized = false;
        this.currentStatus = "checking";
        this.listeners = [];
        this.checkIntervalId = null;
        this.lastCheckTime = 0;
        this.checkCooldown = 5000; // 5 seconds between checks
    }
    /**
     * Initialize connectivity monitoring
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            console.log("ConnectivityHandler: Initializing connectivity monitoring...");
            this.setupBrowserListeners();
            this.checkConnectivity().then((isOnline) => {
                this.currentStatus = isOnline ? "online" : "offline";
                console.log(`ConnectivityHandler: Initial status: ${this.currentStatus}`);
            });
            this.isInitialized = true;
            console.log("ConnectivityHandler: Initialization complete");
        }
        catch (error) {
            console.error("ConnectivityHandler: Initialization failed:", error);
            throw new err_js_1.SyncError("Failed to initialize connectivity handler", "connectivity_init", (0, err_js_1.normalizeError)(error));
        }
    }
    /**
     * Check current connectivity status
     */
    async checkConnectivity() {
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
        }
        catch (error) {
            console.error("ConnectivityHandler: Connectivity check failed:", error);
            this.updateStatus(false);
            return false;
        }
    }
    /**
     * Get current connectivity status
     */
    getStatus() {
        return this.currentStatus;
    }
    /**
     * Get detailed network information
     */
    getNetworkInfo() {
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
    onConnectivityChange(callback) {
        this.listeners.push(callback);
    }
    /**
     * Unregister connectivity change callback
     */
    offConnectivityChange(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    /**
     * Force a connectivity check regardless of cooldown
     */
    async forceCheck() {
        this.lastCheckTime = 0; // Reset cooldown
        return this.checkConnectivity();
    }
    /**
     * Start periodic connectivity monitoring
     */
    startMonitoring(intervalMs = 30000) {
        if (this.checkIntervalId) {
            return; // Already monitoring
        }
        this.checkIntervalId = setInterval(async () => {
            try {
                await this.checkConnectivity();
            }
            catch (error) {
                console.error("ConnectivityHandler: Periodic check failed:", error);
            }
        }, intervalMs);
        console.log(`ConnectivityHandler: Started periodic monitoring (${intervalMs}ms interval)`);
    }
    /**
     * Stop periodic connectivity monitoring
     */
    stopMonitoring() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
            console.log("ConnectivityHandler: Stopped periodic monitoring");
        }
    }
    /**
     * Test connection quality
     */
    async testConnectionQuality() {
        try {
            const startTime = performance.now();
            // Test with a small endpoint
            const response = await fetch(`${window.location.origin}/favicon.ico?t=${Date.now()}`, {
                method: "HEAD",
                cache: "no-cache",
                signal: AbortSignal.timeout(5000),
            });
            const latency = performance.now() - startTime;
            if (!response.ok) {
                throw new Error("Network test request failed");
            }
            // Estimate quality based on latency
            let quality;
            if (latency < 100)
                quality = "excellent";
            else if (latency < 300)
                quality = "good";
            else if (latency < 1000)
                quality = "fair";
            else
                quality = "poor";
            // Get connection info for bandwidth estimate
            const connection = this.getNetworkConnection();
            const bandwidth = connection?.downlink || 0;
            return { latency, bandwidth, quality };
        }
        catch (error) {
            console.error("ConnectivityHandler: Connection quality test failed:", error);
            return { latency: 9999, bandwidth: 0, quality: "poor" };
        }
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        console.log("ConnectivityHandler: Cleaning up...");
        this.stopMonitoring();
        this.removeBrowserListeners();
        this.listeners.length = 0;
        this.isInitialized = false;
        console.log("ConnectivityHandler: Cleanup completed");
    }
    setupBrowserListeners() {
        if (typeof window === "undefined") {
            return;
        }
        window.addEventListener("online", this.handleOnline.bind(this));
        window.addEventListener("offline", this.handleOffline.bind(this));
        // Listen for network connection changes (if supported)
        const connection = this.getNetworkConnection();
        if (connection) {
            connection.addEventListener("change", this.handleConnectionChange.bind(this));
        }
        document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
    }
    removeBrowserListeners() {
        if (typeof window === "undefined") {
            return;
        }
        window.removeEventListener("online", this.handleOnline.bind(this));
        window.removeEventListener("offline", this.handleOffline.bind(this));
        const connection = this.getNetworkConnection();
        if (connection) {
            connection.removeEventListener("change", this.handleConnectionChange.bind(this));
        }
        document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
    }
    async performNetworkTest() {
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
                        console.log(`ConnectivityHandler: Network test passed (${endpoint})`);
                        return true;
                    }
                }
                catch (error) {
                    console.warn(`ConnectivityHandler: Test failed for ${endpoint}:`, error);
                    continue;
                }
            }
            console.log("ConnectivityHandler: All network tests failed");
            return false;
        }
        catch (error) {
            console.error("ConnectivityHandler: Network test error:", error);
            return false;
        }
    }
    getNetworkConnection() {
        // Try to get network connection info (experimental API)
        if (typeof navigator !== "undefined") {
            return (navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection);
        }
        return null;
    }
    getConnectionType(connection) {
        if (!connection) {
            return "unknown";
        }
        const type = connection.type || connection.effectiveType;
        if (type === "wifi")
            return "wifi";
        if (type === "ethernet")
            return "ethernet";
        if (type &&
            (type.includes("cellular") || type.includes("4g") || type.includes("3g"))) {
            return "cellular";
        }
        return "unknown";
    }
    analyzeNetworkQuality() {
        const connection = this.getNetworkConnection();
        return {
            effectiveType: connection?.effectiveType || "unknown",
            downlink: connection?.downlink || 0,
            rtt: connection?.rtt || 0,
            connection,
        };
    }
    updateStatus(isOnline) {
        const newStatus = isOnline ? "online" : "offline";
        if (newStatus !== this.currentStatus) {
            const oldStatus = this.currentStatus;
            this.currentStatus = newStatus;
            console.log(`ConnectivityHandler: Status changed from ${oldStatus} to ${newStatus}`);
            // Notify listeners
            const networkInfo = this.getNetworkInfo();
            this.listeners.forEach((listener) => {
                try {
                    listener(isOnline, networkInfo);
                }
                catch (error) {
                    console.error("ConnectivityHandler: Listener error:", error);
                }
            });
        }
    }
    handleOnline() {
        console.log("ConnectivityHandler: Browser online event received");
        this.checkConnectivity();
    }
    handleOffline() {
        console.log("ConnectivityHandler: Browser offline event received");
        this.updateStatus(false);
    }
    handleConnectionChange() {
        console.log("ConnectivityHandler: Network connection changed");
        this.checkConnectivity();
    }
    handleVisibilityChange() {
        if (document.visibilityState === "visible") {
            console.log("ConnectivityHandler: App became visible, checking connectivity");
            // Check connectivity when app becomes visible
            this.checkConnectivity();
        }
    }
}
exports.ConnectivityHandler = ConnectivityHandler;
