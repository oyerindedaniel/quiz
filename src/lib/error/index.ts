import { ErrorLogEntry } from "@/types";
import { generateUUID, formatDate } from "../utils/index";

export class ErrorManager {
  private static errors: ErrorLogEntry[] = [];
  private static maxErrors = 1000;

  /**
   * Log an error
   */
  public static logError(
    type: ErrorLogEntry["type"],
    message: string,
    context: string,
    error?: Error
  ): ErrorLogEntry {
    const errorEntry: ErrorLogEntry = {
      id: generateUUID(),
      type,
      message,
      context,
      timestamp: formatDate(),
      stack: error?.stack,
    };

    this.errors.unshift(errorEntry);

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    this.logToConsole(errorEntry);

    return errorEntry;
  }

  /**
   * Log to console with appropriate level
   */
  private static logToConsole(errorEntry: ErrorLogEntry): void {
    const logMessage = `[${errorEntry.type.toUpperCase()}] ${
      errorEntry.context
    }: ${errorEntry.message}`;

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

  /**
   * Get all errors
   */
  public static getErrors(): ErrorLogEntry[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  public static getErrorsByType(type: ErrorLogEntry["type"]): ErrorLogEntry[] {
    return this.errors.filter((error) => error.type === type);
  }

  /**
   * Get recent errors (last n)
   */
  public static getRecentErrors(limit: number = 50): ErrorLogEntry[] {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear all errors
   */
  public static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Clear errors by type
   */
  public static clearErrorsByType(type: ErrorLogEntry["type"]): void {
    this.errors = this.errors.filter((error) => error.type !== type);
  }

  /**
   * Get error statistics
   */
  public static getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {
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

/**
 * Database error handler
 */
export class DatabaseError extends Error {
  public readonly type = "database";
  public readonly context: string;
  public readonly originalError?: Error;

  constructor(message: string, context: string, originalError?: Error) {
    super(message);
    this.name = "DatabaseError";
    this.context = context;
    this.originalError = originalError;

    ErrorManager.logError("database", message, context, originalError || this);
  }
}

/**
 * Sync error handler
 */
export class SyncError extends Error {
  public readonly type = "sync";
  public readonly context: string;
  public readonly originalError?: Error;

  constructor(message: string, context: string, originalError?: Error) {
    super(message);
    this.name = "SyncError";
    this.context = context;
    this.originalError = originalError;

    ErrorManager.logError("sync", message, context, originalError || this);
  }
}

/**
 * Quiz error handler
 */
export class QuizError extends Error {
  public readonly type = "quiz";
  public readonly context: string;
  public readonly originalError?: Error;

  constructor(message: string, context: string, originalError?: Error) {
    super(message);
    this.name = "QuizError";
    this.context = context;
    this.originalError = originalError;

    // Log the error
    ErrorManager.logError("quiz", message, context, originalError || this);
  }
}

/**
 * Network error handler
 */
export class NetworkError extends Error {
  public readonly type = "network";
  public readonly context: string;
  public readonly originalError?: Error;

  constructor(message: string, context: string, originalError?: Error) {
    super(message);
    this.name = "NetworkError";
    this.context = context;
    this.originalError = originalError;

    // Log the error
    ErrorManager.logError("network", message, context, originalError || this);
  }
}

/**
 * Async error handler wrapper
 */
export function handleAsyncError<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  errorType: ErrorLogEntry["type"] = "database"
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      switch (errorType) {
        case "database":
          throw new DatabaseError(
            errorMessage,
            context,
            error instanceof Error ? error : undefined
          );
        case "sync":
          throw new SyncError(
            errorMessage,
            context,
            error instanceof Error ? error : undefined
          );
        case "quiz":
          throw new QuizError(
            errorMessage,
            context,
            error instanceof Error ? error : undefined
          );
        case "network":
          throw new NetworkError(
            errorMessage,
            context,
            error instanceof Error ? error : undefined
          );
        default:
          ErrorManager.logError(
            errorType,
            errorMessage,
            context,
            error instanceof Error ? error : undefined
          );
          throw error;
      }
    }
  };
}

/**
 * Sync error handler wrapper
 */
export function handleSyncError<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) {
  return handleAsyncError(fn, context, "sync");
}

/**
 * Database error handler wrapper
 */
export function handleDatabaseError<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) {
  return handleAsyncError(fn, context, "database");
}

/**
 * Quiz error handler wrapper
 */
export function handleQuizError<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) {
  return handleAsyncError(fn, context, "quiz");
}

/**
 * Network error handler wrapper
 */
export function handleNetworkError<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) {
  return handleAsyncError(fn, context, "network");
}

/**
 * Normalize error
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
