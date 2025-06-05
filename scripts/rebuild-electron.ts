/**
 * @file Rebuilds native Node.js modules for Electron using the @electron/rebuild API.
 * Automatically reads Electron version from your package.json.
 */

import { rebuild } from "@electron/rebuild";
import * as path from "path";
import { readFileSync } from "fs";

function getElectronVersion(): string {
  const pkgJsonPath = path.resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

  const version = pkg?.devDependencies?.electron || pkg?.dependencies?.electron;

  if (!version) {
    throw new Error("Electron is not listed as a dependency in package.json.");
  }

  // Strip "^", "~", etc.
  return version.replace(/^[^0-9]*/, "");
}

/**
 * Rebuild native modules against the current Electron version.
 */
async function runRebuild(): Promise<void> {
  try {
    const electronVersion = getElectronVersion();

    await rebuild({
      buildPath: path.resolve(__dirname, ".."),
      electronVersion: "36.4.0",
      force: true,
      types: ["prod", "optional"],
    });

    console.info(
      `✅ Electron native modules rebuilt successfully for Electron ${electronVersion}.`
    );
  } catch (error) {
    console.error("❌ Failed to rebuild Electron native modules:", error);
    process.exit(1);
  }
}

runRebuild();
