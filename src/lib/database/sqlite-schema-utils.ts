import { CLASS_VALUES } from "../constants/class-enum.js";

export const USER_COLUMNS = [
  "id",
  "name",
  "student_code",
  "password_hash",
  "class",
  "gender",
  "created_at",
  "updated_at",
  "last_synced",
  "is_active",
  "last_login",
] as const;

export const SUBJECT_COLUMNS = [
  "id",
  "name",
  "subject_code",
  "description",
  "class",
  "total_questions",
  "created_at",
  "updated_at",
  "is_active",
  "category",
  "academic_year",
] as const;

export function getUsersTableSQL(
  tableName: string,
  classEnumValues: string,
  includeIfNotExists = false
): string {
  const clause = includeIfNotExists ? "IF NOT EXISTS " : "";
  return `CREATE TABLE ${clause}${tableName} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        student_code TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        class TEXT NOT NULL CHECK (class IN (${classEnumValues})),
        gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_synced TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT
      )`;
}

export function getSubjectsTableSQL(
  tableName: string,
  classEnumValues: string,
  includeIfNotExists = false
): string {
  const clause = includeIfNotExists ? "IF NOT EXISTS " : "";
  return `CREATE TABLE ${clause}${tableName} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
        subject_code TEXT UNIQUE NOT NULL,
        description TEXT,
        class TEXT NOT NULL CHECK (class IN (${classEnumValues})),
        total_questions INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        category TEXT,
        academic_year TEXT
      )`;
}

export const CLASS_VALUES_STRING = CLASS_VALUES.map((c) => `'${c}'`).join(", ");
