# 🔄 Quiz App Sync System Implementation Guide

## Overview

The Quiz App implements a sophisticated **offline-first sync system** that bridges the local SQLite database with a remote PostgreSQL database (NeonDB). This document details how the implemented sync system works, its components, and data flow patterns.

## 🏗️ Architecture Components

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SyncEngine    │────│   SyncQueue      │────│ ConflictResolver│
│   (Orchestrator)│    │   (Operations)   │    │  (Resolution)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
              ┌──────────────────────────────────┐
              │     ConnectivityHandler          │
              │     (Network Monitoring)         │
              └──────────────────────────────────┘
```

## 🔧 Component Details

### 1. SyncEngine (Core Orchestrator)

**Location**: `src/lib/sync/sync-engine.ts`

The main coordinator that handles all sync operations with a singleton pattern.

#### Key Features:

- **Event-driven sync triggers**
- **Three-tier priority system**
- **WAL checkpoint optimization**
- **Automatic retry mechanisms**

#### Sync Triggers:

```typescript
type SyncTrigger =
  | "startup" // App launch
  | "quiz_submission" // Critical - quiz completed
  | "answer_save" // Important - answer saved
  | "network_reconnection" // Network back online
  | "periodic" // Background sync
  | "manual" // User-triggered
  | "app_close"; // App shutdown
```

#### Priority Tiers:

```typescript
type SyncTier =
  | "critical" // Quiz submissions (10 retries, 1-16s intervals)
  | "important" // Answer saves (5 retries, 5-135s intervals)
  | "administrative"; // System data (3 retries, 1-15min intervals)
```

### 2. SyncQueue (Operation Management)

**Location**: `src/lib/sync/sync-queue.ts`

Manages a persistent queue of sync operations with tier-based processing.

#### Features:

- **Persistent storage** in SQLite (`sync_queue` table)
- **Tier-based processing** (critical → important → administrative)
- **Exponential backoff** retry mechanism
- **Batch processing** with configurable sizes

#### Queue Operation Lifecycle:

```
Add Operation → Persist to DB → Process by Tier → Retry on Failure → Remove on Success
```

#### Batch Sizes by Tier:

- **Critical**: 10 operations (fast processing)
- **Important**: 25 operations (balanced)
- **Administrative**: 50 operations (efficient bulk)

### 3. ConflictResolver (Data Conflict Handling)

**Location**: `src/lib/sync/conflict-resolver.ts`

Handles conflicts when local and remote data differ.

#### Resolution Strategies:

```typescript
type ConflictResolutionRule =
  | "local_wins" // User data precedence
  | "remote_wins" // Admin data precedence
  | "timestamp_wins" // Latest modification wins
  | "merge_data"; // Intelligent merging
```

#### Conflict Resolution Rules:

- **Quiz Attempts**: `local_wins` (protects user work)
- **Users**: `remote_wins` (admin controlled)
- **Subjects**: `remote_wins` (admin controlled)
- **Questions**: `remote_wins` (admin controlled)

### 4. ConnectivityHandler (Network Monitoring)

**Location**: `src/lib/sync/connectivity-handler.ts`

Monitors network connectivity and triggers appropriate sync actions.

#### Features:

- **Multi-endpoint testing** for reliability
- **Network quality assessment**
- **Browser API integration** (`navigator.onLine`, Connection API)
- **Event-driven notifications**

## 📊 Database Schema

### Sync Support Tables

#### `sync_log` Table:

```sql
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,    -- 'push', 'pull', 'conflict_resolution'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  status TEXT NOT NULL,            -- 'success', 'failed', 'pending'
  error_message TEXT,
  attempted_at TEXT NOT NULL,
  completed_at TEXT
);
```

#### `sync_timestamps` Table:

```sql
CREATE TABLE sync_timestamps (
  table_name TEXT PRIMARY KEY,
  last_pull_sync TEXT,
  last_push_sync TEXT,
  last_full_sync TEXT
);
```

#### `sync_queue` Table:

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,              -- 'push', 'pull', 'conflict_resolution'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT NOT NULL,              -- JSON stringified operation data
  tier TEXT NOT NULL,              -- 'critical', 'important', 'administrative'
  retry_count INTEGER DEFAULT 0,
  next_retry_at TEXT,
  last_error TEXT,
  timestamp TEXT NOT NULL
);
```

