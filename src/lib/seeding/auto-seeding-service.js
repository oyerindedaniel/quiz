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
exports.AutoSeedingService = void 0;
const csv_import_service_js_1 = require("../import/csv-import-service.js");
const user_seeding_service_js_1 = require("../auth/user-seeding-service.js");
const err_js_1 = require("../../error/err.js");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class AutoSeedingService {
    static async performAutoSeeding() {
        try {
            console.log("MainDatabaseService: Starting automatic seeding...");
            let totalRecords = 0;
            const userSeedingService = new user_seeding_service_js_1.UserSeedingService();
            const subjectResults = await userSeedingService.createSubjectsData();
            totalRecords += subjectResults.created;
            console.log(`MainDatabaseService: Seeded ${subjectResults.created} subjects (${subjectResults.existing} already existed)`);
            const userResults = await userSeedingService.createUserData();
            totalRecords += userResults.users.created;
            console.log(`MainDatabaseService: Seeded ${userResults.users.created} users`);
            try {
                const questionSeedResults = await this.seedQuestionsFromCSV();
                totalRecords += questionSeedResults.questionsSeeded;
                console.log(`MainDatabaseService: Seeded ${questionSeedResults.questionsSeeded} questions from CSV`);
            }
            catch (csvError) {
                console.warn("MainDatabaseService: CSV question seeding failed:", (0, err_js_1.normalizeError)(csvError).message);
            }
            console.log(`MainDatabaseService: Successfully seeded ${totalRecords} records locally`);
            return {
                success: true,
                totalRecords,
            };
        }
        catch (error) {
            console.error("MainDatabaseService: Auto seeding failed:", error);
            return {
                success: false,
                totalRecords: 0,
                error: error instanceof Error ? error.message : "Unknown seeding error",
            };
        }
    }
    static async seedQuestionsFromCSV() {
        try {
            let totalQuestionsSeeded = 0;
            const csvDir = path.join(process.cwd(), "data", "csv-imports");
            try {
                await fs.access(csvDir);
                const files = await fs.readdir(csvDir);
                const csvFiles = files.filter((file) => file.endsWith(".csv"));
                if (csvFiles.length === 0) {
                    console.log("MainDatabaseService: No CSV files found for question seeding");
                    return { questionsSeeded: 0 };
                }
                console.log(`MainDatabaseService: Found ${csvFiles.length} CSV files for question seeding`);
                for (const csvFile of csvFiles) {
                    try {
                        const filePath = path.join(csvDir, csvFile);
                        const csvContent = await fs.readFile(filePath, "utf-8");
                        const csvImporter = new csv_import_service_js_1.CSVImportService();
                        const result = await csvImporter.importQuestionsFromCSV(csvContent, csvFile);
                        totalQuestionsSeeded += result.successful;
                        console.log(`MainDatabaseService: Imported ${result.successful} questions from ${csvFile}`);
                    }
                    catch (fileError) {
                        console.warn(`MainDatabaseService: Failed to process ${csvFile}:`, (0, err_js_1.normalizeError)(fileError).message);
                    }
                }
                return { questionsSeeded: totalQuestionsSeeded };
            }
            catch (dirError) {
                console.log("MainDatabaseService: CSV imports directory not found, skipping question seeding");
                return { questionsSeeded: 0 };
            }
        }
        catch (error) {
            console.error("MainDatabaseService: CSV question seeding failed:", error);
            throw error;
        }
    }
}
exports.AutoSeedingService = AutoSeedingService;
