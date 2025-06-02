#!/usr/bin/env node

/**
 * CLI Seeding Script for Quiz Application
 * Run with: node scripts/seed.js or pnpm run seed
 */

import { UserSeedingService } from "../src/lib/auth/user-seeding-service.js";
import { sqliteManager } from "../src/lib/database/sqlite.js";

async function main() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Initialize database
    console.log("📁 Initializing database...");
    await sqliteManager.initialize();
    console.log("✅ Database initialized\n");

    // Create seeding service
    const seedingService = new UserSeedingService();

    // Run seeding
    console.log("👥 Creating student and subject data...");
    const results = await seedingService.createProductionData();

    // Display results
    console.log("\n📊 Seeding Results:");
    console.log("==================");

    console.log("\n👥 Students:");
    console.log(`   ✅ Created: ${results.users.created}`);
    console.log(`   ⏭️  Skipped: ${results.users.skipped}`);
    console.log(`   ❌ Errors:  ${results.users.errors.length}`);

    if (results.users.errors.length > 0) {
      console.log("\n   Error Details:");
      results.users.errors.forEach((error) => console.log(`   • ${error}`));
    }

    console.log("\n📚 Subjects:");
    console.log(`   ✅ Created: ${results.subjects.created}`);
    console.log(`   ⏭️  Skipped: ${results.subjects.skipped}`);
    console.log(`   ❌ Errors:  ${results.subjects.errors.length}`);

    if (results.subjects.errors.length > 0) {
      console.log("\n   Error Details:");
      results.subjects.errors.forEach((error) => console.log(`   • ${error}`));
    }

    console.log("\n🎉 Seeding completed successfully!");

    if (results.users.created > 0) {
      console.log("\n📋 Sample Student Codes Generated:");
      console.log("   SS2_STU_001, SS2_STU_002, SS2_STU_003, SS2_STU_004");
      console.log(
        "   JSS3_STU_001, JSS3_STU_002, JSS3_STU_003, JSS3_STU_004, JSS3_STU_005, JSS3_STU_006, JSS3_STU_007"
      );
      console.log("\n📋 Subject Codes Generated:");
      console.log("   SS2_ENG, SS2_MTH, SS2_SST, SS2_BSC, SS2_YOR");
      console.log("   JSS3_ENG, JSS3_MTH, JSS3_SST, JSS3_BSC, JSS3_YOR");
    }
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  } finally {
    // Close database connection
    sqliteManager.close();
    console.log("\n🔐 Database connection closed");
  }
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the script
main().catch(console.error);
