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
exports.serializeData = serializeData;
const uuid_1 = require("uuid");
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function generateUUID() {
    return (0, uuid_1.v4)();
}
function formatDate(date = new Date()) {
    return date.toISOString();
}
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch (error) {
        console.warn("Failed to parse JSON:", error);
        return fallback;
    }
}
function validateStudentCode(code) {
    const pattern = /^[A-Z0-9]{6,12}$/i;
    return pattern.test(code.trim());
}
function validateSubjectCode(code) {
    const pattern = /^[A-Z]{2,6}\d{2,4}$/i;
    return pattern.test(code.trim());
}
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim();
}
function calculatePercentage(correct, total) {
    if (total === 0)
        return 0;
    return Math.round((correct / total) * 100);
}
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
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
function isElectron() {
    return typeof window !== "undefined" && !!window.electronAPI;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function serializeData(data) {
    if (data instanceof Date) {
        return data.toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    if (data !== null && typeof data === "object") {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = serializeData(value);
        }
        return result;
    }
    return data;
}
