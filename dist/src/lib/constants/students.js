"use strict";
/**
 * Student data constants for quiz application
 * Contains class lists and subject information for seeding
 *
 * This file merges both old and new student data:
 * - Old students: Original student lists (BASIC5_STUDENTS, SS2_STUDENTS, JSS3_STUDENTS)
 * - New students: Updated student lists with "NEW_" prefix in student codes to avoid clashes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SUBJECTS = exports.ALL_STUDENTS = exports.SS2_SUBJECTS = exports.JSS3_SUBJECTS = exports.BASIC5_SUBJECTS = exports.BASIC_SUBJECTS = exports.SS_SUBJECTS = exports.JSS_SUBJECTS = exports.SUBJECT_ABBREVIATIONS = exports.JSS3_STUDENTS = exports.SS2_STUDENTS = exports.BASIC5_STUDENTS = void 0;
exports.generateStudentCodes = generateStudentCodes;
exports.getSubjectsForClass = getSubjectsForClass;
exports.generateSubjectName = generateSubjectName;
exports.generateSubjectCodes = generateSubjectCodes;
// Import new student lists from new-students.ts
const new_students_js_1 = require("./new-students.js");
/**
 * BASIC 5 Class Student List
 */
exports.BASIC5_STUDENTS = [
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
exports.SS2_STUDENTS = [
    { name: "OJO OLOLADE PEACE", gender: "FEMALE", class: "SS2" },
    { name: "AWOLUMATE DANIEL", gender: "MALE", class: "SS2" },
    { name: "JOHN RACHEAL TEMITOPE", gender: "FEMALE", class: "SS2" },
    { name: "ALABI SAMUEL OREOFEOLUWA", gender: "MALE", class: "SS2" },
    { name: "OYERINDE DANIEL", gender: "MALE", class: "SS2" },
];
/**
 * JSS 3 Class Student List
 */
exports.JSS3_STUDENTS = [
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
 * Merges both old and new student lists
 */
function generateStudentCodes() {
    const allStudents = [];
    // Generate OLD BASIC5 student codes (original data)
    exports.BASIC5_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `BASIC5_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    // Generate OLD SS2 student codes (original data)
    exports.SS2_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `SS2_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    // Generate OLD JSS3 student codes (original data)
    exports.JSS3_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `JSS3_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    // Generate NEW student codes with "NEW_" prefix to avoid clashes
    new_students_js_1.BASIC5_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_BASIC5_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.SS2_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_SS2_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.SS3_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_SS3_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.SS1_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_SS1_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.JSS3_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_JSS3_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.BASIC4_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_BASIC4_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.JSS1_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_JSS1_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    new_students_js_1.JSS2_STUDENTS.forEach((student, index) => {
        allStudents.push({
            ...student,
            studentCode: `NEW_JSS2_STU_${String(index + 1).padStart(3, "0")}`,
        });
    });
    return allStudents;
}
/**
 * Centralized subject abbreviations
 * Merged from both old and new student data
 */
exports.SUBJECT_ABBREVIATIONS = {
    ...new_students_js_1.SUBJECT_ABBREVIATIONS,
};
/**
 * Subjects for JSS classes (JSS1, JSS2, JSS3)
 */
exports.JSS_SUBJECTS = new_students_js_1.JSS_SUBJECTS;
/**
 * Subjects for SS classes (SS1, SS2, SS3)
 */
exports.SS_SUBJECTS = new_students_js_1.SS_SUBJECTS;
/**
 * Subjects for BASIC classes (BASIC1, BASIC2, BASIC3, BASIC4, BASIC5)
 */
exports.BASIC_SUBJECTS = new_students_js_1.BASIC_SUBJECTS;
/**
 * Legacy subject lists (kept for backward compatibility)
 */
exports.BASIC5_SUBJECTS = new_students_js_1.BASIC_SUBJECTS;
exports.JSS3_SUBJECTS = new_students_js_1.JSS_SUBJECTS;
exports.SS2_SUBJECTS = new_students_js_1.SS_SUBJECTS;
/**
 * Get subjects for a specific class
 */
function getSubjectsForClass(cls) {
    // SS classes
    if (cls === "SS1" || cls === "SS2" || cls === "SS3") {
        return exports.SS_SUBJECTS;
    }
    // JSS classes
    if (cls === "JSS1" || cls === "JSS2" || cls === "JSS3") {
        return exports.JSS_SUBJECTS;
    }
    // BASIC classes (including BASIC1, BASIC2, BASIC3)
    if (cls === "BASIC1" ||
        cls === "BASIC2" ||
        cls === "BASIC3" ||
        cls === "BASIC4" ||
        cls === "BASIC5") {
        return exports.BASIC_SUBJECTS;
    }
    // Fallback for legacy enum values
    switch (cls) {
        case "BASIC5":
            return exports.BASIC_SUBJECTS;
        case "JSS3":
            return exports.JSS_SUBJECTS;
        case "SS2":
            return exports.SS_SUBJECTS;
        default:
            return [];
    }
}
/**
 * Generate subject name from code using centralized mapping
 */
function generateSubjectName(subjectCode) {
    const abbreviationToName = {};
    Object.entries(exports.SUBJECT_ABBREVIATIONS).forEach(([fullName, abbrev]) => {
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
 * Includes all classes: SS1, SS2, SS3, JSS1, JSS2, JSS3, BASIC1, BASIC2, BASIC3, BASIC4, BASIC5
 */
function generateSubjectCodes() {
    const subjects = [];
    // Use all classes from the enum
    const classes = [
        "BASIC1",
        "BASIC2",
        "BASIC3",
        "BASIC4",
        "BASIC5",
        "JSS1",
        "JSS2",
        "JSS3",
        "SS1",
        "SS2",
        "SS3",
    ];
    classes.forEach((cls) => {
        const classSubjects = getSubjectsForClass(cls);
        classSubjects.forEach((subject) => {
            const subjectAbbreviation = exports.SUBJECT_ABBREVIATIONS[subject];
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
exports.ALL_STUDENTS = generateStudentCodes();
/**
 * All subjects with generated codes
 */
exports.ALL_SUBJECTS = generateSubjectCodes();
