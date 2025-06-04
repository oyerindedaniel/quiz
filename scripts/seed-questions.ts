#!/usr/bin/env tsx

/**
 * Remote Question Seeding Script
 * Seeds questions from CSV to remote database only
 * Run with: tsx scripts/seed-questions.ts
 */

import { config } from "dotenv";
config();

import { CSVImportService } from "../src/lib/import/csv-import-service";
import { RemoteDatabaseService } from "../src/lib/database/remote-database-service";
import { createNeonManager } from "../src/lib/database/neon";
import * as fs from "fs/promises";
import * as path from "path";

async function main() {
  console.log("📚 Starting remote question seeding...\n");

  const neonManager = createNeonManager();

  try {
    console.log("📁 Initializing remote database...");
    await neonManager.initialize();
    console.log("✅ Remote database initialized\n");

    const remoteDb = RemoteDatabaseService.getInstance();
    await remoteDb.initialize(process.env.NEON_DATABASE_URL!);

    let totalQuestionsSeeded = 0;
    let totalQuestionsProcessed = 0;
    let totalQuestionsFailed = 0;
    const csvDir = path.join(process.cwd(), "data", "csv-imports");

    try {
      await fs.access(csvDir);
      const files = await fs.readdir(csvDir);
      const csvFiles = files.filter((file) => file.endsWith(".csv"));

      if (csvFiles.length === 0) {
        console.log("⚠️  No CSV files found in data/csv-imports directory");
        return;
      }

      console.log(`📊 Found ${csvFiles.length} CSV files for remote seeding`);

      const csvImporter = new CSVImportService({ isRemote: true });

      for (const csvFile of csvFiles) {
        try {
          console.log(`\n📝 Processing ${csvFile}...`);
          const filePath = path.join(csvDir, csvFile);
          const csvContent = await fs.readFile(filePath, "utf-8");

          const result = await csvImporter.importQuestionsFromCSV(
            csvContent,
            csvFile
          );

          totalQuestionsSeeded += result.successful;
          totalQuestionsProcessed += result.processed;
          totalQuestionsFailed += result.failed;

          console.log(`   ✅ Imported: ${result.successful} questions`);
          console.log(`   📊 Processed: ${result.processed} total records`);
          console.log(`   ❌ Failed: ${result.failed} questions`);

          if (result.subjects.created > 0) {
            console.log(
              `   🆕 Created: ${result.subjects.created} new subjects`
            );
          }
          if (result.subjects.existing > 0) {
            console.log(
              `   ⏭️  Found: ${result.subjects.existing} existing subjects`
            );
          }

          if (result.errors.length > 0) {
            console.log(`   📋 Error details:`);
            result.errors
              .slice(0, 3)
              .forEach((error) => console.log(`      • ${error}`));
            if (result.errors.length > 3) {
              console.log(
                `      ... and ${result.errors.length - 3} more errors`
              );
            }
          }
        } catch (fileError) {
          console.error(`❌ Failed to process ${csvFile}:`, fileError);
        }
      }

      console.log("\n🎉 Remote question seeding completed!");
      console.log("=====================================");
      console.log(`📊 Total questions seeded: ${totalQuestionsSeeded}`);
      console.log(`📄 Total records processed: ${totalQuestionsProcessed}`);
      console.log(`❌ Total failures: ${totalQuestionsFailed}`);
      console.log(`📄 Files processed: ${csvFiles.length}`);

      if (totalQuestionsSeeded > 0) {
        console.log("\n💡 Next steps:");
        console.log("   • Use admin panel to sync questions to local devices");
        console.log("   • Or run sync operations from the admin dashboard");
      }
    } catch (dirError) {
      console.log("⚠️  CSV imports directory not found");
      console.log("   Create 'data/csv-imports' directory and add CSV files");
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("\n❌ Remote question seeding failed:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    } else {
      console.error("\n❌ Remote question seeding failed:", String(error));
    }
    process.exit(1);
  } finally {
    neonManager.close();
    console.log("\n🔐 Database connection closed");
  }
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch(console.error);
