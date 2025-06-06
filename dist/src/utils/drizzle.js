"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExcludedSetClause = buildExcludedSetClause;
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Builds a `set` clause using `excluded` values for an upsert conflict.
 * @param table - The Drizzle schema table.
 * @param columns - List of column keys to include in the upsert set.
 */
function buildExcludedSetClause(table, columns) {
    const allColumns = (0, drizzle_orm_1.getTableColumns)(table);
    return columns.reduce((acc, column) => {
        acc[column] = drizzle_orm_1.sql.raw(`excluded.${allColumns[column].name}`);
        return acc;
    }, {});
}
