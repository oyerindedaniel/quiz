import { LocalDatabaseService } from "../database/local-database-service.js";
import { v4 as uuidv4 } from "uuid";
import type { NewSubject, NewQuestion } from "../database/local-schema.js";
import type { CSVRow, ImportResult, QuestionType } from "../../types/app.js";
import { generateSubjectName } from "../constants/students.js";
import { IPCDatabaseService } from "../services/ipc-database-service.js";
import { RemoteDatabaseService } from "../database/remote-database-service.js";

interface DatabaseServiceOptions {
  isRemote?: boolean;
}

export class CSVImportService {
  private localDb: LocalDatabaseService;
  private remoteDb: RemoteDatabaseService;
  private ipcDb: IPCDatabaseService;
  private isRemote: boolean;

  constructor(options: DatabaseServiceOptions = {}) {
    this.localDb = LocalDatabaseService.getInstance();
    this.ipcDb = new IPCDatabaseService();
    this.remoteDb = RemoteDatabaseService.getInstance();
    this.isRemote = options.isRemote || false;
  }

  private isElectron(): boolean {
    return typeof window !== "undefined" && !!window.electronAPI;
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
      questions: { regular: 0, passages: 0, headers: 0, images: 0 },
    };

    try {
      const subjectCode = filename
        ? filename.replace(/\.csv$/i, "").toUpperCase()
        : "UNKNOWN";

      const rows = this.parseCSV(csvContent);

      if (rows.length === 0) {
        throw new Error("No valid data found in CSV file");
      }

      const subjectId = await this.ensureSubjectExists(subjectCode, results);

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

    const headers = this.parseCSVLine(lines[0]);
    const requiredHeaders = [
      "Question Text",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
    ];

    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required header: ${required}`);
      }
    }

    const rows: CSVRow[] = [];
    let currentQuestionText = "";
    let isMultilineContent = false;

    for (let i = 1; i < lines.length; i++) {
      try {
        const lineContent = lines[i].trim();

        if (!lineContent) {
          continue;
        }

        if (isMultilineContent) {
          currentQuestionText += "\n" + lineContent;

          try {
            const values = this.parseCSVLine(currentQuestionText);
            if (values.length === headers.length) {
              const row = this.createRowFromValues(headers, values, i);
              if (row) {
                rows.push(row);
              }

              currentQuestionText = "";
              isMultilineContent = false;
              continue;
            }
          } catch {
            continue;
          }
        }

        const values = this.parseCSVLine(lineContent);

        if (values.length === headers.length) {
          // Normal row with correct column count
          const row = this.createRowFromValues(headers, values, i);
          if (row) {
            rows.push(row);
          }
        } else if (values.length < headers.length) {
          // Possible start of multiline content
          const questionText = values[headers.indexOf("Question Text")] || "";

          if (
            questionText.startsWith("[PASSAGE]") ||
            questionText.startsWith("[HEADER]") ||
            questionText.startsWith("[IMAGE]") ||
            questionText.includes("PASSAGE")
          ) {
            currentQuestionText = lineContent;
            isMultilineContent = true;
          } else {
            console.warn(
              `Row ${i + 1}: Column count mismatch (${values.length} vs ${
                headers.length
              }), trying to fix malformed CSV line`
            );

            // Try to fix common CSV issues like unquoted commas in text
            const fixedLine = this.tryFixCSVLine(lineContent, headers.length);
            if (fixedLine) {
              const fixedValues = this.parseCSVLine(fixedLine);
              if (fixedValues.length === headers.length) {
                const row = this.createRowFromValues(headers, fixedValues, i);
                if (row) {
                  rows.push(row);
                  console.log(`Row ${i + 1}: Successfully fixed and parsed`);
                  continue;
                }
              }
            }

            console.warn(`Row ${i + 1}: Could not fix, skipping`);
          }
        } else {
          console.warn(
            `Row ${i + 1}: Too many columns (${values.length} vs ${
              headers.length
            }), skipping`
          );
        }
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
   * Create a CSVRow object from parsed values
   */
  private createRowFromValues(
    headers: string[],
    values: string[],
    rowIndex: number
  ): CSVRow | null {
    try {
      const row: CSVRow = {
        "Subject Code": "",
        "Question Text": values[headers.indexOf("Question Text")] || "",
        "Option A": values[headers.indexOf("Option A")] || "",
        "Option B": values[headers.indexOf("Option B")] || "",
        "Option C": values[headers.indexOf("Option C")] || "",
        "Option D": values[headers.indexOf("Option D")] || "",
        "Correct Answer": values[headers.indexOf("Correct Answer")] || "",
        "Question Order":
          values[headers.indexOf("Question Order")] ||
          (rowIndex + 1).toString(),
      };

      // Add Option E if it exists in headers
      const optionEIndex = headers.indexOf("Option E");
      if (optionEIndex !== -1) {
        row["Option E"] = values[optionEIndex] || "";
      }

      return row;
    } catch (error) {
      console.warn(`Failed to create row from values:`, error);
      return null;
    }
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
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current);

    return result;
  }

  /**
   * Try to fix common CSV formatting issues
   */
  private tryFixCSVLine(line: string, expectedColumns: number): string | null {
    try {
      // Clean the line first - remove any BOM, extra whitespace, etc.
      let fixedLine = line.trim();

      // Remove BOM if present
      if (fixedLine.charCodeAt(0) === 0xfeff) {
        fixedLine = fixedLine.slice(1);
      }

      // Split by comma first to see what we're working with
      const parts = fixedLine.split(",");

      if (parts.length <= expectedColumns) {
        return null; // Can't fix if we don't have enough parts
      }

      // Method 1: Fix date patterns with commas
      // Match date patterns with commas (day month, year)
      const datePattern = /(\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,\s*\d{4})/g;
      fixedLine = fixedLine.replace(datePattern, '"$1"');

      // Verify the fix worked
      let fixedParts = this.parseCSVLine(fixedLine);
      if (fixedParts.length === expectedColumns) {
        return fixedLine;
      }

      // Method 2: Try to fix by removing trailing empty columns
      if (parts.length > expectedColumns) {
        const trimmedParts = parts.slice(0, expectedColumns);
        const trimmedLine = trimmedParts.join(",");
        fixedParts = this.parseCSVLine(trimmedLine);
        if (fixedParts.length === expectedColumns) {
          return trimmedLine;
        }
      }

      // Method 3: Look for patterns where there might be an extra comma at the end
      if (fixedLine.endsWith(",")) {
        const trimmedLine = fixedLine.slice(0, -1);
        fixedParts = this.parseCSVLine(trimmedLine);
        if (fixedParts.length === expectedColumns) {
          return trimmedLine;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Ensure subject exists, create if necessary
   */
  private async ensureSubjectExists(
    subjectCode: string,
    results: ImportResult
  ): Promise<string> {
    let subject;

    try {
      if (this.isRemote) {
        console.log(
          `CSVImportService: Using remote database for subject lookup`
        );
        subject = await this.remoteDb.findSubjectByCode(subjectCode);
      } else {
        console.log(
          `CSVImportService: Using local database for subject lookup`
        );
        subject = await this.localDb.findSubjectByCode(subjectCode);
      }
    } catch (error) {
      console.error(
        `CSVImportService: Error finding subject ${subjectCode}:`,
        error
      );
      throw error;
    }

    if (!subject) {
      const classMatch = subjectCode.match(/^(SS2|JSS3|BASIC5)_/);
      const classLevel = classMatch
        ? (classMatch[1] as "SS2" | "JSS3" | "BASIC5")
        : "SS2";

      const subjectName = generateSubjectName(subjectCode);

      const subjectData: Omit<NewSubject, "createdAt" | "updatedAt"> = {
        id: uuidv4(),
        name: subjectName,
        subjectCode,
        description: `${subjectName} for ${classLevel} students`,
        class: classLevel,
      };

      try {
        if (this.isRemote) {
          console.log(
            `CSVImportService: Creating subject ${subjectCode} in remote database`
          );
          await this.remoteDb.createSubject(subjectData);
          subject = await this.remoteDb.findSubjectByCode(subjectCode);
        } else {
          console.log(
            `CSVImportService: Creating subject ${subjectCode} in local database`
          );
          await this.localDb.createSubject(subjectData);
          subject = await this.localDb.findSubjectByCode(subjectCode);
        }

        results.subjects.created++;
        console.log(
          `CSVImportService: Created new subject: ${subjectCode} - ${subjectName}`
        );
      } catch (error) {
        console.error(
          `CSVImportService: Error creating subject ${subjectCode}:`,
          error
        );
        throw error;
      }
    } else {
      results.subjects.existing++;
    }

    if (!subject) {
      throw new Error(`Failed to create/find subject: ${subjectCode}`);
    }

    return subject.id;
  }

  /**
   * Process all questions in bulk
   */
  private async processQuestionsInBulk(
    subjectId: string,
    subjectCode: string,
    rows: CSVRow[],
    results: ImportResult
  ): Promise<void> {
    const questionsToCreate: Omit<NewQuestion, "createdAt" | "updatedAt">[] =
      [];

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

        let questionType: QuestionType = "question";
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
        } else if (questionText.startsWith("[IMAGE]")) {
          questionType = "image";
          const imageContent = this.processImageContent(
            questionText.replace(/^\[IMAGE\]\s*/, "")
          );
          processedText = imageContent;
          results.questions.images++;
        } else {
          results.questions.regular++;
        }

        // TODO: passage, header, image should not have a question order
        let questionOrder: number;
        if (row["Question Order"] && row["Question Order"].trim()) {
          questionOrder = parseInt(row["Question Order"]);
        } else {
          // For special items (passage/header/image), uses a high number to sort them properly
          // We'll use row index + 1000 to ensure they appear in the right sequence
          questionOrder = results.processed + 1000;
        }

        if (
          questionType === "passage" ||
          questionType === "header" ||
          questionType === "image"
        ) {
          // Special questions (passage/header/image) - no validation needed
          questionsToCreate.push({
            id: uuidv4(),
            subjectId,
            subjectCode,
            text: `[${questionType.toUpperCase()}] ${processedText}`,
            options: JSON.stringify([]), // Empty options for special questions
            answer: "", // No correct answer for special questions
            questionOrder,
          });
        } else {
          this.validateRegularQuestion(row);

          const options = [
            this.processTextContent(row["Option A"]),
            this.processTextContent(row["Option B"]),
            this.processTextContent(row["Option C"]),
            this.processTextContent(row["Option D"]),
          ];

          if (row["Option E"]?.trim()) {
            options.push(this.processTextContent(row["Option E"]));
          }

          questionsToCreate.push({
            id: uuidv4(),
            subjectId,
            subjectCode,
            text: processedText,
            options: JSON.stringify(options),
            answer: row["Correct Answer"].toUpperCase().trim(),
            questionOrder,
          });
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${results.processed}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    if (questionsToCreate.length > 0) {
      await this.bulkCreateQuestions(questionsToCreate);
      console.log(
        `Bulk created ${questionsToCreate.length} questions for subject ${subjectCode}`
      );
    }
  }

  /**
   * Bulk create questions
   */
  private async bulkCreateQuestions(
    questions: Omit<NewQuestion, "createdAt" | "updatedAt">[]
  ): Promise<void> {
    try {
      if (this.isRemote) {
        await this.remoteDb.bulkUpsertQuestions(questions);
        console.log(
          `CSVImportService: Successfully bulk upserted ${questions.length} questions in remote database`
        );
      } else {
        await this.ipcDb.bulkCreateQuestions(questions);
        console.log(
          `CSVImportService: Successfully bulk created ${questions.length} questions via IPC`
        );
      }
    } catch (error) {
      console.error(`CSVImportService: Error in bulk create questions:`, error);
      throw error;
    }
  }

  /**
   * Process image content to extract URL and position
   */
  private processImageContent(imageText: string): string {
    // Expected format: "position:up\nhttps://example.com/image.jpg"
    // or "position:down\nhttps://example.com/image.jpg"
    const lines = imageText
      .trim()
      .split("\n")
      .map((line) => line.trim());

    let position = "up";
    let imageUrl = "";

    for (const line of lines) {
      if (line.startsWith("position:")) {
        const pos = line.replace("position:", "").trim().toLowerCase();
        if (pos === "up" || pos === "down") {
          position = pos;
        }
      } else if (line.startsWith("http://") || line.startsWith("https://")) {
        imageUrl = line;
      }
    }

    if (!imageUrl) {
      throw new Error("Image URL is required for [IMAGE] blocks");
    }

    if (position !== "up" && position !== "down") {
      throw new Error('Image position must be either "up" or "down"');
    }

    return `position:${position}\n${imageUrl}`;
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
    const hasOptionE = row["Option E"]?.trim();

    const validAnswers = hasOptionE
      ? ["A", "B", "C", "D", "E"]
      : ["A", "B", "C", "D"];

    if (!validAnswers.includes(correctAnswer)) {
      throw new Error(
        `Correct Answer must be ${validAnswers.join(", ")}${
          hasOptionE ? "" : ". Add Option E to use answer E"
        }`
      );
    }
  }

  /**
   * Load and import CSV file from file system
   */
  async importFromFile(filePath: string): Promise<ImportResult> {
    try {
      if (this.isElectron()) {
        const csvContent = await window.electronAPI.csv.readFile(filePath);
        const filename = filePath.split(/[\\/]/).pop();
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
