import { sql, SQL, getTableColumns } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

/**
 * Builds a `set` clause using `excluded` values for an upsert conflict.
 * @param table - The Drizzle schema table.
 * @param columns - List of column keys to include in the upsert set.
 */
function buildExcludedSetClause<
  T extends PgTable,
  K extends keyof T["_"]["columns"]
>(table: T, columns: K[]): Record<K, SQL> {
  const allColumns = getTableColumns(table);
  return columns.reduce((acc, column) => {
    acc[column] = sql.raw(`excluded.${allColumns[column].name}`);
    return acc;
  }, {} as Record<K, SQL>);
}

export { buildExcludedSetClause };