## 🔄 Sync Flow Patterns

### 1. Startup Sync Flow

```
App Launch → Initialize SyncEngine → Check Connectivity → Startup Sync
    ↓
Push Pending Critical Data → Pull Fresh Administrative Data → Complete
```

**Implementation**:

1. Push any unsynced quiz submissions (critical)
2. Pull users, subjects, questions if local DB is empty
3. Update sync timestamps

### 2. Quiz Submission Flow

```
User Submits Quiz → Save Locally → Trigger Critical Sync → WAL Checkpoint
    ↓
Queue Operation → Process Immediately → Retry on Failure → Mark Synced
```

**Implementation**:

1. Force WAL checkpoint to ensure data persistence
2. Push quiz attempt to remote with highest priority
3. Mark local record as synced on success
4. Log sync operation for audit trail

### 3. Answer Save Flow

```
User Saves Answer → Save Locally → Queue Important Sync → Background Process
    ↓
Batch with Other Answers → Process in Background → Retry with Delays
```

**Implementation**:

1. Save answer to local SQLite immediately
2. Queue sync operation with "important" tier
3. Process in batches during periodic sync
4. Use moderate retry intervals (5-135 seconds)

### 4. Network Reconnection Flow

```
Network Lost → Switch to Offline Mode → Network Restored → Reconnection Sync
    ↓
Process All Queued Operations → Push Local Changes → Resume Periodic Sync
```

**Implementation**:

1. ConnectivityHandler detects network change
2. Process entire sync queue by priority
3. Push any remaining local changes
4. Resume normal periodic sync operations

## ⚔️ Conflict Resolution Examples

### Scenario 1: Quiz Attempt Conflict

**Situation**: Student submits quiz while same quiz exists remotely

**Resolution**:

```typescript
if (localRecord.submitted && !remoteRecord.submitted) {
  return null; // No conflict - local submitted takes precedence
}

if (localRecord.submitted && remoteRecord.submitted) {
  // Compare timestamps - resolve by submission time
  return timestampConflict;
}

if (!localRecord.submitted && !remoteRecord.submitted) {
  // Merge answers with local precedence
  const mergedAnswers = { ...remoteAnswers, ...localAnswers };
  return mergeStrategy;
}
```

### Scenario 2: Administrative Data Conflict

**Situation**: Question modified both locally and remotely

**Resolution**:

```typescript
// Remote always wins for admin data
if (tableName === "questions") {
  await updateLocalQuestion(recordId, remoteRecord);
  return { success: true, resolution: "remote_wins" };
}
```

## 🚀 Performance Optimizations

### 1. SQLite WAL Mode Integration

```typescript
// Force WAL checkpoint during critical operations
public async forceWALCheckpoint(): Promise<void> {
  await this.localDb.executeRawSQL("PRAGMA wal_checkpoint(TRUNCATE)");
}
```

**Benefits**:

- Concurrent read access during sync
- Non-blocking user operations
- Atomic sync transactions

### 2. Intelligent Batching

```typescript
// Tier-specific batch sizes
const batchSizes = {
  critical: 10, // Fast processing for urgent data
  important: 25, // Balanced throughput
  administrative: 50, // Efficient bulk operations
};
```

### 3. Exponential Backoff

```typescript
const retryIntervals = {
  critical: [1000, 2000, 4000, 8000, 16000], // Aggressive
  important: [5000, 15000, 45000, 135000], // Moderate
  administrative: [60000, 300000, 900000], // Conservative
};
```

## 🔐 Type Safety Implementation

### Generic Sync Operations

```typescript
interface SyncOperation<T = Record<string, unknown>> {
  id: string;
  type: "push" | "pull" | "conflict_resolution";
  tableName: string;
  recordId: string;
  data: T;
  timestamp: string;
}

// Usage with specific types
await syncEngine.queueOperation<QuizAttempt>({
  type: "push",
  tableName: "quiz_attempts",
  recordId: attempt.id,
  data: attempt,
});
```

