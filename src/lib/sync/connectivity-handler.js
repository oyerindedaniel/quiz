"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectivityHandler = void 0;
const err_js_1 = require("../../error/err.js");
const dns = __importStar(require("dns"));
const net = __importStar(require("net"));
const util_1 = require("util");
const dnsLookup = (0, util_1.promisify)(dns.lookup);
const dnsResolve = (0, util_1.promisify)(dns.resolve);
class ConnectivityHandler {
    constructor() {
        this.isInitialized = false;
        this.currentStatus = "checking";
        this.listeners = [];
        this.checkIntervalId = null;
        this.lastCheckTime = 0;
        this.checkCooldown = 5000;
    }
    initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            console.log("ConnectivityHandler: Initializing connectivity monitoring for main process...");
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
    async checkConnectivity() {
        const now = Date.now();
        const cooldown = this.isInitialized ? this.checkCooldown : 1000;
        if (now - this.lastCheckTime < cooldown) {
            return this.currentStatus === "online";
        }
        this.lastCheckTime = now;
        try {
            console.log("ConnectivityHandler: Checking connectivity...");
            const isOnline = await this.performNetworkTest();
            this.updateStatus(isOnline);
            return isOnline;
        }
        catch (error) {
            console.error("ConnectivityHandler: Connectivity check failed:", error);
            this.updateStatus(false);
            return false;
        }
    }
    getStatus() {
        return this.currentStatus;
    }
    getNetworkInfo() {
        return {
            isOnline: this.currentStatus === "online",
            connectionType: "unknown",
        };
    }
    onConnectivityChange(callback) {
        this.listeners.push(callback);
    }
    offConnectivityChange(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    async forceCheck() {
        this.lastCheckTime = 0;
        return this.checkConnectivity();
    }
    startMonitoring(intervalMs = 30000) {
        if (this.checkIntervalId) {
            return;
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
    stopMonitoring() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
            console.log("ConnectivityHandler: Stopped periodic monitoring");
        }
    }
    async testConnectionQuality() {
        try {
            const startTime = Date.now();
            await dnsResolve("google.com", "A");
            const latency = Date.now() - startTime;
            let quality;
            if (latency < 100)
                quality = "excellent";
            else if (latency < 300)
                quality = "good";
            else if (latency < 1000)
                quality = "fair";
            else
                quality = "poor";
            return { latency, dnsResolution: true, quality };
        }
        catch (error) {
            console.error("ConnectivityHandler: Connection quality test failed:", error);
            return { latency: 9999, dnsResolution: false, quality: "poor" };
        }
    }
    cleanup() {
        console.log("ConnectivityHandler: Cleaning up...");
        this.stopMonitoring();
        this.listeners.length = 0;
        this.isInitialized = false;
        console.log("ConnectivityHandler: Cleanup completed");
    }
    async performNetworkTest() {
        try {
            console.log("ConnectivityHandler: Performing network test...");
            try {
                await dnsResolve("google.com", "A");
                console.log("ConnectivityHandler: DNS test passed (google.com)");
                return true;
            }
            catch (dnsError) {
                console.warn("ConnectivityHandler: DNS test failed (google.com):", (0, err_js_1.normalizeError)(dnsError).message);
            }
            try {
                await dnsResolve("cloudflare.com", "A");
                console.log("ConnectivityHandler: DNS test passed (cloudflare.com)");
                return true;
            }
            catch (dnsError) {
                console.warn("ConnectivityHandler: DNS test failed (cloudflare.com):", (0, err_js_1.normalizeError)(dnsError).message);
            }
            try {
                await dnsLookup("8.8.8.8");
                console.log("ConnectivityHandler: DNS lookup test passed (8.8.8.8)");
                return true;
            }
            catch (lookupError) {
                console.warn("ConnectivityHandler: DNS lookup test failed (8.8.8.8):", (0, err_js_1.normalizeError)(lookupError).message);
            }
            try {
                await this.testSocketConnection("8.8.8.8", 53, 2000);
                console.log("ConnectivityHandler: Socket test passed (8.8.8.8:53)");
                return true;
            }
            catch (socketError) {
                console.warn("ConnectivityHandler: Socket test failed (8.8.8.8:53):", (0, err_js_1.normalizeError)(socketError).message);
            }
            try {
                await this.testSocketConnection("1.1.1.1", 53, 2000);
                console.log("ConnectivityHandler: Socket test passed (1.1.1.1:53)");
                return true;
            }
            catch (socketError) {
                console.warn("ConnectivityHandler: Socket test failed (1.1.1.1:53):", (0, err_js_1.normalizeError)(socketError).message);
            }
            console.log("ConnectivityHandler: All network tests failed - offline");
            return false;
        }
        catch (error) {
            console.error("ConnectivityHandler: Network test error:", error);
            return false;
        }
    }
    testSocketConnection(host, port, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const onError = (error) => {
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
    updateStatus(isOnline) {
        const newStatus = isOnline ? "online" : "offline";
        if (newStatus !== this.currentStatus) {
            const oldStatus = this.currentStatus;
            this.currentStatus = newStatus;
            console.log(`ConnectivityHandler: Status changed from ${oldStatus} to ${newStatus}`);
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
}
exports.ConnectivityHandler = ConnectivityHandler;
