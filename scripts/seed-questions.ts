import { CSVImportService } from "../src/lib/import/csv-import-service";
import { LocalDatabaseService } from "../src/lib/database/local-database-service";
import * as fs from "fs/promises";
import * as path from "path";

async function seedQuestionsFromCSV() {
  console.log("🌱 Starting CSV question seeding...");

  try {
    const localDb = LocalDatabaseService.getInstance();
    await localDb.initialize();

    const csvImporter = new CSVImportService();

    const csvDir = path.join(process.cwd(), "data", "csv-imports");

    try {
      await fs.access(csvDir);
    } catch (error) {
      throw new Error(`CSV imports directory not found: ${csvDir}`);
    }

    const files = await fs.readdir(csvDir);
    const csvFiles = files.filter((file) => file.endsWith(".csv"));

    if (csvFiles.length === 0) {
      console.log("⚠️  No CSV files found in data/csv-imports directory");
      return;
    }

    console.log(`📂 Found ${csvFiles.length} CSV files:`);
    csvFiles.forEach((file) => console.log(`  - ${file}`));

    let totalResults = {
      processed: 0,
      successful: 0,
      failed: 0,
      subjects: { created: 0, existing: 0 },
      questions: { regular: 0, passages: 0, headers: 0 },
      errors: [] as string[],
    };

    for (const csvFile of csvFiles) {
      const filePath = path.join(csvDir, csvFile);

      console.log(`\n📋 Processing ${csvFile}...`);

      try {
        const csvContent = await fs.readFile(filePath, "utf-8");

        const result = await csvImporter.importQuestionsFromCSV(csvContent);

        totalResults.processed += result.processed;
        totalResults.successful += result.successful;
        totalResults.failed += result.failed;
        totalResults.subjects.created += result.subjects.created;
        totalResults.subjects.existing += result.subjects.existing;
        totalResults.questions.regular += result.questions.regular;
        totalResults.questions.passages += result.questions.passages;
        totalResults.questions.headers += result.questions.headers;
        totalResults.errors.push(
          ...result.errors.map((err) => `${csvFile}: ${err}`)
        );

        console.log(
          `  ✅ ${result.successful}/${result.processed} questions imported`
        );

        if (result.subjects.created > 0) {
          console.log(`  🆕 Created ${result.subjects.created} new subjects`);
        }

        if (result.failed > 0) {
          console.log(`  ⚠️  ${result.failed} questions failed`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error(`  ❌ Failed to process ${csvFile}:`, errorMessage);
        totalResults.errors.push(`${csvFile}: ${errorMessage}`);
      }
    }

    console.log("\n📊 SEEDING SUMMARY:");
    console.log("==================");
    console.log(`Total Questions Processed: ${totalResults.processed}`);
    console.log(`Successfully Imported: ${totalResults.successful}`);
    console.log(`Failed: ${totalResults.failed}`);
    console.log(`\nSubjects:`);
    console.log(`  Created: ${totalResults.subjects.created}`);
    console.log(`  Existing: ${totalResults.subjects.existing}`);
    console.log(`\nQuestions by Type:`);
    console.log(`  Regular Questions: ${totalResults.questions.regular}`);
    console.log(`  Passages: ${totalResults.questions.passages}`);
    console.log(`  Headers: ${totalResults.questions.headers}`);

    if (totalResults.errors.length > 0) {
      console.log(`\n❌ Errors (${totalResults.errors.length}):`);
      totalResults.errors.slice(0, 10).forEach((error) => {
        console.log(`  - ${error}`);
      });

      if (totalResults.errors.length > 10) {
        console.log(`  ... and ${totalResults.errors.length - 10} more errors`);
      }
    }

    if (totalResults.successful > 0) {
      console.log("\n🎉 Question seeding completed successfully!");
    } else {
      console.log("\n⚠️  No questions were imported");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("💥 Question seeding failed:", errorMessage);
    process.exit(1);
  }
}

if (require.main === module) {
  seedQuestionsFromCSV().catch((error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to run seeding:", errorMessage);
  });
}

export { seedQuestionsFromCSV };
