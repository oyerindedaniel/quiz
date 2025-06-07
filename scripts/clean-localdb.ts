import fs from "fs";
import path from "path";
import os from "os";

/**
 * Gets platform-specific application data directory path.
 */
const getAppDataPath = (): string => {
  switch (process.platform) {
    case "win32":
      return path.join(os.homedir(), "AppData", "Roaming", "quiz-app");
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "quiz-app"
      );
    default:
      return path.join(os.homedir(), ".config", "quiz-app");
  }
};

/**
 * Gets the Electron default userData directory path.
 */
const getElectronDataPath = (): string => {
  switch (process.platform) {
    case "win32":
      return path.join(os.homedir(), "AppData", "Roaming", "Electron");
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Electron"
      );
    default:
      return path.join(os.homedir(), ".config", "Electron");
  }
};

/**
 * Deletes database files in a given directory.
 *
 * @param dir - Target directory to clean
 */
const cleanDatabaseFiles = (dir: string): void => {
  console.log(`Checking directory: ${dir}`);

  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  console.log(`Found ${files.length} files in ${dir}`);

  let deletedCount = 0;
  files.forEach((file) => {
    if (file.startsWith("quiz_app.db")) {
      const filePath = path.join(dir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted: ${filePath}`);
        deletedCount++;
      } catch (error) {
        console.warn(`❌ Could not delete: ${filePath} - ${error}`);
      }
    }
  });

  if (deletedCount === 0) {
    console.log(`No quiz_app.db* files found in ${dir}`);
  }
};

console.log("Starting database cleanup...");

console.log("\n1. Cleaning current directory:");
cleanDatabaseFiles(".");

console.log("\n2. Cleaning app data directory:");
const appDataPath = getAppDataPath();
cleanDatabaseFiles(appDataPath);

console.log("\n3. Cleaning Electron data directory:");
const electronDataPath = getElectronDataPath();
cleanDatabaseFiles(electronDataPath);

console.log("\nDatabase cleanup completed");
console.log("\n💡 Note: If files could not be deleted due to 'EBUSY' errors,");
console.log(
  "   please close the Electron app first, then run this script again."
);
