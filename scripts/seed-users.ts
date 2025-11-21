#!/usr/bin/env node

/**
 * CLI Seeding Script for Quiz Application
 * Run with: node scripts/seed.js or pnpm run seed
 */

import { config } from "dotenv";
config();

import { UserSeedingService } from "../src/lib/seeding/user-seeding-service";
import { RemoteDatabaseService } from "../src/lib/database/remote-database-service";
import { ALL_STUDENTS, ALL_SUBJECTS } from "../src/lib/constants/students";

async function main() {
  console.log("🌱 Starting database seeding...\n");

  const remoteDb = RemoteDatabaseService.getInstance();

  try {
    console.log("📁 Initializing remote database...");
    await remoteDb.initialize(process.env.NEON_DATABASE_URL!);

    // Seed subjects
    console.log("📚 Creating subjects...");
    const userSeedingService = new UserSeedingService({ isRemote: true });
    const subjectResults = await userSeedingService.createSubjectsData();

    console.log("\n📊 Subject Seeding Results:");
    console.log("============================");
    console.log(`   ✅ Created: ${subjectResults.created}`);
    console.log(`   ⏭️  Skipped: ${subjectResults.existing}`);
    console.log(`   ❌ Errors:  ${subjectResults.errors.length}`);

    if (subjectResults.errors.length > 0) {
      console.log("\n   Error Details:");
      subjectResults.errors.forEach((error) => console.log(`   • ${error}`));
    }

    // Seed users
    console.log("\n👥 Creating student data...");
    const userResults = await userSeedingService.createUserData();

    console.log("\n📊 User Seeding Results:");
    console.log("=========================");
    console.log(`   ✅ Created: ${userResults.users.created}`);
    console.log(`   ⏭️  Skipped: ${userResults.users.skipped}`);
    console.log(`   ❌ Errors:  ${userResults.users.errors.length}`);

    if (userResults.users.errors.length > 0) {
      console.log("\n   Error Details:");
      userResults.users.errors.forEach((error) => console.log(`   • ${error}`));
    }

    console.log("\n🎉 Seeding completed successfully!");

    if (userResults.users.created > 0 || subjectResults.created > 0) {
      const studentsByClass = ALL_STUDENTS.reduce((acc, student) => {
        const classKey = student.class;
        if (!acc[classKey]) {
          acc[classKey] = [];
        }
        acc[classKey].push(student.studentCode);
        return acc;
      }, {} as Record<string, string[]>);

      console.log("\n📋 Sample Student Codes Generated:");
      Object.entries(studentsByClass).forEach(([className, codes]) => {
        const sampleCodes = codes.slice(0, 5).join(", ");
        const remaining =
          codes.length > 5
            ? `... (${codes.length} total)`
            : `(${codes.length} total)`;
        console.log(
          `   ${className}: ${sampleCodes}${
            codes.length > 5 ? ", ..." : ""
          } ${remaining}`
        );
      });

      const subjectsByClass = ALL_SUBJECTS.reduce((acc, subject) => {
        const classKey = subject.class;
        if (!acc[classKey]) {
          acc[classKey] = [];
        }
        acc[classKey].push(subject.subjectCode);
        return acc;
      }, {} as Record<string, string[]>);

      console.log("\n📋 Subject Codes Generated:");
      Object.entries(subjectsByClass).forEach(([className, codes]) => {
        const sampleCodes = codes.slice(0, 5).join(", ");
        const remaining =
          codes.length > 5
            ? `... (${codes.length} total)`
            : `(${codes.length} total)`;
        console.log(
          `   ${className}: ${sampleCodes}${
            codes.length > 5 ? ", ..." : ""
          } ${remaining}`
        );
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("\n❌ Seeding failed:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    } else {
      console.error("\n❌ Seeding failed:", String(error));
    }
    process.exit(1);
  } finally {
    try {
      await remoteDb.cleanup();
    } catch (cleanupError) {
      console.warn("⚠️ Remote DB cleanup warning:", cleanupError);
    }
  }
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch(console.error);
