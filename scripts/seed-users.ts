#!/usr/bin/env node

/**
 * CLI Seeding Script for Quiz Application
 * Run with: node scripts/seed.js or pnpm run seed
 */

import { config } from "dotenv";
config();

import { UserSeedingService } from "../src/lib/seeding/user-seeding-service";
import { RemoteDatabaseService } from "../src/lib/database/remote-database-service";

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
      console.log("\n📋 Sample Student Codes Generated:");
      console.log("   BASIC5_STU_001, BASIC5_STU_002, BASIC5_STU_003...");
      console.log("   SS2_STU_001, SS2_STU_002, SS2_STU_003, SS2_STU_004");
      console.log(
        "   JSS3_STU_001, JSS3_STU_002, JSS3_STU_003, JSS3_STU_004, JSS3_STU_005, JSS3_STU_006, JSS3_STU_007"
      );

      console.log("\n📋 Subject Codes Generated:");
      console.log(
        "   BASIC5_MATH, BASIC5_ENG, BASIC5_BSC, BASIC5_SST, BASIC5_YOR"
      );
      console.log(
        "   SS2_MATH, SS2_ENG, SS2_BIO, SS2_CHEM, SS2_PHY, SS2_GEO..."
      );
      console.log(
        "   JSS3_MATH, JSS3_ENG, JSS3_BSC, JSS3_SST, JSS3_YOR, JSS3_TECH..."
      );
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
