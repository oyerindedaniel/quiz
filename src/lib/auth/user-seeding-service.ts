import { LocalDatabaseService } from "../database/local-database-service.js";
import { generateUUID } from "../../utils/lib.js";
import { ALL_STUDENTS } from "../constants/students.js";
import bcrypt from "bcryptjs";
import type {
  UserSeedData,
  SeedResult,
  Class,
  Gender,
} from "../../types/app.js";
import { RemoteDatabaseService } from "../database/remote-database-service.js";
import { v4 as uuidv4 } from "uuid";

interface DatabaseServiceOptions {
  isRemote?: boolean;
}

export class UserSeedingService {
  private localDb: LocalDatabaseService;
  private remoteDb: RemoteDatabaseService;
  private isRemote: boolean;

  constructor(options: DatabaseServiceOptions = {}) {
    this.localDb = LocalDatabaseService.getInstance();
    this.remoteDb = RemoteDatabaseService.getInstance();
    this.isRemote = options.isRemote || false;
  }

  private generateUUID(): string {
    return uuidv4();
  }

  /**
   * Seed users from CSV data
   */
  async seedUsersFromCSV(csvData: string): Promise<SeedResult> {
    const users = this.parseUserCSV(csvData);
    const results: SeedResult = { created: 0, skipped: 0, errors: [] };

    for (const userData of users) {
      try {
        const existing = this.isRemote
          ? await this.remoteDb.findUserByStudentCode(userData.studentCode)
          : await this.localDb.findUserByStudentCode(userData.studentCode);
        if (existing) {
          results.skipped++;
          continue;
        }

        const passwordHash = await bcrypt.hash(userData.pin, 10);

        await (this.isRemote
          ? this.remoteDb.createUser({
              id: this.generateUUID(),
              name: userData.name,
              studentCode: userData.studentCode,
              passwordHash,
              class: userData.class,
              gender: userData.gender,
            })
          : this.localDb.createUser({
              id: generateUUID(),
              name: userData.name,
              studentCode: userData.studentCode,
              passwordHash,
              class: userData.class,
              gender: userData.gender,
            }));

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
        const existing = this.isRemote
          ? await this.remoteDb.findSubjectByCode(subjectData.subjectCode)
          : await this.localDb.findSubjectByCode(subjectData.subjectCode);
        if (existing) {
          result.existing++;
          continue;
        }

        await (this.isRemote
          ? this.remoteDb.createSubject({
              id: uuidv4(),
              name: subjectData.name,
              subjectCode: subjectData.subjectCode,
              description: subjectData.description,
              class: subjectData.class,
            })
          : this.localDb.createSubject({
              id: uuidv4(),
              name: subjectData.name,
              subjectCode: subjectData.subjectCode,
              description: subjectData.description,
              class: subjectData.class,
            }));

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
