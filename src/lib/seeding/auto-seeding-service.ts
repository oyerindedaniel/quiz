import { CSVImportService } from "../import/csv-import-service.js";
import { UserSeedingService } from "../auth/user-seeding-service.js";
import { normalizeError } from "../../error/err.js";
import * as fs from "fs/promises";
import * as path from "path";

export class AutoSeedingService {
  /**
   * Perform automatic seeding of the local database
   * This handles users, subjects, questions, and admin users
   */
  static async performAutoSeeding(): Promise<{
    success: boolean;
    totalRecords: number;
    error?: string;
  }> {
    try {
      console.log("MainDatabaseService: Starting automatic seeding...");

      let totalRecords = 0;

      // 1. Seed subjects
      const userSeedingService = new UserSeedingService();
      const subjectResults = await userSeedingService.createSubjectsData();
      totalRecords += subjectResults.created;

      console.log(
        `MainDatabaseService: Seeded ${subjectResults.created} subjects (${subjectResults.existing} already existed)`
      );

      // 2. Seed users
      const userResults = await userSeedingService.createUserData();
      totalRecords += userResults.users.created;

      console.log(
        `MainDatabaseService: Seeded ${userResults.users.created} users`
      );

      // 3. Seed questions
      try {
        const questionSeedResults = await this.seedQuestionsFromCSV();
        totalRecords += questionSeedResults.questionsSeeded;

        console.log(
          `MainDatabaseService: Seeded ${questionSeedResults.questionsSeeded} questions from CSV`
        );
      } catch (csvError) {
        console.warn(
          "MainDatabaseService: CSV question seeding failed:",
          normalizeError(csvError).message
        );
      }

      console.log(
        `MainDatabaseService: Successfully seeded ${totalRecords} records locally`
      );

      return {
        success: true,
        totalRecords,
      };
    } catch (error) {
      console.error("MainDatabaseService: Auto seeding failed:", error);
      return {
        success: false,
        totalRecords: 0,
        error: error instanceof Error ? error.message : "Unknown seeding error",
      };
    }
  }

  /**
   * Seed questions from CSV files
   */
  private static async seedQuestionsFromCSV(): Promise<{
    questionsSeeded: number;
  }> {
    try {
      let totalQuestionsSeeded = 0;

      const csvDir = path.join(process.cwd(), "data", "csv-imports");

      try {
        await fs.access(csvDir);
        const files = await fs.readdir(csvDir);
        const csvFiles = files.filter((file) => file.endsWith(".csv"));

        if (csvFiles.length === 0) {
          console.log(
            "MainDatabaseService: No CSV files found for question seeding"
          );
          return { questionsSeeded: 0 };
        }

        console.log(
          `MainDatabaseService: Found ${csvFiles.length} CSV files for question seeding`
        );

        for (const csvFile of csvFiles) {
          try {
            const filePath = path.join(csvDir, csvFile);
            const csvContent = await fs.readFile(filePath, "utf-8");

            const csvImporter = new CSVImportService();
            const result = await csvImporter.importQuestionsFromCSV(
              csvContent,
              csvFile
            );
            totalQuestionsSeeded += result.successful;

            console.log(
              `MainDatabaseService: Imported ${result.successful} questions from ${csvFile}`
            );
          } catch (fileError) {
            console.warn(
              `MainDatabaseService: Failed to process ${csvFile}:`,
              normalizeError(fileError).message
            );
          }
        }

        return { questionsSeeded: totalQuestionsSeeded };
      } catch (dirError) {
        console.log(
          "MainDatabaseService: CSV imports directory not found, skipping question seeding"
        );
        return { questionsSeeded: 0 };
      }
    } catch (error) {
      console.error("MainDatabaseService: CSV question seeding failed:", error);
      throw error;
    }
  }
}
