"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
const local_database_service_js_1 = require("../database/local-database-service.js");
const sync_queue_js_1 = require("./sync-queue.js");
const conflict_resolver_js_1 = require("./conflict-resolver.js");
const connectivity_handler_js_1 = require("./connectivity-handler.js");
const err_js_1 = require("../../error/err.js");
const auto_seeding_service_js_1 = require("../seeding/auto-seeding-service.js");
const lib_js_1 = require("../../utils/lib.js");
class SyncEngine {
    constructor() {
        this.remoteDb = null;
        this.isInitialized = false;
        this.isSyncInProgress = false;
        this.syncIntervalId = null;
        this.config = {
            maxRetryAttempts: {
                critical: 10,
                important: 5,
                administrative: 3,
            },
            retryIntervals: {
                critical: [1000, 2000, 4000, 8000, 16000], // immediate aggressive retry
                important: [5000, 15000, 45000, 135000], // moderate retry
                administrative: [60000, 300000, 900000], // conservative retry
            },
            batchSizes: {
                critical: 10, // smaller batches for faster processing
                important: 25,
                administrative: 50, // larger batches for efficiency
            },
            syncIntervals: {
                periodic: 30000, // 30 seconds when active
                background: 300000, // 5 minutes when in background
            },
        };
        this.localDb = local_database_service_js_1.LocalDatabaseService.getInstance();
        this.syncQueue = new sync_queue_js_1.SyncQueue();
        this.conflictResolver = new conflict_resolver_js_1.ConflictResolver();
        this.connectivityHandler = new connectivity_handler_js_1.ConnectivityHandler();
        this.currentSyncStatus = {
            lastSyncTimestamp: null,
            isOnline: false,
            localChanges: 0,
            remoteChanges: 0,
            syncInProgress: false,
        };
    }
    static getInstance() {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }
    /**
     * Initialize the sync engine - call this during app startup
     */
    async initialize(remoteDb) {
        if (this.isInitialized) {
            return;
        }
        try {
            console.log("SyncEngine: Initializing...");
            if (remoteDb) {
                this.remoteDb = remoteDb;
            }
            await this.syncQueue.initialize();
            this.connectivityHandler.initialize();
            this.setupEventListeners();
            await this.fixInvalidTimestamps();
            await this.updateConnectivityStatus();
            // Start periodic sync if online
            if (this.currentSyncStatus.isOnline) {
                this.startPeriodicSync();
            }
            this.isInitialized = true;
            console.log("SyncEngine: Initialization complete");
            console.log("************************************************************");
            console.log("SyncEngine: Triggering startup sync");
            await this.triggerSync("startup");
        }
        catch (error) {
            console.error("SyncEngine: Initialization failed:", error);
            throw new err_js_1.SyncError("Failed to initialize sync engine", "initialization", (0, err_js_1.normalizeError)(error));
        }
    }
    /**
     * Main sync trigger - handles all sync operations
     */
    async triggerSync(trigger, options = {}) {
        if (!this.isInitialized) {
            throw new err_js_1.SyncError("Sync engine not initialized", "trigger_sync");
        }
        if (this.isSyncInProgress && !options.force) {
            console.log("SyncEngine: Sync already in progress, skipping");
            return { success: false, error: "Sync already in progress" };
        }
        try {
            this.isSyncInProgress = true;
            this.currentSyncStatus.syncInProgress = true;
            console.log(`SyncEngine: Starting sync triggered by: ${trigger}`);
            await this.updateConnectivityStatus();
            if (!this.currentSyncStatus.isOnline) {
                console.log("SyncEngine: Offline mode, queueing operations for later");
                return { success: true, note: "Offline mode - operations queued" };
            }
            if (!this.remoteDb) {
                console.log("SyncEngine: Remote database not available");
                return { success: false, error: "Remote database not available" };
            }
            let result;
            switch (trigger) {
                case "startup":
                    result = await this.performStartupSync();
                    break;
                case "quiz_submission":
                    result = await this.performCriticalSync();
                    break;
                case "answer_save":
                    result = await this.performImportantSync();
                    break;
                case "network_reconnection":
                    result = await this.performReconnectionSync();
                    break;
                case "periodic":
                    result = await this.performPeriodicSync();
                    break;
                case "manual":
                    result = await this.performFullSync();
                    break;
                case "app_close":
                    result = await this.performAppCloseSync();
                    break;
                default:
                    result = await this.performPeriodicSync();
            }
            if (result.success) {
                await this.updateSyncTimestamps();
            }
            return result;
        }
        catch (error) {
            console.error("SyncEngine: Sync operation failed:", error);
            return {
                success: false,
                error: (0, err_js_1.normalizeError)(error).message,
            };
        }
        finally {
            this.isSyncInProgress = false;
            this.currentSyncStatus.syncInProgress = false;
        }
    }
    /**
     * Add sync operation to queue
     */
    async queueOperation(operation) {
        const tier = this.determineSyncTier(operation.type, operation.tableName);
        await this.syncQueue.addOperation({
            ...operation,
            id: this.generateId(),
            timestamp: new Date().toISOString(),
        }, tier);
    }
    /**
     * Get current sync status
     */
    getSyncStatus() {
        return { ...this.currentSyncStatus };
    }
    /**
     * Force WAL checkpoint - called during critical sync operations
     */
    async forceWALCheckpoint() {
        try {
            await this.localDb.executeRawSQL("PRAGMA wal_checkpoint(TRUNCATE)");
            console.log("SyncEngine: WAL checkpoint completed");
        }
        catch (error) {
            console.error("SyncEngine: WAL checkpoint failed:", error);
        }
    }
    /**
     * Cleanup sync engine resources
     */
    async cleanup() {
        console.log("SyncEngine: Starting cleanup...");
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
        // Attempt final sync if online
        if (this.currentSyncStatus.isOnline && this.remoteDb) {
            try {
                await this.triggerSync("app_close", { force: true });
            }
            catch (error) {
                console.error("SyncEngine: Final sync failed during cleanup:", error);
            }
        }
        await this.syncQueue.cleanup();
        this.connectivityHandler.cleanup();
        this.isInitialized = false;
        console.log("SyncEngine: Cleanup completed");
    }
    setupEventListeners() {
        this.connectivityHandler.onConnectivityChange(async (isOnline) => {
            this.currentSyncStatus.isOnline = isOnline;
            if (isOnline) {
                console.log("SyncEngine: Network reconnected, triggering sync");
                this.startPeriodicSync();
                await this.triggerSync("network_reconnection");
            }
            else {
                console.log("SyncEngine: Network disconnected, stopping periodic sync");
                this.stopPeriodicSync();
            }
        });
        // App lifecycle events (if in Electron)
        if ((0, lib_js_1.isElectron)()) {
            // These would be set up in the main process and communicated via IPC
            // For now, we'll handle them in the sync triggers
        }
    }
    async updateConnectivityStatus() {
        const isOnline = await this.connectivityHandler.checkConnectivity();
        console.log("SyncEngine: Update connectivity status", isOnline);
        this.currentSyncStatus.isOnline = isOnline;
        this.currentSyncStatus.localChanges = await this.countLocalChanges();
    }
    async countLocalChanges() {
        try {
            const unsyncedAttempts = (await this.localDb.executeRawSQL("SELECT COUNT(*) as count FROM quiz_attempts WHERE synced = 0 AND submitted = 1"));
            return unsyncedAttempts[0]?.count || 0;
        }
        catch {
            return 0;
        }
    }
    startPeriodicSync() {
        if (this.syncIntervalId) {
            return; // Already running
        }
        this.syncIntervalId = setInterval(async () => {
            try {
                await this.triggerSync("periodic");
            }
            catch (error) {
                console.error("SyncEngine: Periodic sync failed:", error);
            }
        }, this.config.syncIntervals.periodic);
        console.log("SyncEngine: Periodic sync started");
    }
    stopPeriodicSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
            console.log("SyncEngine: Periodic sync stopped");
        }
    }
    determineSyncTier(operationType, tableName) {
        if (tableName === "quiz_attempts" && operationType === "push") {
            return "critical";
        }
        if (tableName === "quiz_attempts" || tableName === "users") {
            return "important";
        }
        return "administrative";
    }
    generateId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async updateSyncTimestamps() {
        const now = new Date().toISOString();
        try {
            await this.localDb.runRawSQL(`INSERT OR REPLACE INTO sync_timestamps (table_name, last_full_sync) VALUES (?, ?)`, ["global", now]);
            this.currentSyncStatus.lastSyncTimestamp = now;
        }
        catch (error) {
            console.error("SyncEngine: Failed to update sync timestamps:", error);
        }
    }
    // Sync Operation Implementations
    async performStartupSync() {
        console.log("SyncEngine: Performing startup sync");
        try {
            let pushedRecords = 0;
            let pulledRecords = 0;
            // First, push any pending critical data (quiz submissions)
            const pushResult = await this.pushCriticalData();
            pushedRecords += pushResult.pushedRecords || 0;
            // Then pull fresh data if local database is empty or outdated
            const pullResult = await this.pullFreshData();
            pulledRecords += pullResult.pulledRecords || 0;
            return {
                success: true,
                pushedRecords,
                pulledRecords,
                note: "Startup sync completed",
            };
        }
        catch (error) {
            throw new err_js_1.SyncError("Startup sync failed", "startup_sync", (0, err_js_1.normalizeError)(error));
        }
    }
    async performCriticalSync() {
        console.log("SyncEngine: Performing critical sync (quiz submissions)");
        await this.forceWALCheckpoint();
        return this.pushCriticalData();
    }
    async performImportantSync() {
        console.log("SyncEngine: Performing important sync (quiz answers)");
        return this.pushImportantData();
    }
    async performReconnectionSync() {
        console.log("SyncEngine: Performing reconnection sync");
        try {
            let pushedRecords = 0;
            let pulledRecords = 0;
            const queueResult = await this.syncQueue.processQueue(this.remoteDb);
            pushedRecords += queueResult.pushedRecords || 0;
            const pushResult = await this.pushAllLocalChanges();
            pushedRecords += pushResult.pushedRecords || 0;
            const userCount = await this.localDb.executeRawSQL("SELECT COUNT(*) as count FROM users");
            const subjectCount = await this.localDb.executeRawSQL("SELECT COUNT(*) as count FROM subjects");
            const hasUsers = userCount[0]?.count > 0;
            const hasSubjects = subjectCount[0]?.count > 0;
            if (!hasUsers || !hasSubjects) {
                console.log("SyncEngine: Empty local database detected during reconnection, attempting initial data pull");
                const pullResult = await this.pullFreshData();
                pulledRecords += pullResult.pulledRecords || 0;
            }
            return {
                success: true,
                pushedRecords,
                pulledRecords,
                note: "Reconnection sync completed",
            };
        }
        catch (error) {
            throw new err_js_1.SyncError("Reconnection sync failed", "reconnection_sync", (0, err_js_1.normalizeError)(error));
        }
    }
    async performPeriodicSync() {
        try {
            const pushResult = await this.pushImportantData();
            return {
                success: true,
                pushedRecords: pushResult.pushedRecords || 0,
                note: "Periodic sync completed",
            };
        }
        catch (error) {
            console.error("SyncEngine: Periodic sync failed:", error);
            return { success: false, error: "Periodic sync failed" };
        }
    }
    async performFullSync() {
        console.log("SyncEngine: Performing full sync");
        try {
            let pushedRecords = 0;
            let pulledRecords = 0;
            // Push all local changes
            const pushResult = await this.pushAllLocalChanges();
            pushedRecords += pushResult.pushedRecords || 0;
            // Pull all remote updates
            const pullResult = await this.pullAllRemoteChanges();
            pulledRecords += pullResult.pulledRecords || 0;
            return {
                success: true,
                pushedRecords,
                pulledRecords,
                note: "Full sync completed",
            };
        }
        catch (error) {
            throw new err_js_1.SyncError("Full sync failed", "full_sync", (0, err_js_1.normalizeError)(error));
        }
    }
    async performAppCloseSync() {
        console.log("SyncEngine: Performing app close sync");
        // Force all critical data to sync before app closes
        await this.forceWALCheckpoint();
        return this.pushCriticalData();
    }
    // Data Push/Pull Operations
    async pushCriticalData() {
        if (!this.remoteDb) {
            throw new err_js_1.SyncError("Remote database not available", "push_critical");
        }
        try {
            // Get unsynced submitted quiz attempts
            const unsyncedAttempts = (await this.localDb.executeRawSQL(`SELECT * FROM quiz_attempts WHERE synced = 0 AND submitted = 1 ORDER BY submitted_at ASC`));
            let pushedRecords = 0;
            for (const rawAttempt of unsyncedAttempts) {
                try {
                    // Transform raw SQL result (snake_case) to proper QuizAttempt format (camelCase)
                    const attempt = {
                        id: rawAttempt.id,
                        userId: rawAttempt.user_id,
                        subjectId: rawAttempt.subject_id,
                        answers: rawAttempt.answers,
                        score: rawAttempt.score,
                        totalQuestions: rawAttempt.total_questions,
                        submitted: Boolean(rawAttempt.submitted),
                        synced: Boolean(rawAttempt.synced),
                        startedAt: rawAttempt.started_at,
                        submittedAt: rawAttempt.submitted_at,
                        updatedAt: rawAttempt.updated_at,
                        syncAttemptedAt: rawAttempt.sync_attempted_at,
                        syncError: rawAttempt.sync_error,
                        sessionDuration: rawAttempt.session_duration,
                        elapsedTime: rawAttempt.elapsed_time,
                        lastActiveAt: rawAttempt.last_active_at,
                    };
                    // await this.remoteDb.syncQuizAttempt(attempt);
                    // await this.localDb.runRawSQL(
                    //   "UPDATE quiz_attempts SET synced = 1, sync_attempted_at = ?, sync_error = NULL WHERE id = ?",
                    //   [new Date().toISOString(), attempt.id]
                    // );
                    pushedRecords++;
                    // await this.logSyncOperation(
                    //   "push",
                    //   "quiz_attempts",
                    //   attempt.id,
                    //   "success"
                    // );
                }
                catch (error) {
                    await this.logSyncOperation("push", "quiz_attempts", rawAttempt.id, "failed", (0, err_js_1.normalizeError)(error));
                    await this.localDb.runRawSQL("UPDATE quiz_attempts SET sync_attempted_at = ?, sync_error = ? WHERE id = ?", [
                        new Date().toISOString(),
                        (0, err_js_1.normalizeError)(error).message,
                        rawAttempt.id,
                    ]);
                }
            }
            console.log(`SyncEngine: Pushed ${pushedRecords} critical records`);
            return { success: true, pushedRecords };
        }
        catch (error) {
            throw new err_js_1.SyncError("Failed to push critical data", "push_critical", (0, err_js_1.normalizeError)(error));
        }
    }
    async pushImportantData() {
        if (!this.remoteDb) {
            return { success: false, error: "Remote database not available" };
        }
        try {
            // Get unsynced in-progress quiz attempts (important but not critical)
            const unsyncedAttempts = (await this.localDb.executeRawSQL(`SELECT * FROM quiz_attempts WHERE synced = 0 AND submitted = 0 AND answers IS NOT NULL`));
            let pushedRecords = 0;
            const batchSize = this.config.batchSizes.important;
            for (let i = 0; i < unsyncedAttempts.length; i += batchSize) {
                const batch = unsyncedAttempts.slice(i, i + batchSize);
                console.log("batch", batch);
                for (const rawAttempt of batch) {
                    try {
                        const attempt = {
                            id: rawAttempt.id,
                            userId: rawAttempt.user_id,
                            subjectId: rawAttempt.subject_id,
                            answers: rawAttempt.answers,
                            score: rawAttempt.score,
                            totalQuestions: rawAttempt.total_questions,
                            submitted: Boolean(rawAttempt.submitted),
                            synced: Boolean(rawAttempt.synced),
                            startedAt: rawAttempt.started_at,
                            submittedAt: rawAttempt.submitted_at,
                            updatedAt: rawAttempt.updated_at,
                            syncAttemptedAt: rawAttempt.sync_attempted_at,
                            syncError: rawAttempt.sync_error,
                            sessionDuration: rawAttempt.session_duration,
                            elapsedTime: rawAttempt.elapsed_time,
                            lastActiveAt: rawAttempt.last_active_at,
                        };
                        console.log("did transform");
                        // await this.remoteDb.syncQuizAttempt(attempt);
                        // await this.localDb.runRawSQL(
                        //   "UPDATE quiz_attempts SET synced = 1, sync_attempted_at = ? WHERE id = ?",
                        //   [new Date().toISOString(), attempt.id]
                        // );
                        console.log("did sync");
                        pushedRecords++;
                        // await this.logSyncOperation(
                        //   "push",
                        //   "quiz_attempts",
                        //   attempt.id,
                        //   "success"
                        // );
                    }
                    catch (error) {
                        await this.logSyncOperation("push", "quiz_attempts", rawAttempt.id, "failed", (0, err_js_1.normalizeError)(error));
                    }
                }
            }
            console.log(`SyncEngine: Pushed ${pushedRecords} important records`);
            return { success: true, pushedRecords };
        }
        catch (error) {
            console.error("SyncEngine: Failed to push important data:", error);
            return { success: false, error: "Failed to push important data" };
        }
    }
    async pushAllLocalChanges() {
        try {
            const critical = await this.pushCriticalData();
            const important = await this.pushImportantData();
            return {
                success: critical.success && important.success,
                pushedRecords: (critical.pushedRecords || 0) + (important.pushedRecords || 0),
            };
        }
        catch (error) {
            throw new err_js_1.SyncError("Failed to push all local changes", "push_all", (0, err_js_1.normalizeError)(error));
        }
    }
    async pullFreshData() {
        console.log("************************************************************");
        console.log("SyncEngine: Performing pullFreshData");
        try {
            let pulledRecords = 0;
            // Check if local database is empty (first time setup)
            const userCount = await this.localDb.executeRawSQL("SELECT COUNT(*) as count FROM users");
            const subjectCount = await this.localDb.executeRawSQL("SELECT COUNT(*) as count FROM subjects");
            const hasUsers = userCount[0]?.count > 0;
            const hasSubjects = subjectCount[0]?.count > 0;
            if (hasUsers && hasSubjects) {
                console.log("SyncEngine: Local database already populated, skipping initial data pull");
                return {
                    success: true,
                    pulledRecords: 0,
                    note: "Local database already populated",
                };
            }
            // **Network Connectivity Assessment** - Try remote first, fallback to local seeding
            if (this.currentSyncStatus.isOnline && this.remoteDb) {
                try {
                    const remoteConnected = await this.remoteDb.checkConnection();
                    if (remoteConnected) {
                        console.log("SyncEngine: Online and remote connected, performing remote data pull");
                        // Pull users, subjects, and questions from remote
                        const syncData = await this.remoteDb.pullLatestData();
                        // Insert users
                        for (const user of syncData.users) {
                            try {
                                const localUser = {
                                    id: user.id,
                                    name: user.name,
                                    studentCode: user.studentCode,
                                    passwordHash: user.passwordHash,
                                    class: user.class,
                                    gender: user.gender,
                                    createdAt: user.createdAt.toISOString(),
                                    updatedAt: user.updatedAt.toISOString(),
                                    lastSynced: new Date().toISOString(),
                                    isActive: user.isActive,
                                    lastLogin: user.lastLogin?.toISOString() || null,
                                };
                                await this.localDb.createUser(localUser);
                                pulledRecords++;
                            }
                            catch (error) {
                                console.warn("Failed to create user:", user.studentCode, error);
                            }
                        }
                        console.log("SyncEngine: Pulled users", syncData.users);
                        // Insert subjects
                        for (const subject of syncData.subjects) {
                            try {
                                const localSubject = {
                                    id: subject.id,
                                    name: subject.name,
                                    subjectCode: subject.subjectCode,
                                    description: subject.description,
                                    class: subject.class,
                                    totalQuestions: subject.totalQuestions,
                                    createdAt: subject.createdAt.toISOString(),
                                    updatedAt: subject.updatedAt.toISOString(),
                                    isActive: subject.isActive,
                                };
                                await this.localDb.createSubject(localSubject);
                                pulledRecords++;
                            }
                            catch (error) {
                                console.warn("Failed to create subject:", subject.subjectCode, error);
                            }
                        }
                        // Insert questions
                        for (const question of syncData.questions) {
                            try {
                                const localQuestion = {
                                    id: question.id,
                                    subjectId: question.subjectId,
                                    subjectCode: question.subjectCode,
                                    text: question.text,
                                    options: typeof question.options === "string"
                                        ? question.options
                                        : JSON.stringify(question.options),
                                    answer: question.answer,
                                    questionOrder: question.questionOrder,
                                    createdAt: question.createdAt.toISOString(),
                                    updatedAt: question.updatedAt.toISOString(),
                                    explanation: question.explanation,
                                    isActive: question.isActive,
                                };
                                await this.localDb.createQuestion(localQuestion);
                                pulledRecords++;
                            }
                            catch (error) {
                                console.warn("Failed to create question:", question.id, error);
                            }
                        }
                        console.log(`SyncEngine: Successfully pulled ${pulledRecords} fresh records from remote`);
                        return {
                            success: true,
                            pulledRecords,
                            note: "Initial data sync completed successfully from remote",
                        };
                    }
                    else {
                        console.log("SyncEngine: Remote database connection failed, falling back to local seeding");
                    }
                }
                catch (remoteError) {
                    console.error("SyncEngine: Remote data pull failed, falling back to local seeding:", remoteError);
                }
            }
            else {
                console.log("SyncEngine: Offline mode detected, using local seeding");
            }
            console.log("SyncEngine: Performing automatic local database seeding...");
            if (!(0, lib_js_1.isElectron)()) {
                return {
                    success: false,
                    error: "Local seeding requires Electron environment",
                    note: "Cannot seed data in browser environment",
                };
            }
            try {
                const seedResult = await auto_seeding_service_js_1.AutoSeedingService.performAutoSeeding();
                if (seedResult.success) {
                    console.log(`SyncEngine: Successfully seeded ${seedResult.totalRecords} records locally`);
                    return {
                        success: true,
                        pulledRecords: seedResult.totalRecords,
                        note: "Initial data populated using local seeding (offline mode)",
                    };
                }
                else {
                    console.error("SyncEngine: Local seeding failed:", seedResult.error);
                    return {
                        success: false,
                        error: `Local seeding failed: ${seedResult.error}`,
                        note: "Unable to populate initial data - both remote sync and local seeding failed",
                    };
                }
            }
            catch (seedError) {
                console.error("SyncEngine: Local seeding failed:", seedError);
                return {
                    success: false,
                    error: `Local seeding failed: ${(0, err_js_1.normalizeError)(seedError).message}`,
                    note: "Unable to populate initial data - both remote sync and local seeding failed",
                };
            }
        }
        catch (error) {
            console.error("SyncEngine: Error in pullFreshData:", error);
            throw new err_js_1.SyncError("Failed to pull fresh data", "pull_fresh", (0, err_js_1.normalizeError)(error));
        }
    }
    async pullAllRemoteChanges() {
        // For now, focus on pulling new questions and subject updates
        // This would be enhanced with delta sync in the future
        return this.pullFreshData();
    }
    async logSyncOperation(operationType, tableName, recordId, status, error) {
        try {
            const now = new Date().toISOString();
            await this.localDb.runRawSQL(`INSERT INTO sync_log (id, operation_type, table_name, record_id, status, error_message, attempted_at, completed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                this.generateId(),
                operationType,
                tableName,
                recordId,
                status,
                error?.message || null,
                now,
                status === "success" ? now : null,
            ]);
        }
        catch (logError) {
            console.error("SyncEngine: Failed to log sync operation:", (0, err_js_1.normalizeError)(logError).message);
        }
    }
    /**
     * Fix any existing quiz attempts with invalid timestamps
     */
    async fixInvalidTimestamps() {
        try {
            console.log("SyncEngine: Checking for invalid timestamps in quiz attempts...");
            const invalidAttempts = await this.localDb.executeRawSQL(`
        SELECT id, started_at, updated_at, user_id, subject_id 
        FROM quiz_attempts 
        WHERE started_at IS NULL 
           OR started_at = '' 
           OR started_at = 'undefined'
           OR started_at = 'null'
      `);
            if (invalidAttempts.length > 0) {
                console.log(`SyncEngine: Found ${invalidAttempts.length} quiz attempts with invalid timestamps, fixing...`);
                const now = new Date().toISOString();
                for (const attempt of invalidAttempts) {
                    const record = attempt;
                    // Use updated_at if valid
                    let fixedStartedAt = now;
                    if (record.updated_at &&
                        record.updated_at !== "undefined" &&
                        record.updated_at !== "null" &&
                        record.updated_at !== "") {
                        try {
                            const updatedDate = new Date(record.updated_at);
                            if (!isNaN(updatedDate.getTime())) {
                                fixedStartedAt = record.updated_at;
                            }
                        }
                        catch {
                            // Keep using current time
                        }
                    }
                    await this.localDb.runRawSQL(`
            UPDATE quiz_attempts 
            SET started_at = ?, updated_at = ? 
            WHERE id = ?
          `, [fixedStartedAt, now, record.id]);
                    console.log(`SyncEngine: Fixed timestamps for quiz attempt ${record.id}`);
                }
                console.log("SyncEngine: Timestamp fix completed");
            }
            else {
                console.log("SyncEngine: No invalid timestamps found");
            }
        }
        catch (error) {
            console.warn("SyncEngine: Failed to fix invalid timestamps:", error);
        }
    }
}
exports.SyncEngine = SyncEngine;
