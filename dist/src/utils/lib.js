"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = generateUUID;
exports.formatDate = formatDate;
exports.safeJsonParse = safeJsonParse;
exports.validateStudentCode = validateStudentCode;
exports.validateSubjectCode = validateSubjectCode;
exports.sanitizeInput = sanitizeInput;
exports.calculatePercentage = calculatePercentage;
exports.formatDuration = formatDuration;
exports.debounce = debounce;
exports.isElectron = isElectron;
exports.sleep = sleep;
exports.cn = cn;
const uuid_1 = require("uuid");
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
/**
 * Generate a UUID v4
 */
function generateUUID() {
    return (0, uuid_1.v4)();
}
/**
 * Format date to ISO string
 */
function formatDate(date = new Date()) {
    return date.toISOString();
}
/**
 * Parse JSON safely with fallback
 */
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch (error) {
        console.warn("Failed to parse JSON:", error);
        return fallback;
    }
}
/**
 * Validate student code format
 */
function validateStudentCode(code) {
    // Student code should be alphanumeric, 6-12 characters
    const pattern = /^[A-Z0-9]{6,12}$/i;
    return pattern.test(code.trim());
}
/**
 * Validate subject code format
 */
function validateSubjectCode(code) {
    // Subject code should be letters followed by numbers, e.g., MATH101
    const pattern = /^[A-Z]{2,6}\d{2,4}$/i;
    return pattern.test(code.trim());
}
/**
 * Sanitize input string
 */
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim();
}
/**
 * Calculate percentage
 */
function calculatePercentage(correct, total) {
    if (total === 0)
        return 0;
    return Math.round((correct / total) * 100);
}
/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    else {
        return `${remainingSeconds}s`;
    }
}
/**
 * Debounce function
 */
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
/**
 * Check if running in Electron environment
 */
function isElectron() {
    return typeof window !== "undefined" && !!window.electronAPI;
}
/**
 * Sleep function for async operations
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Combines class names with Tailwind's merging strategy
 * Uses clsx for conditional class names and twMerge to handle Tailwind conflicts
 */
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
