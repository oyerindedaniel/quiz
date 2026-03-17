import { ALL_SUBJECTS, generateSubjectName } from "../src/lib/constants/students.js";
import fs from "fs";
import path from "path";

/**
 * CLI script to generate subject codes CSV
 * Usage: pnpm generate:subjects [1st|2nd|3rd]
 */
function generateSubjectsCSV() {
  const termArg = (process.argv[2] || "1st").toLowerCase();

  const termSuffixMap: Record<string, string> = {
    "1st": "",
    "2nd": "_2ND",
    "3rd": "_3RD",
  };

  const suffix = termSuffixMap[termArg];

  if (suffix === undefined) {
    console.error(`❌ Invalid term specified: "${termArg}". Please use 1st, 2nd, or 3rd.`);
    process.exit(1);
  }

  const filteredSubjects = ALL_SUBJECTS.filter((subject) => {
    if (suffix === "") {
      // For 1st term, find codes that don't have any term suffix
      return !subject.subjectCode.endsWith("_2ND") && !subject.subjectCode.endsWith("_3RD");
    }
    return subject.subjectCode.endsWith(suffix);
  });

  if (filteredSubjects.length === 0) {
    console.warn(`⚠️ No subjects found for term: ${termArg}`);
    return;
  }

  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const downloadsDir = path.join(homeDir, "Downloads");

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `subject-codes-${termArg}-${timestamp}.csv`;
  const outputPath = path.resolve(downloadsDir, fileName);

  const headers = ["Subject Name", "Subject Code", "Class", "Description"];

  const rows = filteredSubjects.map((subject) => {
    const displayName = generateSubjectName(subject.subjectCode);
    return [
      `"${displayName}"`,
      `"${subject.subjectCode}"`,
      `"${subject.class}"`,
      `"${subject.description}"`,
    ].join(",");
  });

  const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");

  try {
    fs.writeFileSync(outputPath, csvContent, "utf-8");

    console.log(`\n✨ Subject CSV Generation Successful (${termArg} Term)!`);
    console.log("============================");
    console.log(`📁 File Name: ${fileName}`);
    console.log(`🏠 Saved to:  ${outputPath}`);
    console.log(`📚 Count:     ${filteredSubjects.length} subjects`);
    console.log("============================\n");

    console.log("💡 The file has been saved to your Downloads folder.");
  } catch (error) {
    console.error("❌ Failed to generate CSV:", error);
  }
}

generateSubjectsCSV();
