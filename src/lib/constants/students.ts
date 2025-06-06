/**
 * Student data constants for quiz application
 * Contains class lists and subject information for seeding
 */

import type { StudentData, SubjectData, Class } from "@/types/app";

/**
 * BASIC 5 Class Student List
 */
export const BASIC5_STUDENTS: Omit<StudentData, "studentCode">[] = [
  { name: "AJIDE NIFEMI CHRISTIANA", gender: "FEMALE", class: "BASIC5" },
  {
    name: "OLATIMEHIN OLUWATISE CHRISTABEL",
    gender: "FEMALE",
    class: "BASIC5",
  },
  { name: "ADEOYE DANIEL ADESANMISI", gender: "MALE", class: "BASIC5" },
  { name: "OGUNMODEDE JOHN OLUWATIMILEHIN", gender: "MALE", class: "BASIC5" },
  { name: "AJIBOLA OLUWANIFEMI OPEMIPO", gender: "MALE", class: "BASIC5" },
  { name: "ADEMOLA ADEKIITE ADEMOLA", gender: "MALE", class: "BASIC5" },
  {
    name: "OJUOLAPE-OLAJIDE SHINAYOMI SAMUEL",
    gender: "MALE",
    class: "BASIC5",
  },
  { name: "SAMUEL PEACE OLUWADAMILOLA", gender: "FEMALE", class: "BASIC5" },
  { name: "OJO OLUWASEKEMI PRECIOUS", gender: "FEMALE", class: "BASIC5" },
  { name: "OLAYINKA OLAMIDE PRECIOUS", gender: "MALE", class: "BASIC5" },
  { name: "OYEWOLE BLISS OLUWAFIREWAMIRI", gender: "FEMALE", class: "BASIC5" },
  { name: "AKINYEMI DANIELLA PRECIOUS", gender: "FEMALE", class: "BASIC5" },
  { name: "OLAYINKA OLUMIDE PRAISE", gender: "MALE", class: "BASIC5" },
  { name: "KOLAPO ELIZABETH IYANUOLUWA", gender: "FEMALE", class: "BASIC5" },
  { name: "OKOLI MARY-JANE MESAOMACHUKWU", gender: "FEMALE", class: "BASIC5" },
  { name: "OKOLI CHIMDINDU FRANCIS", gender: "MALE", class: "BASIC5" },
  { name: "AYENI MOFEOLUWA ENOCH", gender: "MALE", class: "BASIC5" },
  { name: "ILESANMI ROSETTE OLUWAPEMISIRE", gender: "FEMALE", class: "BASIC5" },
  { name: "OLANIYI MICHAEL OLAMIDE", gender: "MALE", class: "BASIC5" },
  { name: "OJIKUTU PRECIOUS AYOMIDE", gender: "FEMALE", class: "BASIC5" },
  { name: "ADEKOLA DANIEL OLUWADARASIMI", gender: "MALE", class: "BASIC5" },
  { name: "OYERINDE DANIEL", gender: "MALE", class: "BASIC5" },
];

/**
 * SS 2 Class Student List
 */
export const SS2_STUDENTS: Omit<StudentData, "studentCode">[] = [
  { name: "OJO OLOLADE PEACE", gender: "FEMALE", class: "SS2" },
  { name: "AWOLUMATE DANIEL", gender: "MALE", class: "SS2" },
  { name: "JOHN RACHEAL TEMITOPE", gender: "FEMALE", class: "SS2" },
  { name: "ALABI SAMUEL OREOFEOLUWA", gender: "MALE", class: "SS2" },
  { name: "OYERINDE DANIEL", gender: "MALE", class: "SS2" },
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
  { name: "OYERINDE DANIEL", gender: "MALE", class: "JSS3" },
];

/**
 * Generate student codes with class prefix
 */
