/**
 * Student data constants for quiz application
 * Contains class lists and subject information for seeding
 */

import type { StudentData, SubjectData, Class, Gender } from "../../types";

/**
 * SS 2 Class Student List
 */
export const SS2_STUDENTS: Omit<StudentData, "studentCode">[] = [
  { name: "OJO OLOLADE PEACE", gender: "FEMALE", class: "SS2" },
  { name: "AWOLUMATE DANIEL", gender: "MALE", class: "SS2" },
  { name: "JOHN RACHEAL TEMITOPE", gender: "FEMALE", class: "SS2" },
  { name: "ALABI SAMUEL OREOFEOLUWA", gender: "MALE", class: "SS2" },
];

/**
 * JSS 3 Class Student List
 */
export const JSS3_STUDENTS: Omit<StudentData, "studentCode">[] = [
  { name: "ADEBIYI ADETAYO OLARENWAJU", gender: "MALE", class: "JSS3" },
  { name: "ADEGBOYEGA DEMORE ISRAEL", gender: "MALE", class: "JSS3" },
  { name: "YUSUFF EXCEL DEMILADE", gender: "MALE", class: "JSS3" },
  { name: "OJO MARY WURAOLA", gender: "FEMALE", class: "JSS3" },
  {
    name: "OLAWALE RACHAEL OLUWAGBESIMILEHIN",
    gender: "FEMALE",
    class: "JSS3",
  },
  { name: "OLOJU DOYINSOLA ABIGAEL", gender: "FEMALE", class: "JSS3" },
  { name: "CHINEDU PRECIOUS CHIDIMMA", gender: "FEMALE", class: "JSS3" },
];

/**
 * Generate student codes with class prefix
 */
export function generateStudentCodes(): StudentData[] {
  const allStudents: StudentData[] = [];

  // Generate SS2 student codes
  SS2_STUDENTS.forEach((student, index) => {
    allStudents.push({
      ...student,
      studentCode: `SS2_STU_${String(index + 1).padStart(3, "0")}`, // SS2_STU_001, SS2_STU_002, etc.
    });
  });

  // Generate JSS3 student codes
  JSS3_STUDENTS.forEach((student, index) => {
    allStudents.push({
      ...student,
      studentCode: `JSS3_STU_${String(index + 1).padStart(3, "0")}`, // JSS3_STU_001, JSS3_STU_002, etc.
    });
  });

  return allStudents;
}

/**
 * Core subjects for both classes
 */
export const CORE_SUBJECTS = [
  "ENGLISH STUDIES",
  "MATHEMATICS",
  "SOCIAL STUDIES",
  "BASIC SCIENCE",
  "YORUBA LANGUAGE",
];

/**
 * Generate subject codes with class prefix
 */
export function generateSubjectCodes(): SubjectData[] {
  const subjects: SubjectData[] = [];
  const classes: Class[] = ["SS2", "JSS3"];

  classes.forEach((cls) => {
    CORE_SUBJECTS.forEach((subject) => {
      let subjectCode = "";

      // Create abbreviations for subject codes
      switch (subject) {
        case "ENGLISH STUDIES":
          subjectCode = `${cls}_ENG`;
          break;
        case "MATHEMATICS":
          subjectCode = `${cls}_MATH`;
          break;
        case "SOCIAL STUDIES":
          subjectCode = `${cls}_SST`;
          break;
        case "BASIC SCIENCE":
          subjectCode = `${cls}_BSC`;
          break;
        case "YORUBA LANGUAGE":
          subjectCode = `${cls}_YOR`;
          break;
        default:
          subjectCode = `${cls}_${subject.substring(0, 3).toUpperCase()}`;
      }

      subjects.push({
        name: subject,
        subjectCode,
        description: `${subject} for ${cls} students`,
        class: cls,
      });
    });
  });

  return subjects;
}

/**
 * All students with generated codes
 */
export const ALL_STUDENTS = generateStudentCodes();

/**
 * All subjects with generated codes
 */
export const ALL_SUBJECTS = generateSubjectCodes();
