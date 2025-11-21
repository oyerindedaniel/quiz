import { toast } from "sonner";

/**
 * Configuration for CSV download
 */
export interface CSVDownloadConfig<T> {
  /** Array of data to export */
  data: T[];
  /** Column headers for the CSV */
  headers: string[];
  /** Function to extract values from each data item */
  extractValues: (item: T) => (string | number | null | undefined)[];
  /** Filename for the download (without .csv extension) */
  filename: string;
  /** Whether to show success toast notification */
  showToast?: boolean;
  /** Custom success message for toast */
  successMessage?: string;
}

/**
 * Downloads data as a CSV file
 * @param config Configuration object for the CSV download
 */
export function downloadCSV<T>(config: CSVDownloadConfig<T>): void {
  const {
    data,
    headers,
    extractValues,
    filename,
    showToast = true,
    successMessage = "CSV file downloaded successfully!",
  } = config;

  try {
    const csvContent = [
      headers.map((header) => escapeCSVValue(header)).join(","),
      ...data.map((item) =>
        extractValues(item)
          .map((value) => escapeCSVValue(value))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    if (showToast) {
      toast.success("Download started!", {
        description: successMessage,
      });
    }
  } catch (error) {
    console.error("CSV download failed:", error);
    if (showToast) {
      toast.error("Download failed", {
        description: "Unable to download CSV file. Please try again.",
      });
    }
  }
}

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 * @param value The value to escape
 * @returns Escaped CSV value
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If the value contains comma, double quotes, or newlines, wrap in quotes and escape internal quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Predefined extractors for common data types
 */
export const csvExtractors = {
  /**
   * Extractor for student credentials
   */
  studentCredentials: (item: {
    name: string;
    studentCode: string;
    pin: string;
    class: string;
    gender: string;
  }) => [item.name, item.studentCode, item.pin, item.class, item.gender],

  /**
   * Extractor for subjects
   */
  subjects: (item: { subjectCode: string; subjectName: string }) => [
    item.subjectCode,
    item.subjectName,
  ],
};
