"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.QuizError = exports.SyncError = exports.DatabaseError = exports.ErrorManager = void 0;
exports.handleAsyncError = handleAsyncError;
exports.handleSyncError = handleSyncError;
exports.handleDatabaseError = handleDatabaseError;
exports.handleQuizError = handleQuizError;
exports.handleNetworkError = handleNetworkError;
exports.normalizeError = normalizeError;
const lib_js_1 = require("../utils/lib.js");
class ErrorManager {
    static logError(type, message, context, error) {
        const errorEntry = {
            id: (0, lib_js_1.generateUUID)(),
            type,
            message,
            context,
            timestamp: (0, lib_js_1.formatDate)(),
            stack: error?.stack,
        };
        this.errors.unshift(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }
        this.logToConsole(errorEntry);
        return errorEntry;
    }
    static logToConsole(errorEntry) {
        const logMessage = `[${errorEntry.type.toUpperCase()}] ${errorEntry.context}: ${errorEntry.message}`;
        switch (errorEntry.type) {
            case "database":
            case "sync":
                console.error(logMessage, errorEntry.stack);
                break;
            case "network":
                console.warn(logMessage);
                break;
            case "quiz":
                console.info(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }
    static getErrors() {
        return [...this.errors];
    }
    static getErrorsByType(type) {
        return this.errors.filter((error) => error.type === type);
    }
    static getRecentErrors(limit = 50) {
        return this.errors.slice(0, limit);
    }
    static clearErrors() {
        this.errors = [];
    }
    static clearErrorsByType(type) {
        this.errors = this.errors.filter((error) => error.type !== type);
    }
    static getErrorStats() {
        const stats = {
            total: this.errors.length,
            database: 0,
            sync: 0,
            quiz: 0,
            network: 0,
        };
        this.errors.forEach((error) => {
            stats[error.type]++;
        });
        return stats;
    }
}
exports.ErrorManager = ErrorManager;
ErrorManager.errors = [];
ErrorManager.maxErrors = 1000;
class DatabaseError extends Error {
    constructor(message, context, originalError) {
        super(message);
        this.type = "database";
        this.name = "DatabaseError";
        this.context = context;
        this.originalError = originalError;
        ErrorManager.logError("database", message, context, originalError || this);
    }
}
exports.DatabaseError = DatabaseError;
class SyncError extends Error {
    constructor(message, context, originalError) {
        super(message);
        this.type = "sync";
        this.name = "SyncError";
        this.context = context;
        this.originalError = originalError;
        ErrorManager.logError("sync", message, context, originalError || this);
    }
}
exports.SyncError = SyncError;
class QuizError extends Error {
    constructor(message, context, originalError) {
        super(message);
        this.type = "quiz";
        this.name = "QuizError";
        this.context = context;
        this.originalError = originalError;
        ErrorManager.logError("quiz", message, context, originalError || this);
    }
}
exports.QuizError = QuizError;
class NetworkError extends Error {
    constructor(message, context, originalError) {
        super(message);
        this.type = "network";
        this.name = "NetworkError";
        this.context = context;
        this.originalError = originalError;
        ErrorManager.logError("network", message, context, originalError || this);
    }
}
exports.NetworkError = NetworkError;
function handleAsyncError(fn, context, errorType = "database") {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            switch (errorType) {
                case "database":
                    throw new DatabaseError(errorMessage, context, error instanceof Error ? error : undefined);
                case "sync":
                    throw new SyncError(errorMessage, context, error instanceof Error ? error : undefined);
                case "quiz":
                    throw new QuizError(errorMessage, context, error instanceof Error ? error : undefined);
                case "network":
                    throw new NetworkError(errorMessage, context, error instanceof Error ? error : undefined);
                default:
                    ErrorManager.logError(errorType, errorMessage, context, error instanceof Error ? error : undefined);
                    throw error;
            }
        }
    };
}
function handleSyncError(fn, context) {
    return handleAsyncError(fn, context, "sync");
}
function handleDatabaseError(fn, context) {
    return handleAsyncError(fn, context, "database");
}
function handleQuizError(fn, context) {
    return handleAsyncError(fn, context, "quiz");
}
function handleNetworkError(fn, context) {
    return handleAsyncError(fn, context, "network");
}
function normalizeError(error) {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
}
