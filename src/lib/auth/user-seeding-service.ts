import { AuthenticationService } from "./authentication-service";
import { LocalDatabaseService } from "../database/local-database-service";
import { generateUUID } from "../utils";
import { ALL_STUDENTS, ALL_SUBJECTS } from "../constants/students";
import type {
  UserSeedData,
  SubjectSeedData,
  SeedResult,
  StudentData,
  SubjectData,
  Class,
  Gender,
} from "../../types";

export class UserSeedingService {
  private authService: AuthenticationService;
  private localDb: LocalDatabaseService;

  constructor() {
    this.authService = AuthenticationService.getInstance();
    this.localDb = LocalDatabaseService.getInstance();
  }

  /**
   * Seed users from CSV data
   */
  async seedUsersFromCSV(csvData: string): Promise<SeedResult> {
    const users = this.parseUserCSV(csvData);
    const results: SeedResult = { created: 0, skipped: 0, errors: [] };

    for (const userData of users) {
      try {
        const existing = await this.localDb.findUserByStudentCode(
          userData.studentCode
        );
        if (existing) {
          results.skipped++;
          continue;
        }

        await this.authService.createUser({
          id: generateUUID(),
          name: userData.name,
          studentCode: userData.studentCode,
          passwordHash: "", // Will be set by authService
          pin: userData.pin,
          class: userData.class,
          gender: userData.gender,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create user ${userData.studentCode}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return results;
  }

  /**
   * Seed subjects from CSV data
   */
  async seedSubjectsFromCSV(csvData: string): Promise<SeedResult> {
    const subjects = this.parseSubjectCSV(csvData);
    const results: SeedResult = { created: 0, skipped: 0, errors: [] };

    for (const subjectData of subjects) {
      try {
        const existing = await this.localDb.findSubjectByCode(
          subjectData.subjectCode
        );
        if (existing) {
          results.skipped++;
          continue;
        }

        await this.localDb.createSubject({
          id: generateUUID(),
          name: subjectData.name,
          subjectCode: subjectData.subjectCode,
          description: subjectData.description,
          class: subjectData.class,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create subject ${subjectData.subjectCode}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return results;
  }

  /**
   * Create production data from constants
   */
  async createProductionData(): Promise<{
    users: SeedResult;
    subjects: SeedResult;
  }> {
    // Generate PIN codes for students (6-digit random numbers)
    const studentsWithPins: UserSeedData[] = ALL_STUDENTS.map((student) => ({
      name: student.name,
      studentCode: student.studentCode,
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      class: student.class,
      gender: student.gender,
    }));

    const userCSV = this.generateUserCSV(studentsWithPins);
    const subjectCSV = this.generateSubjectCSV(ALL_SUBJECTS);

    const userResults = await this.seedUsersFromCSV(userCSV);
    const subjectResults = await this.seedSubjectsFromCSV(subjectCSV);

    return {
      users: userResults,
      subjects: subjectResults,
    };
  }

  /**
   * Parse user CSV data
   */
  private parseUserCSV(csvData: string): UserSeedData[] {
    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          name: values[headers.indexOf("name")] || "",
          studentCode: values[headers.indexOf("student_code")] || "",
          pin: values[headers.indexOf("pin")] || "",
          class: (values[headers.indexOf("class")] as Class) || "SS2",
          gender: (values[headers.indexOf("gender")] as Gender) || "MALE",
        };
      })
      .filter(
        (user) =>
          user.name && user.studentCode && user.pin && user.class && user.gender
      );
  }

  /**
   * Parse subject CSV data
   */
  private parseSubjectCSV(csvData: string): SubjectSeedData[] {
    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          name: values[headers.indexOf("name")] || "",
          subjectCode: values[headers.indexOf("subject_code")] || "",
          description: values[headers.indexOf("description")] || undefined,
          class: (values[headers.indexOf("class")] as Class) || "SS2",
        };
      })
      .filter(
        (subject) => subject.name && subject.subjectCode && subject.class
      );
  }

  /**
   * Generate user CSV from data
   */
  private generateUserCSV(users: UserSeedData[]): string {
    const headers = ["name", "student_code", "pin", "class", "gender"];
    const rows = users.map((user) =>
      [user.name, user.studentCode, user.pin, user.class, user.gender].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Generate subject CSV from data
   */
  private generateSubjectCSV(subjects: SubjectData[]): string {
    const headers = ["name", "subject_code", "description", "class"];
    const rows = subjects.map((subject) =>
      [
        subject.name,
        subject.subjectCode,
        subject.description || "",
        subject.class,
      ].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }
}
