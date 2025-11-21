import type Database from "better-sqlite3";
import { CLASS_VALUES } from "../constants/class-enum.js";
import {
  CLASS_VALUES_STRING,
  USER_COLUMNS,
  SUBJECT_COLUMNS,
  getUsersTableSQL,
  getSubjectsTableSQL,
} from "./sqlite-schema-utils.js";

export interface SQLiteMigrationContext {
  sqlite: Database.Database;
}

export interface SQLiteMigration {
  id: string;
  description: string;
  run: (context: SQLiteMigrationContext) => Promise<void> | void;
}

const columnExists = (
  sqlite: Database.Database,
  tableName: string,
  columnName: string
): boolean => {
  const result = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM pragma_table_info('${tableName}') WHERE name = ?`
    )
    .get(columnName) as { count: number };
  return result.count > 0;
};

const needsClassEnumMigration = (
  sqlite: Database.Database,
  tableName: "users" | "subjects"
): boolean => {
  const result = sqlite
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { sql?: string } | undefined;

  if (!result?.sql) {
    return false;
  }

  return !CLASS_VALUES.every((value) => result.sql?.includes(`'${value}'`));
};

const rebuildTableWithNewClassEnum = (
  sqlite: Database.Database,
  tableName: "users" | "subjects"
): void => {
  const tempTable = `${tableName}_enum_migration_temp`;
  const columns = tableName === "users" ? USER_COLUMNS : SUBJECT_COLUMNS;
  const columnList = columns.join(", ");

  const createTableSQL =
    tableName === "users"
      ? getUsersTableSQL(tempTable, CLASS_VALUES_STRING)
      : getSubjectsTableSQL(tempTable, CLASS_VALUES_STRING);

  const migrate = sqlite.transaction(() => {
    sqlite.exec(createTableSQL);
    sqlite.exec(
      `INSERT INTO ${tempTable} (${columnList}) SELECT ${columnList} FROM ${tableName}`
    );
    sqlite.exec(`DROP TABLE ${tableName}`);
    sqlite.exec(`ALTER TABLE ${tempTable} RENAME TO ${tableName}`);
  });

  migrate();
};

export const SQLITE_MIGRATIONS: SQLiteMigration[] = [
  {
    id: "001_add_subject_metadata_columns",
    description: "Add category and academic_year columns to subjects table",
    run: ({ sqlite }) => {
      if (!columnExists(sqlite, "subjects", "category")) {
        console.log("Adding category column to subjects table...");
        sqlite.exec("ALTER TABLE subjects ADD COLUMN category TEXT");
      }

      if (!columnExists(sqlite, "subjects", "academic_year")) {
        console.log("Adding academic_year column to subjects table...");
        sqlite.exec("ALTER TABLE subjects ADD COLUMN academic_year TEXT");
      }
    },
  },
  {
    id: "002_update_class_enum_constraints",
    description: "Update users and subjects class constraints",
    run: ({ sqlite }) => {
      const needsUsers = needsClassEnumMigration(sqlite, "users");
      if (needsUsers) {
        console.log(
          "Detected outdated class enum constraint on users table. Upgrading..."
        );
        rebuildTableWithNewClassEnum(sqlite, "users");
      }

      const needsSubjects = needsClassEnumMigration(sqlite, "subjects");
      if (needsSubjects) {
        console.log(
          "Detected outdated class enum constraint on subjects table. Upgrading..."
        );
        rebuildTableWithNewClassEnum(sqlite, "subjects");
      }
    },
  },
];
