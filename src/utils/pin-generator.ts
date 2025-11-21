/**
 * Shared PIN generation utility
 * Generates consistent PIN codes for students
 */

/**
 * Generate a PIN code for a student based on their index
 * Format: 111001, 111002, 111003, etc.
 * @param index - Zero-based index of the student
 * @returns 6-digit PIN string
 */
export function generateStudentPin(index: number): string {
  return String(100000 + (index + 1)).padStart(6, "1");
}
