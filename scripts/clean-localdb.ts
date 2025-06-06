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
 * Deletes database files in a given directory.
 *
 * @param dir - Target directory to clean
 */
const cleanDatabaseFiles = (dir: string): void => {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.startsWith("quiz_app.db")) {
      const filePath = path.join(dir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${filePath}`);
      } catch (error) {
        console.warn(`Could not delete: ${filePath}`);
      }
    }
  });
};

cleanDatabaseFiles(".");

const appDataPath = getAppDataPath();
cleanDatabaseFiles(appDataPath);

console.log("Database cleanup completed");
