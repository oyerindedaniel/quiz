import { LocalDatabaseService } from "../database/local-database-service";
import { v4 as uuidv4 } from "uuid";
import type { NewSubject, NewQuestion } from "../database/local-schema";
import type { CSVRow, ImportResult } from "@/types";
import { isElectron } from "@/lib/utils";

export class CSVImportService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  /**
   * Import questions from CSV file content
   */
  async importQuestionsFromCSV(csvContent: string): Promise<ImportResult> {
    const results: ImportResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      subjects: { created: 0, existing: 0 },
      questions: { regular: 0, passages: 0, headers: 0 },
    };

    try {
      // Parse CSV content
      const rows = this.parseCSV(csvContent);

      if (rows.length === 0) {
        throw new Error("No valid data found in CSV file");
      }

      // Group rows by subject for batch processing
      const subjectGroups = this.groupRowsBySubject(rows);

      for (const [subjectCode, subjectRows] of subjectGroups) {
        try {
          // Ensure subject exists
          const subjectId = await this.ensureSubjectExists(
            subjectCode,
            results
          );

          // Process questions for this subject
          await this.processSubjectQuestions(subjectId, subjectRows, results);
        } catch (error) {
          results.errors.push(
            `Subject ${subjectCode}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          results.failed += subjectRows.length;
        }
      }

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
      "Subject Code",
      "Question Text",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
      "Question Order",
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

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || "";
        });

        rows.push(row as CSVRow);
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
   * Group CSV rows by subject code
   */
  private groupRowsBySubject(rows: CSVRow[]): Map<string, CSVRow[]> {
    const groups = new Map<string, CSVRow[]>();

    for (const row of rows) {
      const subjectCode = row["Subject Code"];
      if (!subjectCode) continue;

      if (!groups.has(subjectCode)) {
        groups.set(subjectCode, []);
      }
      groups.get(subjectCode)!.push(row);
    }

    return groups;
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
      const classMatch = subjectCode.match(/^(SS2|JSS3)_/);
      const classLevel = classMatch ? (classMatch[1] as "SS2" | "JSS3") : "SS2";

      // Generate subject name from code
      const subjectName = this.generateSubjectName(subjectCode);

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
   * Generate readable subject name from subject code
   */
  private generateSubjectName(subjectCode: string): string {
    const codeMap: Record<string, string> = {
      ENG: "English Studies",
      MATH: "Mathematics",
      SST: "Social Studies",
      SOCS: "Social Studies",
      BSC: "Basic Science",
      BSCI: "Basic Science",
      YOR: "Yoruba Language",
      GEO: "Geography",
      AGRIC: "Agriculture",
      ECON: "Economics",
      CHEM: "Chemistry",
      PHY: "Physics",
      BIO: "Biology",
      CIVIC: "Civic Education",
      ANI: "Animal Husbandry",
      COMP: "Computer Studies",
      HOME: "Home Economics",
      CCA: "Creative and Cultural Arts",
      HIST: "History",
    };

    // Extract subject part (after class prefix)
    const parts = subjectCode.split("_");
    if (parts.length >= 2) {
      const subjectPart = parts[1];
      return codeMap[subjectPart] || subjectPart;
    }

    return subjectCode;
  }

  /**
   * Process questions for a subject
   */
  private async processSubjectQuestions(
    subjectId: string,
    rows: CSVRow[],
    results: ImportResult
  ): Promise<void> {
    let questionOrder = 1;

    for (const row of rows) {
      results.processed++;

      try {
        await this.processQuestionRow(row, subjectId, questionOrder, results);
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
  }

  /**
   * Process a single question row
   */
  private async processQuestionRow(
    row: CSVRow,
    subjectId: string,
    questionOrder: number,
    results: ImportResult
  ): Promise<void> {
    const questionText = row["Question Text"]?.trim();

    if (!questionText) {
      throw new Error("Question Text is required");
    }

    // Detect question type
    let questionType: "question" | "passage" | "header" = "question";
    let processedText = questionText;

    if (questionText.startsWith("[PASSAGE]")) {
      questionType = "passage";
      processedText = questionText.replace(/^\[PASSAGE\]\s*/, "");
      results.questions.passages++;
    } else if (questionText.startsWith("[HEADER]")) {
      questionType = "header";
      processedText = questionText.replace(/^\[HEADER\]\s*/, "");
      results.questions.headers++;
    } else {
      results.questions.regular++;
    }

    // For passages and headers, options and answers should be empty
    if (questionType === "passage" || questionType === "header") {
      await this.createSpecialQuestion(
        subjectId,
        questionType,
        processedText,
        questionOrder
      );
    } else {
      // Regular question - validate and create
      this.validateRegularQuestion(row);
      await this.createRegularQuestion(row, subjectId, questionOrder);
    }
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
   * Create a regular question
   */
  private async createRegularQuestion(
    row: CSVRow,
    subjectId: string,
    questionOrder: number
  ): Promise<void> {
    const options = [
      row["Option A"].trim(),
      row["Option B"].trim(),
      row["Option C"].trim(),
      row["Option D"].trim(),
    ];

    const questionData: Omit<NewQuestion, "createdAt" | "updatedAt"> = {
      id: uuidv4(),
      subjectId,
      text: row["Question Text"].trim(),
      options: JSON.stringify(options),
      answer: row["Correct Answer"].toUpperCase().trim(),
      questionOrder: row["Question Order"]
        ? parseInt(row["Question Order"])
        : questionOrder,
    };

    await this.localDb.createQuestion(questionData);
  }

  /**
   * Create a special question (passage or header)
   */
  private async createSpecialQuestion(
    subjectId: string,
    type: "passage" | "header",
    content: string,
    questionOrder: number
  ): Promise<void> {
    const questionData: Omit<NewQuestion, "createdAt" | "updatedAt"> = {
      id: uuidv4(),
      subjectId,
      text: `[${type.toUpperCase()}] ${content}`,
      options: JSON.stringify([]), // Empty options for special questions
      answer: "", // No correct answer for special questions
      questionOrder,
    };

    await this.localDb.createQuestion(questionData);
  }

  /**
   * Load and import CSV file from file system
   */
  async importFromFile(filePath: string): Promise<ImportResult> {
    try {
      if (isElectron()) {
        const csvContent = await window.electronAPI.csv.readFile(filePath);
        return this.importQuestionsFromCSV(csvContent);
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
