import { LocalDatabaseService } from "../database/local-database-service";
import { generateUUID } from "../utils";
import { ALL_STUDENTS } from "../constants/students";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { UserSeedData, SeedResult, Class, Gender } from "@/types";

export class UserSeedingService {
  private localDb: LocalDatabaseService;

  constructor() {
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

        const passwordHash = await bcrypt.hash(userData.pin, 10);

        await this.localDb.createUser({
          id: generateUUID(),
          name: userData.name,
          studentCode: userData.studentCode,
          passwordHash,
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
   * Create user data
   */
  async createUserData(): Promise<{
    users: SeedResult;
  }> {
    const studentsWithPins: UserSeedData[] = ALL_STUDENTS.map(
      (student, index) => {
        const pin = String(100000 + (index + 1)).padStart(6, "1");

        return {
          name: student.name,
          studentCode: student.studentCode,
          pin: pin,
          class: student.class,
          gender: student.gender,
        };
      }
    );

    const userCSV = this.generateUserCSV(studentsWithPins);

    const userResults = await this.seedUsersFromCSV(userCSV);

    return {
      users: userResults,
    };
  }

  /**
   * Get all student login credentials
   */
  getStudentCredentials(): UserSeedData[] {
    return ALL_STUDENTS.map((student, index) => {
      const pin = String(100000 + (index + 1)).padStart(6, "1");

      return {
        name: student.name,
        studentCode: student.studentCode,
        pin: pin,
        class: student.class,
        gender: student.gender,
      };
    });
  }

  /**
   * Create subjects data
   */
  async createSubjectsData(): Promise<{
    created: number;
    existing: number;
    errors: string[];
  }> {
    const { ALL_SUBJECTS } = await import("../constants/students");
    const result: { created: number; existing: number; errors: string[] } = {
      created: 0,
      existing: 0,
      errors: [],
    };

    for (const subjectData of ALL_SUBJECTS) {
      try {
        const existing = await this.localDb.findSubjectByCode(
          subjectData.subjectCode
        );
        if (existing) {
          result.existing++;
          continue;
        }

        await this.localDb.createSubject({
          id: uuidv4(),
          name: subjectData.name,
          subjectCode: subjectData.subjectCode,
          description: subjectData.description,
          class: subjectData.class,
          totalQuestions: 0,
        });

        result.created++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(
          `Failed to create subject ${subjectData.subjectCode}: ${errorMessage}`
        );
      }
    }

    return result;
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
   * Generate user CSV from data
   */
  private generateUserCSV(users: UserSeedData[]): string {
    const headers = ["name", "student_code", "pin", "class", "gender"];
    const rows = users.map((user) =>
      [user.name, user.studentCode, user.pin, user.class, user.gender].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }
}