export function generateStudentCodes(): StudentData[] {
  const allStudents: StudentData[] = [];

  // Generate BASIC5 student codes
  BASIC5_STUDENTS.forEach((student, index) => {
    allStudents.push({
      ...student,
      studentCode: `BASIC5_STU_${String(index + 1).padStart(3, "0")}`, // BASIC5_STU_001, BASIC5_STU_002, etc.
    });
  });

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
 * Centralized subject name
 */
export const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  MATHEMATICS: "MATH",
  "ENGLISH LANGUAGE": "ENG",
  "BASIC SCIENCE": "BSC",
  "SOCIAL STUDIES": "SST",
  YORUBA: "YOR",
  "BASIC TECHNOLOGY": "TECH",
  HISTORY: "HIST",
  "AGRICULTURAL SCIENCE": "AGRIC",
  "PHYSICAL AND HEALTH EDUCATION": "PHE",
  "CULTURAL AND CREATIVE ART": "CCA",
  "CHRISTIAN RELIGIOUS STUDIES": "CRS",
  MUSIC: "MUSIC",
  "BUSINESS STUDIES": "BUSINESS",
  "CIVIC EDUCATION": "CIVIC",
  "COMPUTER SCIENCE": "COMP",
  "HOME ECONOMICS": "HOME",
  FRENCH: "FRENCH",
  BIOLOGY: "BIO",
  CHEMISTRY: "CHEM",
  PHYSICS: "PHY",
  "ANIMAL HUSBANDRY": "ANI",
  GEOGRAPHY: "GEO",
  ECONOMICS: "ECON",
  LITERATURE: "LIT",
  "FURTHER MATHS": "FURTMATH",
  GOVERNMENT: "GOV",
};

/**
 * Core subjects for BASIC5 class
 */
export const BASIC5_SUBJECTS = [
  "MATHEMATICS",
  "ENGLISH LANGUAGE",
  "BASIC SCIENCE",
  "SOCIAL STUDIES",
  "YORUBA",
];

/**
 * Subjects for JSS3 class
 */
export const JSS3_SUBJECTS = [
  "MATHEMATICS",
  "ENGLISH LANGUAGE",
  "BASIC SCIENCE",
  "BASIC TECHNOLOGY",
  "HISTORY",
  "AGRICULTURAL SCIENCE",
  "PHYSICAL AND HEALTH EDUCATION",
  "CULTURAL AND CREATIVE ART",
  "CHRISTIAN RELIGIOUS STUDIES",
  "YORUBA",
  "MUSIC",
  "BUSINESS STUDIES",
  "CIVIC EDUCATION",
  "SOCIAL STUDIES",
  "COMPUTER SCIENCE",
  "HOME ECONOMICS",
  "FRENCH",
];

/**
 * Subjects for SS2 class
 */
export const SS2_SUBJECTS = [
  "BIOLOGY",
  "CHEMISTRY",
  "PHYSICS",
  "ANIMAL HUSBANDRY",
  "AGRICULTURAL SCIENCE",
  "COMPUTER SCIENCE",
  "CIVIC EDUCATION",
  "GEOGRAPHY",
  "ECONOMICS",
  "LITERATURE",
  "FURTHER MATHS",
  "MATHEMATICS",
  "ENGLISH LANGUAGE",
  "GOVERNMENT",
  "YORUBA",
  "CHRISTIAN RELIGIOUS STUDIES",
];

/**
 * Get subjects for a specific class
 */
export function getSubjectsForClass(cls: Class): string[] {
  switch (cls) {
    case "BASIC5":
      return BASIC5_SUBJECTS;
    case "JSS3":
      return JSS3_SUBJECTS;
    case "SS2":
      return SS2_SUBJECTS;
    default:
      return [];
  }
}

/**
 * Generate subject name from code using centralized mapping
 */
export function generateSubjectName(subjectCode: string): string {
  const abbreviationToName: Record<string, string> = {};
  Object.entries(SUBJECT_ABBREVIATIONS).forEach(([fullName, abbrev]) => {
    abbreviationToName[abbrev] = fullName;
  });

  const parts = subjectCode.split("_");
  if (parts.length >= 2) {
    const subjectPart = parts[1];
    return abbreviationToName[subjectPart] || subjectPart;
  }

  return abbreviationToName[subjectCode] || subjectCode;
}

/**
 * Generate subject codes with class prefix
 */
export function generateSubjectCodes(): SubjectData[] {
  const subjects: SubjectData[] = [];
  const classes: Class[] = ["BASIC5", "JSS3", "SS2"];

  classes.forEach((cls) => {
    const classSubjects = getSubjectsForClass(cls);

    classSubjects.forEach((subject) => {
      const subjectAbbreviation = SUBJECT_ABBREVIATIONS[subject];

      if (!subjectAbbreviation) {
        console.warn(`No abbreviation found for subject: ${subject}`);
        return;
      }

      const subjectCode = `${cls}_${subjectAbbreviation}`;

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
