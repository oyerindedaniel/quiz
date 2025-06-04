import { LocalDatabaseService } from "../database/local-database-service";
import { v4 as uuidv4 } from "uuid";
import type { NewSubject, NewQuestion } from "../database/local-schema";
import type { CSVRow, ImportResult } from "@/types";
import { isElectron } from "@/lib/utils";
import { generateSubjectName } from "../constants/students";
import { IPCDatabaseService } from "../services/ipc-database-service";

export class CSVImportService {
  private localDb: LocalDatabaseService;
  private ipcDb: IPCDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
    this.ipcDb = new IPCDatabaseService();
  }

  /**
   * Import questions from CSV file content with filename as subject code
   */
  async importQuestionsFromCSV(
    csvContent: string,
    filename?: string
  ): Promise<ImportResult> {
    const results: ImportResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      subjects: { created: 0, existing: 0 },
      questions: { regular: 0, passages: 0, headers: 0 },
    };

    try {
      // Extract subject code from filename (remove .csv extension)
      const subjectCode = filename
        ? filename.replace(/\.csv$/i, "").toUpperCase()
        : "UNKNOWN";

      const rows = this.parseCSV(csvContent);

      if (rows.length === 0) {
        throw new Error("No valid data found in CSV file");
      }

      // Ensure subject exists (create if necessary)
      const subjectId = await this.ensureSubjectExists(subjectCode, results);

      // Process all questions for this subject in bulk
      await this.processQuestionsInBulk(subjectId, subjectCode, rows, results);

      console.log("CSV Import completed:", results);
      return results;
    } catch (error) {
      results.errors.push(
        `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return results;
    }
  }

  /**
   * Parse CSV content into structured data
   */
  private parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error("CSV file must have headers and at least one data row");
    }

    // Parse headers
    const headers = this.parseCSVLine(lines[0]);
    const requiredHeaders = [
      "Question Text",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
    ];

    // Validate headers
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required header: ${required}`);
      }
    }

    // Parse data rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);

        if (values.length !== headers.length) {
          console.warn(`Row ${i + 1}: Column count mismatch, skipping`);
          continue;
        }

        // Parse each line and build the row object
        const row: CSVRow = {
          "Subject Code": "", // Not needed since we use filename
          "Question Text": values[headers.indexOf("Question Text")] || "",
          "Option A": values[headers.indexOf("Option A")] || "",
          "Option B": values[headers.indexOf("Option B")] || "",
          "Option C": values[headers.indexOf("Option C")] || "",
          "Option D": values[headers.indexOf("Option D")] || "",
          "Correct Answer": values[headers.indexOf("Correct Answer")] || "",
          "Question Order":
            values[headers.indexOf("Question Order")] || i.toString(),
        };

        rows.push(row);
      } catch (error) {
        console.warn(
          `Row ${i + 1}: Parse error - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return rows;
  }

  /**
   * Parse a single CSV line, handling quoted values and embedded commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote within quoted field
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);

    return result;
  }

  /**
   * Ensure subject exists, create if necessary
   */
  private async ensureSubjectExists(
    subjectCode: string,
    results: ImportResult
  ): Promise<string> {
    let subject = await this.localDb.findSubjectByCode(subjectCode);

    if (!subject) {
      // Extract class from subject code (e.g., "SS2_MATH" -> "SS2")
      const classMatch = subjectCode.match(/^(SS2|JSS3|BASIC5)_/);
      const classLevel = classMatch
        ? (classMatch[1] as "SS2" | "JSS3" | "BASIC5")
        : "SS2";

      // Generate subject name from code using the comprehensive mapping
      const subjectName = generateSubjectName(subjectCode);

      const subjectData: Omit<NewSubject, "createdAt" | "updatedAt"> = {
        id: uuidv4(),
        name: subjectName,
        subjectCode,
        description: `${subjectName} for ${classLevel} students`,
        class: classLevel,
        totalQuestions: 0,
      };

      await this.localDb.createSubject(subjectData);
      subject = await this.localDb.findSubjectByCode(subjectCode);
      results.subjects.created++;

      console.log(`Created new subject: ${subjectCode} - ${subjectName}`);
    } else {
      results.subjects.existing++;
    }

    if (!subject) {
      throw new Error(`Failed to create/find subject: ${subjectCode}`);
    }

    return subject.id;
  }

  /**
   * Process all questions in bulk for better performance
   */
  private async processQuestionsInBulk(
    subjectId: string,
    subjectCode: string,
    rows: CSVRow[],
    results: ImportResult
  ): Promise<void> {
    const questionsToCreate: Omit<NewQuestion, "createdAt" | "updatedAt">[] =
      [];
    let questionOrder = 1;

    for (const row of rows) {
      results.processed++;

      try {
        const questionText = row["Question Text"]?.trim();

        if (!questionText) {
          results.failed++;
          results.errors.push(
            `Row ${results.processed}: Question Text is required`
          );
          continue;
        }

        // Detect question type
        let questionType: "question" | "passage" | "header" = "question";
        let processedText = this.processTextContent(questionText);

        if (questionText.startsWith("[PASSAGE]")) {
          questionType = "passage";
          processedText = this.processTextContent(
            questionText.replace(/^\[PASSAGE\]\s*/, "")
          );
          results.questions.passages++;
        } else if (questionText.startsWith("[HEADER]")) {
          questionType = "header";
          processedText = this.processTextContent(
            questionText.replace(/^\[HEADER\]\s*/, "")
          );
          results.questions.headers++;
        } else {
          results.questions.regular++;
        }

        // Create question data
        if (questionType === "passage" || questionType === "header") {
          questionsToCreate.push({
            id: uuidv4(),
            subjectId,
            subjectCode,
            text: `[${questionType.toUpperCase()}] ${processedText}`,
            options: JSON.stringify([]), // Empty options for special questions
            answer: "", // No correct answer for special questions
            questionOrder: row["Question Order"]
              ? parseInt(row["Question Order"])
              : questionOrder,
          });
        } else {
          // Regular question - validate first
          this.validateRegularQuestion(row);

          const options = [
            this.processTextContent(row["Option A"]),
            this.processTextContent(row["Option B"]),
            this.processTextContent(row["Option C"]),
            this.processTextContent(row["Option D"]),
          ];

          questionsToCreate.push({
            id: uuidv4(),
            subjectId,
            subjectCode,
            text: processedText,
            options: JSON.stringify(options),
            answer: row["Correct Answer"].toUpperCase().trim(),
            questionOrder: row["Question Order"]
              ? parseInt(row["Question Order"])
              : questionOrder,
          });
        }

        results.successful++;
        questionOrder++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${results.processed}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Bulk create all questions at once
    if (questionsToCreate.length > 0) {
      await this.bulkCreateQuestions(questionsToCreate);
      console.log(
        `Bulk created ${questionsToCreate.length} questions for subject ${subjectCode}`
      );
    }
  }

  /**
   * Bulk create questions for better performance
   */
  private async bulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<void> {
    await this.ipcDb.bulkCreateQuestions(questions);
  }

  /**
   * Process text content to preserve underline markers
   * Converts **text** markers to a format that can be rendered in UI
   */
  private processTextContent(text: string): string {
    // Preserve the **text** markers as-is for UI processing
    // The UI component will handle the actual rendering
    return text.trim();
  }

  /**
   * Validate regular question data
   */
  private validateRegularQuestion(row: CSVRow): void {
    const requiredFields: (keyof CSVRow)[] = [
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
    ];

    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        throw new Error(`${field} is required for regular questions`);
      }
    }

    const correctAnswer = row["Correct Answer"].toUpperCase().trim();
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error("Correct Answer must be A, B, C, or D");
    }
  }

  /**
   * Load and import CSV file from file system
   */
  async importFromFile(filePath: string): Promise<ImportResult> {
    try {
      if (isElectron()) {
        const csvContent = await window.electronAPI.csv.readFile(filePath);
        const filename = filePath.split(/[\\/]/).pop(); // Extract filename from path
        return this.importQuestionsFromCSV(csvContent, filename);
      } else {
        throw new Error("File import only available in Electron environment");
      }
    } catch (error) {
      throw new Error(
        `Failed to read CSV file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
