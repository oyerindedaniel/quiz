import { v4 as uuidv4 } from "uuid";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Parse JSON safely with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
    return fallback;
  }
}

/**
 * Validate student code format
 */
export function validateStudentCode(code: string): boolean {
  // Student code should be alphanumeric, 6-12 characters
  const pattern = /^[A-Z0-9]{6,12}$/i;
  return pattern.test(code.trim());
}

/**
 * Validate subject code format
 */
export function validateSubjectCode(code: string): boolean {
  // Subject code should be letters followed by numbers, e.g., MATH101
  const pattern = /^[A-Z]{2,6}\d{2,4}$/i;
  return pattern.test(code.trim());
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

/**
 * Calculate percentage
 */
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Combines class names with Tailwind's merging strategy
 * Uses clsx for conditional class names and twMerge to handle Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Recursively serializes all Date instances in the object into ISO strings.
 *
 * @param data - An object possibly containing Date values
 * @returns A copy of the object with Dates stringified
 */
export function serializeData<T>(data: T): Serialized<T> {
  if (data instanceof Date) {
    return data.toISOString() as Serialized<T>;
  }

  if (Array.isArray(data)) {
    return data.map(serializeData) as Serialized<T>;
  }

  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeData(value);
    }

    return result as Serialized<T>;
  }

  return data as Serialized<T>;
}

/**
 * Recursively maps all Date types in an object to string.
 */
type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
  ? Array<Serialized<U>>
  : T extends object
  ? {
      [K in keyof T]: Serialized<T[K]>;
    }
  : T;