### Conflict Resolution with Generics

```typescript
async detectConflicts<T extends Record<string, unknown>>(
  tableName: string,
  localRecord: T | null,
  remoteRecord: T | null
): Promise<SyncConflict<T> | null>
```

## 🎯 Real-World Usage Examples

### Example 1: Student Takes Quiz Offline

```
1. Student opens app (no internet) → Loads cached questions
2. Student answers questions → Saves to local SQLite
3. Student submits quiz → Marks as submitted locally
4. Network reconnects → Critical sync triggers
5. Quiz attempt pushed to remote → Marked as synced
```

### Example 2: Teacher Updates Questions

```
1. Teacher updates questions in admin panel → Remote database updated
2. Student app performs periodic sync → Detects new questions
3. New questions pulled to local database → Students see updates
4. No conflicts (admin data wins) → Sync completes successfully
```

### Example 3: Network Interruption During Sync

```
1. Student submits quiz → Critical sync starts
2. Network fails mid-sync → Operation queued with retry
3. Exponential backoff begins → 1s, 2s, 4s, 8s intervals
4. Network restored → Queued operation processed
5. Quiz attempt successfully synced → Operation removed from queue
```

## 📱 Integration with Electron

### IPC Layer

```typescript
// Electron Main Process
ipcMain.handle("sync:trigger", async (_, trigger: SyncTrigger) => {
  return await this.dbService.triggerSync(trigger);
});

ipcMain.handle("sync:get-status", async () => {
  return await this.dbService.getSyncStatus();
});

// Renderer Process
const syncResult = await window.electronAPI.sync.trigger("manual");
const syncStatus = await window.electronAPI.sync.getStatus();
```

### App Lifecycle Integration

```typescript
// App startup
await this.syncEngine.initialize(remoteDb);

// App shutdown
app.on("before-quit", async () => {
  await this.syncEngine.triggerSync("app_close");
  await this.syncEngine.cleanup();
});
```

## 🛠️ Monitoring & Debugging

### Sync Status Information

```typescript
interface SyncStatus {
  lastSyncTimestamp: string | null;
  isOnline: boolean;
  localChanges: number;
  remoteChanges: number;
  syncInProgress: boolean;
}
```

### Logging System

```typescript
// All sync operations are logged to sync_log table
await this.logSyncOperation(
  "push", // operation type
  "quiz_attempts", // table name
  attemptId, // record ID
  "success", // status
  error // optional error
);
```

## 🔧 Configuration

### Sync Intervals

```typescript
syncIntervals: {
  periodic: 30000,    // 30 seconds when active
  background: 300000  // 5 minutes when in background
}
```

### Retry Policies

```typescript
maxRetryAttempts: {
  critical: 10,       // Essential data
  important: 5,       // User data
  administrative: 3   // System data
}
```

## 🚀 Benefits of This Implementation

1. **Offline-First**: App works completely offline
2. **Data Integrity**: No data loss, conflict resolution protects user work
3. **Performance**: Non-blocking operations, optimized batching
4. **Reliability**: Exponential backoff, persistent queues
5. **Type Safety**: Full TypeScript support with generics
6. **Monitoring**: Comprehensive logging and status tracking
7. **Scalability**: Tier-based priority system handles load efficiently

## 🔍 Troubleshooting

### Common Issues

1. **Sync Stuck**: Check `sync_queue` table for failed operations
2. **Conflicts**: Review `sync_log` for conflict resolution details
3. **Performance**: Monitor WAL file size and checkpoint frequency
4. **Network**: Check connectivity handler status and quality metrics

### Debug Commands

```sql
-- Check pending sync operations
SELECT * FROM sync_queue ORDER BY timestamp;

-- Review sync history
SELECT * FROM sync_log ORDER BY attempted_at DESC LIMIT 100;

-- Check sync timestamps
SELECT * FROM sync_timestamps;
```

This sync system provides a robust, efficient, and user-friendly solution for maintaining data consistency across local and remote databases in an offline-first application architecture.
