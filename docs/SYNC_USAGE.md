# Enhanced Sync and Seeding System

This document describes the improved seeding and sync system for the Quiz Application.

## Remote Seeding Scripts

### Overview

The seeding system has been restructured to separate remote database seeding from local database seeding:

- **Remote seeding**: Seeds data to the cloud database (NeonDB)
- **Local seeding**: Seeds data to local SQLite databases (handled by `auto-seeding-service.ts`)

### Available Scripts

#### 1. Remote Users and Subjects Seeding

```bash
pnpm run seed
# or
tsx scripts/seed.ts
```

Seeds users and subjects to the remote database only.

#### 2. Remote Admin Seeding

```bash
pnpm run seed:admin
# or
tsx scripts/seed-admin.ts
```

Seeds admin users to the remote database.

#### 3. Remote Questions Seeding

```bash
pnpm run import:csv
# or
tsx scripts/seed-questions.ts
```

Seeds questions from CSV files to the remote database.

#### 4. Complete Remote Seeding

```bash
pnpm run seed:remote
```

Runs all remote seeding scripts in sequence:

1. Users and subjects (`seed.ts`)
2. Admin users (`seed-admin.ts`)
3. Questions from CSV (`seed-questions.ts`)

## Enhanced Question Sync

### Basic Usage

```typescript
// Basic sync - updates existing questions, creates new ones
const result = await window.electronAPI.sync.syncQuestions();
```

### Advanced Usage with Options

#### Complete Subject Replacement

```typescript
// Replace all questions for all subjects
const result = await window.electronAPI.sync.syncQuestions({
  replaceExisting: true,
});
```

#### Sync Specific Subjects Only

```typescript
// Sync only specific subjects
const result = await window.electronAPI.sync.syncQuestions({
  subjectCodes: ["SS2_MATH", "SS2_ENG", "JSS3_BSC"],
});
```

#### Complete Replacement for Specific Subjects

```typescript
// Replace questions only for specific subjects
const result = await window.electronAPI.sync.syncQuestions({
  replaceExisting: true,
  subjectCodes: ["SS2_MATH", "JSS3_ENG"],
});
```

### Sync Result Structure

```typescript
interface SyncResult {
  success: boolean;
  questionsPulled?: number;
  subjectsSynced?: number;
  error?: string;
  details?: {
    newSubjects: number; // Subjects created locally
    updatedQuestions: number; // Existing questions updated
    newQuestions: number; // New questions created
    skippedQuestions: number; // Questions that failed to sync
    replacedSubjects: number; // Subjects completely replaced
  };
}
```

### Example Usage in Admin Panel

```typescript
// In an admin component
const handleQuestionSync = async () => {
  setLoading(true);
  try {
    const result = await window.electronAPI.sync.syncQuestions({
      replaceExisting: selectedAction === "replace",
      subjectCodes: selectedSubjects.length > 0 ? selectedSubjects : undefined,
    });

    if (result.success) {
      console.log(
        `Synced ${result.questionsPulled} questions across ${result.subjectsSynced} subjects`
      );
      console.log("Details:", result.details);
    } else {
      console.error("Sync failed:", result.error);
    }
  } catch (error) {
    console.error("Sync error:", error);
  } finally {
    setLoading(false);
  }
};
```

## Performance Optimizations

### Bulk Operations

The enhanced sync uses several optimizations:

1. **Parallel Data Fetching**: Questions and subjects are fetched in parallel
2. **Grouped Processing**: Questions are grouped by subject code for efficient processing
3. **Bulk Transactions**: All operations for each subject happen in a single transaction
4. **Bulk Creation**: Uses `bulkCreateQuestions` for creating multiple questions at once
5. **Smart Updates**: Only updates questions that have actually changed

### SQLite Optimizations

- Uses transactions to ensure consistency and improve performance
- Minimizes individual database calls by batching operations
- Updates subject question counts automatically after sync

## Error Handling

### Robust Error Management

- Each subject is processed independently (failure in one won't stop others)
- Individual question processing errors are logged but don't stop the batch
- Detailed error reporting in the result object
- Automatic rollback on transaction failures

### Monitoring and Logging

```typescript
// Check sync results for issues
if (result.details?.skippedQuestions > 0) {
  console.warn(
    `${result.details.skippedQuestions} questions were skipped due to errors`
  );
}

if (result.details?.newSubjects > 0) {
  console.info(`Created ${result.details.newSubjects} new subjects locally`);
}
```

## Best Practices

### When to Use Replace Mode

- **Initial setup**: When setting up a new local database
- **Major updates**: When the remote questions have been significantly restructured
- **Cleanup**: When local database might have corrupted or outdated questions

### When to Use Update Mode (Default)

- **Regular sync**: For routine synchronization
- **Incremental updates**: When only some questions have been modified
- **Production environments**: To preserve any local customizations

### Subject-Specific Sync

- **Targeted updates**: When only specific subjects have been updated
- **Bandwidth optimization**: To reduce data transfer in limited bandwidth environments
- **Testing**: When testing changes to specific subjects

### Example Workflow

```bash
# 1. Seed remote database with all data
pnpm run seed:remote

# 2. In the app, perform initial sync with replacement
await window.electronAPI.sync.syncQuestions({ replaceExisting: true });

# 3. For subsequent syncs, use update mode
await window.electronAPI.sync.syncQuestions();

# 4. If specific subjects are updated, sync only those
await window.electronAPI.sync.syncQuestions({
  subjectCodes: ['SS2_MATH']
});
```

## Database Schema Compatibility

### Local vs Remote Schema

The sync system handles differences between local SQLite and remote PostgreSQL schemas:

- **JSONB to JSON**: Converts PostgreSQL JSONB options to JSON strings for SQLite
- **Date Formats**: Converts PostgreSQL timestamps to ISO strings for SQLite
- **Field Mapping**: Maps remote schema fields to local schema fields automatically

### Subject Management

- Automatically creates missing subjects locally
- Updates subject question counts after sync
- Maintains referential integrity between subjects and questions

## Troubleshooting

### Common Issues

1. **Remote Database Unavailable**

   ```typescript
   // Check connection before sync
   if (
     !result.success &&
     result.error?.includes("Remote database not available")
   ) {
     // Handle offline scenario
   }
   ```

2. **Large Number of Skipped Questions**

   - Check remote database for data integrity issues
   - Verify CSV import was successful
   - Review console logs for specific error details

3. **Performance Issues**
   - Use subject-specific sync for large datasets
   - Consider using replace mode for complete refresh instead of many updates

### Debug Mode

Enable detailed logging by checking the browser console during sync operations. All operations are logged with timing and result information.
