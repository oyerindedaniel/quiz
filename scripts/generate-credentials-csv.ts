import { ALL_STUDENTS } from "../src/lib/constants/students.js";
import { generateStudentPin } from "../src/utils/pin-generator.js";
import fs from "fs";
import path from "path";

/**
 * CLI script to generate student credentials CSV
 */
function generateCredentialsCSV() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const downloadsDir = path.join(homeDir, "Downloads");

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `student-credentials-${timestamp}.csv`;
  const outputPath = path.resolve(downloadsDir, fileName);

  const headers = ["Name", "Student Code", "PIN", "Class", "Gender"];

  const rows = ALL_STUDENTS.map((student, index) => {
    const pin = generateStudentPin(index);
    return [
      `"${student.name}"`,
      `"${student.studentCode}"`,
      `"${pin}"`,
      `"${student.class}"`,
      `"${student.gender}"`,
    ].join(",");
  });

  const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");

  try {
    fs.writeFileSync(outputPath, csvContent, "utf-8");

    console.log("\n✨ CSV Generation Successful!");
    console.log("============================");
    console.log(`📁 File Name: ${fileName}`);
    console.log(`🏠 Saved to:  ${outputPath}`);
    console.log(`👥 Count:     ${ALL_STUDENTS.length} students`);
    console.log("============================\n");

    console.log("💡 The file has been saved to your Downloads folder.");
  } catch (error) {
    console.error("❌ Failed to generate CSV:", error);
  }
}

generateCredentialsCSV();
