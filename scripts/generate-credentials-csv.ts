import { ALL_STUDENTS } from "../src/lib/constants/students.js";
import { generateStudentPin } from "../src/utils/pin-generator.js";
import fs from "fs";
import path from "path";

function generateCredentialsCSV() {
  const headers = ["name", "student_code", "pin", "class", "gender"];

  const rows = ALL_STUDENTS.map((student, index) => {
    const pin = generateStudentPin(index);
    return [
      student.name,
      student.studentCode,
      pin,
      student.class,
      student.gender,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  const outputPath = path.resolve("./student-credentials-final.csv");
  fs.writeFileSync(outputPath, csvContent, "utf-8");

  console.log("CSV generated successfully!");
  console.log("File saved to:", outputPath);
  console.log(`Total students: ${ALL_STUDENTS.length}`);
  console.log("\nCSV preview:");
  console.log(csvContent); // log everything, no slice
}

generateCredentialsCSV();
