# Quiz Application - Comprehensive Project Architecture

## 🏗️ Project Overview

This project is a **hybrid quiz application** built for offline-first functionality with cloud synchronization capabilities. The application runs as a desktop app using Electron.js with Next.js frontend, featuring dual database architecture for maximum reliability and performance.

### Core Technologies Stack

- **Frontend**: Next.js 14+ (App Router) with TypeScript
- **Desktop Runtime**: Electron.js
- **Local Database**: SQLite via better-sqlite3
- **Remote Database**: PostgreSQL on NeonDB via Drizzle ORM
- **Authentication**: Custom student/subject code system
- **Data Import**: Excel files via xlsx/exceljs
- **Deployment**: Next.js Static Export (no API routes)

## 🎯 Architecture Principles

### 1. Offline-First Design

- Application must function completely offline
- Local SQLite serves as primary data source
- Remote sync is enhancement, not dependency
- Graceful degradation when network unavailable

### 2. Data Consistency Strategy

- Local SQLite as source of truth for user sessions
- Conflict resolution strategies for sync operations
- Immutable quiz attempts (no editing after submission)
- Audit trail for all data modifications

### 3. Performance Optimization

- Static export for fastest load times
- Indexed database queries for quick lookups
- Background sync operations
- Minimal memory footprint

## 🗄️ Database Architecture

### Dual Database Strategy

#### Local SQLite Database (Primary)

```sql
-- Users table with authentication data
users (
  id TEXT PRIMARY KEY,           -- UUID v4
  name TEXT NOT NULL,
  student_code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- 6-digit PIN hashed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced DATETIME,
  is_active BOOLEAN DEFAULT 1
);

-- Subjects/courses available for quizzes
subjects (
  id TEXT PRIMARY KEY,           -- UUID v4
  name TEXT NOT NULL,
  subject_code TEXT UNIQUE NOT NULL,
  description TEXT,
  total_questions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- Questions with multiple choice options
questions (
  id TEXT PRIMARY KEY,           -- UUID v4
  subject_id TEXT NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,         -- JSON array ["A", "B", "C", "D"]
  answer TEXT NOT NULL,          -- Correct option "A", "B", "C", or "D"
  difficulty_level INTEGER DEFAULT 1, -- 1-5 scale
  question_order INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Quiz attempts with comprehensive tracking
quiz_attempts (
  id TEXT PRIMARY KEY,           -- UUID v4
  user_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  answers TEXT,                  -- JSON map {question_id: selected_option}
  score INTEGER,                 -- Calculated score (nullable until submitted)
  total_questions INTEGER,       -- Total questions in this attempt
  submitted BOOLEAN DEFAULT 0,   -- Final submission status
  synced BOOLEAN DEFAULT 0,      -- Cloud sync status
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,         -- When quiz was submitted
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_attempted_at DATETIME,    -- Last sync attempt timestamp
  sync_error TEXT,               -- Error message if sync failed
  session_duration INTEGER,      -- Time spent in seconds
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Sync operations log for debugging and recovery
sync_log (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,  -- 'push', 'pull', 'conflict_resolution'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'success', 'failed', 'pending'
  error_message TEXT,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

#### Remote PostgreSQL Database (NeonDB)

```sql
-- Mirror structure with additional cloud-specific fields
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  student_code VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  school_id UUID,               -- Additional organizational field
  grade_level VARCHAR(10)       -- Additional student info
);

-- Enhanced subjects table with metadata
subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(100),        -- Subject categorization
  academic_year VARCHAR(20)     -- Academic year association
);

-- Questions with enhanced metadata
questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL,       -- Enhanced JSON support
  answer VARCHAR(1) NOT NULL,   -- A, B, C, or D
  difficulty_level INTEGER DEFAULT 1,
  question_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,              -- Admin who created question
  is_active BOOLEAN DEFAULT true,
  tags JSONB,                   -- Question tags for categorization
  explanation TEXT              -- Answer explanation
);

-- Quiz attempts with analytics
quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  answers JSONB,                -- Question-answer mapping
  score INTEGER,
  total_questions INTEGER,
  submitted BOOLEAN DEFAULT false,
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  session_duration INTEGER,     -- Duration in seconds
  ip_address INET,              -- For security tracking
  user_agent TEXT,              -- Device/browser info
  version VARCHAR(20)           -- App version used
);

-- Analytics and reporting tables
quiz_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  total_attempts INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  pass_rate DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Technical Implementation Details

### Electron.js Configuration

#### Main Process Setup

```typescript
// main.ts - Electron main process
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import Database from "better-sqlite3";

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private db: Database.Database | null = null;

  constructor() {
    this.initializeDatabase();
    this.setupIPC();
  }

  private initializeDatabase(): void {
    const dbPath = join(app.getPath("userData"), "quiz-app.db");
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("cache_size = 1000");

    this.initializeTables();
  }

  private setupIPC(): void {
    // Database operations exposed to renderer
    ipcMain.handle("db:execute", async (event, sql: string, params: any[]) => {
      try {
        return this.db?.prepare(sql).all(params);
      } catch (error) {
        console.error("Database error:", error);
        throw error;
      }
    });

    ipcMain.handle("db:run", async (event, sql: string, params: any[]) => {
      try {
        return this.db?.prepare(sql).run(params);
      } catch (error) {
        console.error("Database error:", error);
        throw error;
      }
    });
  }
}
```

#### Preload Script Security

```typescript
// preload.ts - Secure API exposure
import { contextBridge, ipcRenderer } from "electron";

interface DatabaseAPI {
  execute: (sql: string, params: any[]) => Promise<any[]>;
  run: (sql: string, params: any[]) => Promise<any>;
}

const databaseAPI: DatabaseAPI = {
  execute: (sql: string, params: any[] = []) =>
    ipcRenderer.invoke("db:execute", sql, params),
  run: (sql: string, params: any[] = []) =>
    ipcRenderer.invoke("db:run", sql, params),
};

contextBridge.exposeInMainWorld("electronAPI", {
  database: databaseAPI,
  // Other secure APIs
});
```

### Next.js Static Export Configuration

#### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable features not available in static export
  experimental: {
    appDir: true,
  },
  // Ensure no server-side features are used
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
```

### Data Access Layer (DAL)

#### Database Service Layer

```typescript
// lib/database/local-database.ts
export class LocalDatabaseService {
  private static instance: LocalDatabaseService;

  static getInstance(): LocalDatabaseService {
    if (!LocalDatabaseService.instance) {
      LocalDatabaseService.instance = new LocalDatabaseService();
    }
    return LocalDatabaseService.instance;
  }

  async executeQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (typeof window !== "undefined" && window.electronAPI) {
      return window.electronAPI.database.execute(sql, params);
    }
    throw new Error("Database not available in browser context");
  }

  async runQuery(sql: string, params: any[] = []): Promise<any> {
    if (typeof window !== "undefined" && window.electronAPI) {
      return window.electronAPI.database.run(sql, params);
    }
    throw new Error("Database not available in browser context");
  }

  // User operations
  async findUserByStudentCode(studentCode: string): Promise<User | null> {
    const users = await this.executeQuery<User>(
      "SELECT * FROM users WHERE student_code = ? AND is_active = 1",
      [studentCode]
    );
    return users[0] || null;
  }

  async createUser(userData: CreateUserData): Promise<string> {
    const id = generateUUID();
    await this.runQuery(
      "INSERT INTO users (id, name, student_code, password_hash) VALUES (?, ?, ?, ?)",
      [id, userData.name, userData.studentCode, userData.passwordHash]
    );
    return id;
  }

  // Quiz operations with error handling
  async createQuizAttempt(attempt: CreateQuizAttemptData): Promise<string> {
    const id = generateUUID();
    try {
      await this.runQuery(
        `INSERT INTO quiz_attempts 
         (id, user_id, subject_id, total_questions, started_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          attempt.userId,
          attempt.subjectId,
          attempt.totalQuestions,
          new Date().toISOString(),
        ]
      );
      return id;
    } catch (error) {
      console.error("Failed to create quiz attempt:", error);
      throw new Error("Failed to create quiz attempt");
    }
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> {
    // Get current answers
    const attempts = await this.executeQuery<QuizAttempt>(
      "SELECT answers FROM quiz_attempts WHERE id = ?",
      [attemptId]
    );

    if (attempts.length === 0) {
      throw new Error("Quiz attempt not found");
    }

    const currentAnswers = attempts[0].answers
      ? JSON.parse(attempts[0].answers)
      : {};
    currentAnswers[questionId] = answer;

    await this.runQuery(
      "UPDATE quiz_attempts SET answers = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify(currentAnswers), new Date().toISOString(), attemptId]
    );
  }
}
```

#### Remote Database Service

```typescript
// lib/database/remote-database.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export class RemoteDatabaseService {
  private db: ReturnType<typeof drizzle>;
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
    this.db = drizzle(this.sql);
  }

  async syncQuizAttempt(attempt: QuizAttempt): Promise<void> {
    try {
      // Use raw SQL for complex upsert operations
      await this.sql`
        INSERT INTO quiz_attempts (
          id, user_id, subject_id, answers, score, total_questions,
          submitted, started_at, submitted_at, session_duration
        ) VALUES (
          ${attempt.id}, ${attempt.userId}, ${attempt.subjectId},
          ${attempt.answers}, ${attempt.score}, ${attempt.totalQuestions},
          ${attempt.submitted}, ${attempt.startedAt}, ${attempt.submittedAt},
          ${attempt.sessionDuration}
        )
        ON CONFLICT (id) DO UPDATE SET
          answers = EXCLUDED.answers,
          score = EXCLUDED.score,
          submitted = EXCLUDED.submitted,
          submitted_at = EXCLUDED.submitted_at,
          session_duration = EXCLUDED.session_duration,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error("Failed to sync quiz attempt:", error);
      throw error;
    }
  }

  async pullLatestData(): Promise<SyncData> {
    // Implement pull logic for initial sync
    const [users, subjects, questions] = await Promise.all([
      this.sql`SELECT * FROM users WHERE is_active = true`,
      this.sql`SELECT * FROM subjects WHERE is_active = true`,
      this.sql`SELECT * FROM questions WHERE is_active = true`,
    ]);

    return { users, subjects, questions };
  }
}
```

## 🔐 Authentication System

### Student Authentication Flow

```typescript
// lib/auth/authentication.ts
export class AuthenticationService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  async authenticateStudent(
    studentCode: string,
    subjectCode: string,
    pin: string
  ): Promise<AuthResult> {
    try {
      // Validate student exists
      const user = await this.localDb.findUserByStudentCode(studentCode);
      if (!user) {
        return { success: false, error: "Student not found" };
      }

      // Verify PIN
      const isValidPin = await this.verifyPin(pin, user.passwordHash);
      if (!isValidPin) {
        return { success: false, error: "Invalid PIN" };
      }

      // Validate subject exists
      const subject = await this.localDb.findSubjectByCode(subjectCode);
      if (!subject) {
        return { success: false, error: "Subject not found" };
      }

      // Check for existing incomplete attempt
      const existingAttempt = await this.localDb.findIncompleteAttempt(
        user.id,
        subject.id
      );

      return {
        success: true,
        user,
        subject,
        existingAttempt,
        sessionToken: this.generateSessionToken(user.id, subject.id),
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  private async verifyPin(pin: string, hash: string): Promise<boolean> {
    // Implement secure PIN verification
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(pin, hash);
  }

  private generateSessionToken(userId: string, subjectId: string): string {
    // Generate secure session token
    return btoa(`${userId}:${subjectId}:${Date.now()}`);
  }
}
```

## 📊 Data Import & Seeding

### Excel Import System

```typescript
// scripts/excel-import.ts
import * as XLSX from "xlsx";
import { LocalDatabaseService } from "../lib/database/local-database";

interface ExcelQuestion {
  "Question Text": string;
  "Option A": string;
  "Option B": string;
  "Option C": string;
  "Option D": string;
  "Correct Answer": string;
  "Subject Code": string;
}

export class ExcelImportService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  async importQuestionsFromExcel(filePath: string): Promise<ImportResult> {
    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: ExcelQuestion[] = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const row of data) {
        results.processed++;

        try {
          await this.processQuestionRow(row);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }

  private async processQuestionRow(row: ExcelQuestion): Promise<void> {
    // Validate required fields
    this.validateQuestionRow(row);

    // Find or create subject
    let subject = await this.localDb.findSubjectByCode(row["Subject Code"]);
    if (!subject) {
      const subjectId = generateUUID();
      await this.localDb.createSubject({
        id: subjectId,
        name: row["Subject Code"], // Can be enhanced with lookup table
        subjectCode: row["Subject Code"],
      });
      subject = { id: subjectId, subjectCode: row["Subject Code"] };
    }

    // Create question
    const questionId = generateUUID();
    const options = [
      row["Option A"],
      row["Option B"],
      row["Option C"],
      row["Option D"],
    ];

    await this.localDb.createQuestion({
      id: questionId,
      subjectId: subject.id,
      text: row["Question Text"],
      options: JSON.stringify(options),
      answer: row["Correct Answer"].toUpperCase(),
    });
  }

  private validateQuestionRow(row: ExcelQuestion): void {
    const requiredFields = [
      "Question Text",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
      "Subject Code",
    ];

    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === "") {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate correct answer format
    const correctAnswer = row["Correct Answer"].toUpperCase();
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error("Correct Answer must be A, B, C, or D");
    }
  }
}
```

### User Seeding System

```typescript
// scripts/user-seeding.ts
export class UserSeedingService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  async seedUsersFromCSV(filePath: string): Promise<SeedResult> {
    // Implementation for CSV-based user seeding
    const fs = await import("fs").then((m) => m.promises);
    const csvData = await fs.readFile(filePath, "utf-8");

    const users = this.parseCSV(csvData);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await this.localDb.findUserByStudentCode(
          userData.studentCode
        );
        if (existing) {
          results.skipped++;
          continue;
        }

        // Hash the PIN
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(userData.pin, 10);

        // Create user
        await this.localDb.createUser({
          name: userData.name,
          studentCode: userData.studentCode,
          passwordHash,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create user ${userData.studentCode}: ${error.message}`
        );
      }
    }

    return results;
  }

  private parseCSV(csvData: string): UserSeedData[] {
    const lines = csvData.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return {
        name: values[headers.indexOf("name")],
        studentCode: values[headers.indexOf("student_code")],
        pin: values[headers.indexOf("pin")],
      };
    });
  }
}
```

## 🔄 Custom Sync Engine

### Phase 5: Custom Sync Engine Implementation

This is the most critical phase that enables the dual-database architecture to work seamlessly. The sync engine bridges the gap between local SQLite and remote PostgreSQL databases.

#### 5.1 Sync Architecture Foundation

- [ ] **Event-Driven Sync Service**: Create core sync service with event listeners

  - Network state detection (online/offline)
  - App lifecycle hooks (startup, close, background)
  - Manual sync triggers from UI
  - Periodic background sync intervals

- [ ] **Sync Operation Queue System**
  - FIFO queue for sync operations
  - Persistent queue storage in SQLite
  - Priority levels (high: quiz submissions, low: metadata)
  - Retry mechanism with exponential backoff

#### 5.2 Sync Triggers Implementation

- [ ] **App Startup Sync**:

  - Check for unsynced local changes on app launch
  - Pull latest questions/subjects from remote if empty local DB
  - Handle first-time app setup scenarios

- [ ] **Network Reconnection Sync**:

  - Detect when device comes back online
  - Immediately attempt to sync pending operations
  - Show sync status in UI during process

- [ ] **Periodic Background Sync**:

  - 30-second intervals when online and app active
  - Longer intervals (5 minutes) when app in background
  - Configurable sync frequency based on usage patterns

- [ ] **App Close Sync**:
  - Force sync all pending changes before app shutdown
  - Timeout mechanism if sync takes too long
  - Graceful degradation if sync fails on close

#### 5.3 Data Flow Implementation

- [ ] **Push Sync Strategy** (Local → Remote):

  - Identify unsynced quiz attempts (`synced = 0`)
  - Batch upload quiz submissions with conflict detection
  - Mark successfully synced records locally
  - Handle partial batch failures gracefully

- [ ] **Pull Sync Strategy** (Remote → Local):
  - Primarily for initial data seeding (questions, subjects, users)
  - Compare timestamps to avoid duplicate insertions
  - Incremental updates for modified questions/subjects
  - Handle large datasets with pagination

#### 5.4 Conflict Resolution Engine

- [ ] **Quiz Attempt Conflicts**:

  - **Rule**: Quiz attempts are immutable once submitted
  - **Priority**: Local submitted attempts always win over remote
  - **Merge Strategy**: For incomplete attempts, merge answers with local precedence
  - **Timestamp Resolution**: Use `submittedAt` as tie-breaker

- [ ] **User Data Conflicts**:

  - **Rule**: Remote admin data (users, subjects) takes precedence
  - **Local Wins**: Only for quiz attempts and user-generated content
  - **Conflict Logging**: Track all conflicts for admin review

- [ ] **Question/Subject Conflicts**:
  - **Rule**: Remote always wins (admin-controlled data)
  - **Local Cache**: Update local cache with remote changes
  - **Dependency Check**: Ensure questions exist for subject references

#### 5.5 Sync Status & Error Handling

- [ ] **Sync Status Tracking**:

  - Real-time sync status indicators in UI
  - Last sync timestamp display
  - Pending operations counter
  - Network connectivity status

- [ ] **Error Recovery System**:

  - Retry failed operations with exponential backoff
  - Dead letter queue for persistently failing operations
  - Manual retry triggers for failed syncs
  - Error categorization (network, auth, data validation)

- [ ] **Sync Logging & Debugging**:
  - Comprehensive sync operation logs
  - Performance metrics (sync duration, record counts)
  - Error tracking with context and stack traces
  - Admin dashboard for sync health monitoring

#### 5.6 Database Schema Sync Support

- [ ] **Sync Metadata Tables**:

  ```sql
  -- Track sync operations
  sync_operations (
    id TEXT PRIMARY KEY,
    operation_type TEXT, -- 'push', 'pull', 'conflict_resolution'
    table_name TEXT,
    record_ids TEXT,     -- JSON array of affected IDs
    status TEXT,         -- 'pending', 'success', 'failed', 'retrying'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME,
    completed_at DATETIME
  );

  -- Track last sync timestamps per table
  sync_timestamps (
    table_name TEXT PRIMARY KEY,
    last_pull_sync DATETIME,
    last_push_sync DATETIME,
    last_full_sync DATETIME
  );
  ```

#### 5.7 Network Optimization

- [ ] **Connection Management**:

  - Connection pooling for remote database
  - Request timeout configurations
  - Compression for large data transfers
  - Rate limiting to avoid overwhelming remote server

- [ ] **Data Optimization**:
  - Delta sync (only changed records)
  - Batch operations to reduce network requests
  - Gzip compression for JSON payloads
  - Progress tracking for large sync operations

#### 5.8 Advanced Sync Features

- [ ] **Incremental Sync**:

  - Track modification timestamps on all records
  - Sync only records modified since last sync
  - Handle clock skew between client and server
  - Fallback to full sync if incremental fails

- [ ] **Sync Validation**:
  - Checksum validation for critical data
  - Record count validation after sync
  - Data integrity checks post-sync
  - Automatic corruption detection and recovery

#### 5.9 Performance & Monitoring

- [ ] **Sync Performance Metrics**:

  - Average sync duration per operation type
  - Network throughput monitoring
  - Memory usage during sync operations
  - Database lock duration tracking

- [ ] **Health Monitoring**:
  - Sync success/failure rates
  - Most frequent error types
  - Sync operation trends over time
  - User impact metrics (app responsiveness during sync)

#### 5.10 Testing & Validation

- [ ] **Sync Engine Testing**:

  - Unit tests for conflict resolution logic
  - Integration tests with mock network conditions
  - Load testing with large datasets
  - Edge case testing (corruption, partial failures)

- [ ] **Real-world Scenarios**:
  - Poor network connectivity simulation
  - Concurrent user sync testing
  - App crash during sync recovery
  - Clock synchronization edge cases

This phase is foundational to the entire application's reliability. The sync engine must handle all edge cases gracefully while maintaining data consistency across the dual-database architecture. Success here ensures users can work offline confidently while maintaining seamless data synchronization when online.

## 🎯 Quiz Flow Implementation

### Quiz Controller

```typescript
// lib/quiz/quiz-controller.ts
export class QuizController {
  private localDb: LocalDatabaseService;
  private syncEngine: SyncEngine;
  private currentAttempt: QuizAttempt | null = null;
  private questions: Question[] = [];
  private currentQuestionIndex: number = 0;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
    this.syncEngine = new SyncEngine();
  }

  async startQuiz(userId: string, subjectId: string): Promise<QuizSession> {
    try {
      // Check for existing incomplete attempt
      const existingAttempt = await this.localDb.findIncompleteAttempt(
        userId,
        subjectId
      );

      if (existingAttempt) {
        // Resume existing quiz
        this.currentAttempt = existingAttempt;
        this.questions = await this.loadQuestionsForSubject(subjectId);

        // Find current question based on answered questions
        const answers = JSON.parse(existingAttempt.answers || "{}");
        this.currentQuestionIndex = Object.keys(answers).length;

        return {
          attemptId: existingAttempt.id,
          questions: this.questions,
          currentQuestionIndex: this.currentQuestionIndex,
          answers,
          isResume: true,
        };
      } else {
        // Create new quiz attempt
        this.questions = await this.loadQuestionsForSubject(subjectId);

        if (this.questions.length === 0) {
          throw new Error("No questions available for this subject");
        }

        const attemptId = await this.localDb.createQuizAttempt({
          userId,
          subjectId,
          totalQuestions: this.questions.length,
        });

        this.currentAttempt = await this.localDb.getQuizAttempt(attemptId);
        this.currentQuestionIndex = 0;

        return {
          attemptId,
          questions: this.questions,
          currentQuestionIndex: 0,
          answers: {},
          isResume: false,
        };
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
      throw new Error("Failed to start quiz");
    }
  }

  async answerQuestion(
    attemptId: string,
    questionId: string,
    selectedOption: string
  ): Promise<AnswerResult> {
    try {
      // Validate answer format
      if (!["A", "B", "C", "D"].includes(selectedOption.toUpperCase())) {
        throw new Error("Invalid answer option");
      }

      // Update answer in database
      await this.localDb.updateQuizAnswer(
        attemptId,
        questionId,
        selectedOption.toUpperCase()
      );

      // Update current question index
      this.currentQuestionIndex = Math.min(
        this.currentQuestionIndex + 1,
        this.questions.length
      );

      // Trigger background sync if online
      if (navigator.onLine) {
        this.syncEngine.triggerSync().catch(console.error);
      }

      return {
        success: true,
        nextQuestionIndex: this.currentQuestionIndex,
        isComplete: this.currentQuestionIndex >= this.questions.length,
      };
    } catch (error) {
      console.error("Failed to save answer:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async submitQuiz(attemptId: string): Promise<SubmissionResult> {
    try {
      // Get current attempt
      const attempt = await this.localDb.getQuizAttempt(attemptId);
      if (!attempt) {
        throw new Error("Quiz attempt not found");
      }

      // Calculate score
      const score = await this.calculateScore(attempt);

      // Mark as submitted
      await this.localDb.runQuery(
        `UPDATE quiz_attempts 
         SET submitted = 1, score = ?, submitted_at = ?, session_duration = ?
         WHERE id = ?`,
        [
          score.totalScore,
          new Date().toISOString(),
          this.calculateSessionDuration(attempt.startedAt),
          attemptId,
        ]
      );

      // Trigger immediate sync
      this.syncEngine.triggerSync().catch(console.error);

      return {
        success: true,
        score: score.totalScore,
        totalQuestions: score.totalQuestions,
        correctAnswers: score.correctAnswers,
        percentage: Math.round(
          (score.correctAnswers / score.totalQuestions) * 100
        ),
      };
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async loadQuestionsForSubject(
    subjectId: string
  ): Promise<Question[]> {
    return this.localDb.executeQuery<Question>(
      "SELECT * FROM questions WHERE subject_id = ? AND is_active = 1 ORDER BY question_order, RANDOM()",
      [subjectId]
    );
  }

  private async calculateScore(attempt: QuizAttempt): Promise<ScoreResult> {
    const answers = JSON.parse(attempt.answers || "{}");
    const questions = await this.loadQuestionsForSubject(attempt.subjectId);

    let correctAnswers = 0;

    for (const question of questions) {
      const userAnswer = answers[question.id];
      if (userAnswer && userAnswer === question.answer) {
        correctAnswers++;
      }
    }

    return {
      totalScore: correctAnswers,
      totalQuestions: questions.length,
      correctAnswers,
    };
  }

  private calculateSessionDuration(startedAt: string): number {
    const startTime = new Date(startedAt);
    const endTime = new Date();
    return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  }
}
```

### Quiz Components

#### Quiz Container Component

```typescript
// components/quiz/quiz-container.tsx
"use client";

import { useState, useEffect } from "react";
import { QuizController } from "@/lib/quiz/quiz-controller";
import { QuestionDisplay } from "./question-display";
import { ProgressBar } from "./progress-bar";
import { QuizResults } from "./quiz-results";

interface QuizContainerProps {
  userId: string;
  subjectId: string;
  onExit: () => void;
}

export function QuizContainer({
  userId,
  subjectId,
  onExit,
}: QuizContainerProps) {
  const [quizController] = useState(() => new QuizController());
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeQuiz();
  }, [userId, subjectId]);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      const session = await quizController.startQuiz(userId, subjectId);
      setQuizSession(session);
      setAnswers(session.answers);

      if (session.questions.length > 0) {
        setCurrentQuestion(session.questions[session.currentQuestionIndex]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (selectedOption: string) => {
    if (!quizSession || !currentQuestion) return;

    try {
      const result = await quizController.answerQuestion(
        quizSession.attemptId,
        currentQuestion.id,
        selectedOption
      );

      if (result.success) {
        // Update local answers state
        const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
        setAnswers(newAnswers);

        // Move to next question or show completion
        if (
          !result.isComplete &&
          result.nextQuestionIndex < quizSession.questions.length
        ) {
          setCurrentQuestion(quizSession.questions[result.nextQuestionIndex]);
        } else {
          // All questions answered, ready to submit
          setCurrentQuestion(null);
        }
      } else {
        setError(result.error || "Failed to save answer");
      }
    } catch (error) {
      setError("Failed to save answer");
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizSession) return;

    try {
      setLoading(true);
      const result = await quizController.submitQuiz(quizSession.attemptId);

      if (result.success) {
        setSubmissionResult(result);
        setIsSubmitted(true);
      } else {
        setError(result.error || "Failed to submit quiz");
      }
    } catch (error) {
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={onExit}
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
        >
          Exit Quiz
        </button>
      </div>
    );
  }

  if (isSubmitted && submissionResult) {
    return (
      <QuizResults
        result={submissionResult}
        onExit={onExit}
        onRetakeQuiz={() => {
          setIsSubmitted(false);
          setSubmissionResult(null);
          initializeQuiz();
        }}
      />
    );
  }

  if (!quizSession) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ProgressBar
        currentQuestion={Object.keys(answers).length}
        totalQuestions={quizSession.questions.length}
      />

      {currentQuestion ? (
        <QuestionDisplay
          question={currentQuestion}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswerSelect={handleAnswerSelect}
          questionNumber={Object.keys(answers).length + 1}
        />
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
          <p className="mb-6">
            You have answered all {quizSession.questions.length} questions.
          </p>
          <button
            onClick={handleSubmitQuiz}
            className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-green-600"
          >
            Submit Quiz
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Question Display Component

```typescript
// components/quiz/question-display.tsx
interface QuestionDisplayProps {
  question: Question;
  selectedAnswer?: string;
  onAnswerSelect: (option: string) => void;
  questionNumber: number;
}

export function QuestionDisplay({
  question,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
}: QuestionDisplayProps) {
  const options = JSON.parse(question.options) as string[];
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Question {questionNumber}
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed">{question.text}</p>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => {
          const optionLabel = optionLabels[index];
          const isSelected = selectedAnswer === optionLabel;

          return (
            <button
              key={index}
              onClick={() => onAnswerSelect(optionLabel)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <span className="font-semibold mr-3">{optionLabel}.</span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## 🚨 Error Handling & Edge Cases

### Comprehensive Error Management

```typescript
// lib/error/error-handler.ts
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorLogEntry[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleDatabaseError(error: Error, context: string): void {
    const errorEntry: ErrorLogEntry = {
      id: generateUUID(),
      type: "database",
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    this.errorLog.push(errorEntry);
    console.error(`Database error in ${context}:`, error);

    // Store error in local storage for persistence
    this.persistError(errorEntry);
  }

  handleSyncError(error: Error, operation: string): void {
    const errorEntry: ErrorLogEntry = {
      id: generateUUID(),
      type: "sync",
      message: error.message,
      context: operation,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    this.errorLog.push(errorEntry);

    // Show user-friendly error notification
    this.showUserNotification(
      "Sync failed. Your data is saved locally.",
      "warning"
    );
  }

  handleQuizError(error: Error, quizId: string): void {
    const errorEntry: ErrorLogEntry = {
      id: generateUUID(),
      type: "quiz",
      message: error.message,
      context: `Quiz: ${quizId}`,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    this.errorLog.push(errorEntry);
    this.showUserNotification(
      "Quiz error occurred. Please try again.",
      "error"
    );
  }

  private persistError(error: ErrorLogEntry): void {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("quiz_app_errors") || "[]"
      );
      existingErrors.push(error);

      // Keep only last 100 errors
      if (existingErrors.length > 100) {
        existingErrors.splice(0, existingErrors.length - 100);
      }

      localStorage.setItem("quiz_app_errors", JSON.stringify(existingErrors));
    } catch (e) {
      console.error("Failed to persist error:", e);
    }
  }

  private showUserNotification(
    message: string,
    type: "info" | "warning" | "error"
  ): void {
    // Implementation depends on your notification system
    // Could use toast notifications, modal dialogs, etc.
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem("quiz_app_errors");
  }
}
```

### Edge Case Scenarios

#### Network Connectivity Issues

```typescript
// lib/network/connectivity-handler.ts
export class ConnectivityHandler {
  private isOnline: boolean = navigator.onLine;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Trigger data sync
    const syncEngine = new SyncEngine();
    syncEngine.triggerSync().catch(console.error);

    // Notify user
    this.showConnectivityStatus("Back online! Syncing data...", "success");
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.showConnectivityStatus(
      "Working offline. Data will sync when connection returns.",
      "warning"
    );
  }

  async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch("/health-check", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private showConnectivityStatus(message: string, type: string): void {
    // Show connectivity status to user
    console.log(`${type}: ${message}`);
  }
}
```

#### Data Corruption Recovery

```typescript
// lib/recovery/data-recovery.ts
export class DataRecoveryService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  async validateDatabaseIntegrity(): Promise<IntegrityCheckResult> {
    const issues: string[] = [];

    try {
      // Check for orphaned records
      const orphanedQuestions = await this.localDb.executeQuery(
        "SELECT q.id FROM questions q LEFT JOIN subjects s ON q.subject_id = s.id WHERE s.id IS NULL"
      );

      if (orphanedQuestions.length > 0) {
        issues.push(`Found ${orphanedQuestions.length} orphaned questions`);
      }

      // Check for invalid JSON in answers
      const invalidAnswers = await this.localDb.executeQuery(
        "SELECT id FROM quiz_attempts WHERE answers IS NOT NULL AND json_valid(answers) = 0"
      );

      if (invalidAnswers.length > 0) {
        issues.push(
          `Found ${invalidAnswers.length} quiz attempts with invalid JSON answers`
        );
      }

      // Check for duplicate student codes
      const duplicateStudents = await this.localDb.executeQuery(
        "SELECT student_code, COUNT(*) as count FROM users GROUP BY student_code HAVING count > 1"
      );

      if (duplicateStudents.length > 0) {
        issues.push(
          `Found ${duplicateStudents.length} duplicate student codes`
        );
      }

      return {
        isValid: issues.length === 0,
        issues,
        fixable: true,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Database integrity check failed: ${error.message}`],
        fixable: false,
      };
    }
  }

  async repairDatabase(): Promise<RepairResult> {
    const repairActions: string[] = [];

    try {
      // Remove orphaned questions
      const orphanedResult = await this.localDb.runQuery(
        "DELETE FROM questions WHERE subject_id NOT IN (SELECT id FROM subjects)"
      );
      if (orphanedResult.changes > 0) {
        repairActions.push(
          `Removed ${orphanedResult.changes} orphaned questions`
        );
      }

      // Fix invalid JSON answers by resetting them
      await this.localDb.runQuery(
        'UPDATE quiz_attempts SET answers = "{}" WHERE answers IS NOT NULL AND json_valid(answers) = 0'
      );

      // Handle duplicate student codes by appending suffix
      const duplicates = await this.localDb.executeQuery(
        "SELECT student_code FROM users GROUP BY student_code HAVING COUNT(*) > 1"
      );

      for (const duplicate of duplicates) {
        const users = await this.localDb.executeQuery(
          "SELECT id, student_code FROM users WHERE student_code = ? ORDER BY created_at",
          [duplicate.student_code]
        );

        // Keep first user, update others
        for (let i = 1; i < users.length; i++) {
          const newCode = `${users[i].student_code}_${i}`;
          await this.localDb.runQuery(
            "UPDATE users SET student_code = ? WHERE id = ?",
            [newCode, users[i].id]
          );
          repairActions.push(`Renamed duplicate student code to ${newCode}`);
        }
      }

      return {
        success: true,
        actionsPerformed: repairActions,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        actionsPerformed: repairActions,
      };
    }
  }

  async createBackup(): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupData = {
        timestamp,
        users: await this.localDb.executeQuery("SELECT * FROM users"),
        subjects: await this.localDb.executeQuery("SELECT * FROM subjects"),
        questions: await this.localDb.executeQuery("SELECT * FROM questions"),
        quiz_attempts: await this.localDb.executeQuery(
          "SELECT * FROM quiz_attempts"
        ),
      };

      // Store backup in localStorage or electron file system
      const backupJson = JSON.stringify(backupData);
      localStorage.setItem(`quiz_backup_${timestamp}`, backupJson);

      return {
        success: true,
        backupId: timestamp,
        size: backupJson.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

## 🚀 Deployment & Distribution

### Electron Build Configuration

```javascript
// electron-builder.config.js
module.exports = {
  appId: "com.yourcompany.quiz-app",
  productName: "Quiz Application",
  directories: {
    output: "dist",
    buildResources: "build",
  },
  files: ["out/**/*", "node_modules/**/*", "package.json"],
  extraResources: [
    {
      from: "resources/",
      to: "resources/",
      filter: ["**/*"],
    },
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "build/icon.ico",
  },
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "build/icon.icns",
    category: "public.app-category.education",
  },
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"],
      },
    ],
    icon: "build/icon.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
};
```

### Build Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:electron\"",
    "dev:next": "next dev",
    "dev:electron": "electron .",
    "build": "npm run build:next && npm run build:electron",
    "build:next": "next build",
    "build:electron": "electron-builder",
    "build:all-platforms": "electron-builder -mwl",
    "package": "npm run build:next && electron-builder --publish=never",
    "release": "npm run build && electron-builder --publish=always",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### Auto-Update Configuration

```typescript
// lib/updater/auto-updater.ts
import { autoUpdater } from "electron-updater";
import { app, dialog } from "electron";

export class AutoUpdaterService {
  constructor() {
    this.configureAutoUpdater();
  }

  private configureAutoUpdater(): void {
    // Configure update server
    autoUpdater.setFeedURL({
      provider: "github",
      owner: "your-username",
      repo: "quiz-app",
    });

    // Check for updates on app start
    autoUpdater.checkForUpdatesAndNotify();

    // Handle update events
    autoUpdater.on("update-available", () => {
      dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message:
          "A new version is available. It will be downloaded in the background.",
        buttons: ["OK"],
      });
    });

    autoUpdater.on("update-downloaded", () => {
      dialog
        .showMessageBox({
          type: "info",
          title: "Update Ready",
          message:
            "Update downloaded. The application will restart to apply the update.",
          buttons: ["Restart Now", "Later"],
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    });
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdatesAndNotify();
  }
}
```

## 📊 Performance Monitoring

### Performance Metrics Collection

```typescript
// lib/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  startQuizTimer(attemptId: string): void {
    performance.mark(`quiz-start-${attemptId}`);
  }

  endQuizTimer(attemptId: string): number {
    performance.mark(`quiz-end-${attemptId}`);
    performance.measure(
      `quiz-duration-${attemptId}`,
      `quiz-start-${attemptId}`,
      `quiz-end-${attemptId}`
    );

    const measure = performance.getEntriesByName(
      `quiz-duration-${attemptId}`
    )[0];
    return Math.round(measure.duration);
  }

  recordDatabaseOperation(operation: string, duration: number): void {
    this.metrics.push({
      type: "database",
      operation,
      duration,
      timestamp: Date.now(),
    });
  }

  recordSyncOperation(
    operation: string,
    recordCount: number,
    duration: number
  ): void {
    this.metrics.push({
      type: "sync",
      operation,
      recordCount,
      duration,
      timestamp: Date.now(),
    });
  }

  getPerformanceReport(): PerformanceReport {
    const databaseMetrics = this.metrics.filter((m) => m.type === "database");
    const syncMetrics = this.metrics.filter((m) => m.type === "sync");

    return {
      averageDatabaseResponseTime: this.calculateAverage(
        databaseMetrics.map((m) => m.duration)
      ),
      averageSyncTime: this.calculateAverage(
        syncMetrics.map((m) => m.duration)
      ),
      totalSyncOperations: syncMetrics.length,
      totalDatabaseOperations: databaseMetrics.length,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  private getMemoryUsage(): MemoryInfo {
    if ("memory" in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }
    return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
  }
}
```

## 🔒 Security Considerations

### Data Security

```typescript
// lib/security/data-security.ts
export class DataSecurityService {
  async encryptSensitiveData(data: string): Promise<string> {
    // Use Web Crypto API for client-side encryption
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate a key for encryption
    const key = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );

    // Encrypt the data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      dataBuffer
    );

    // Return base64 encoded result
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  validateStudentCode(studentCode: string): boolean {
    // Implement validation rules
    const pattern = /^[A-Z0-9]{6,12}$/;
    return pattern.test(studentCode);
  }

  validateSubjectCode(subjectCode: string): boolean {
    // Implement validation rules
    const pattern = /^[A-Z]{2,6}\d{2,4}$/;
    return pattern.test(subjectCode);
  }

  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      .trim();
  }

  hashPassword(password: string): Promise<string> {
    // Use bcrypt for password hashing
    const bcrypt = require("bcryptjs");
    return bcrypt.hash(password, 10);
  }
}
```

## 📋 Type Definitions

```typescript
// types/index.ts
export interface User {
  id: string;
  name: string;
  studentCode: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  subjectCode: string;
  description?: string;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  text: string;
  options: string; // JSON string
  answer: string;
  difficultyLevel: number;
  questionOrder?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  subjectId: string;
  answers?: string; // JSON string
  score?: number;
  totalQuestions: number;
  submitted: boolean;
  synced: boolean;
  startedAt: string;
  submittedAt?: string;
  updatedAt: string;
  syncAttemptedAt?: string;
  syncError?: string;
  sessionDuration?: number;
}

export interface QuizSession {
  attemptId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isResume: boolean;
}

export interface AnswerResult {
  success: boolean;
  nextQuestionIndex?: number;
  isComplete?: boolean;
  error?: string;
}

export interface SubmissionResult {
  success: boolean;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  percentage?: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  pushedRecords?: number;
  pulledRecords?: number;
  error?: string;
}

export interface ErrorLogEntry {
  id: string;
  type: "database" | "sync" | "quiz" | "network";
  message: string;
  context: string;
  timestamp: string;
  stack?: string;
}

export interface PerformanceMetric {
  type: "database" | "sync" | "quiz";
  operation: string;
  duration: number;
  recordCount?: number;
  timestamp: number;
}
```

---

## 🎯 Implementation Roadmap

### Phase 1: Core Infrastructure

- [ ] Set up Electron.js with Next.js App Router
- [ ] Configure local SQLite database with better-sqlite3
- [ ] Implement database schemas and initial migrations
- [ ] Set up Drizzle ORM with NeonDB connection
- [ ] Create data access layer abstraction

### Phase 2: Authentication & User Management

- [ ] Implement student code + PIN authentication
- [ ] Create user seeding scripts
- [ ] Build login/logout flows
- [ ] Add session management

### Phase 3: Quiz Engine

- [x] Build quiz controller and state management
- [x] Create question display components (note only one question shows at a time -> Next/Previous Button should be used to move between questions)
- [x] Implement answer saving and validation
- [x] Add quiz submission functionality
- [x] Build results display

### Phase 4: Data Import & Management

- [ ] Excel import functionality for questions (note: the question can not imported but seeded meaning the excel are read and seeded)
- [ ] Subject management system
- [ ] Data validation and error handling
- [ ] Admin interface for data management

### Phase 5: Custom Sync Engine Implementation

- [ ] Build custom sync engine
- [ ] Implement conflict resolution
- [ ] Add offline/online detection
- [ ] Create sync status indicators

### Phase 6: Error Handling & Recovery

- [ ] Comprehensive error handling
- [ ] Data corruption recovery
- [ ] Performance monitoring
- [ ] Logging and debugging tools

### Phase 7: Security & Performance

- [ ] Security hardening
- [ ] Performance optimization
- [ ] Memory management
- [ ] Database indexing

### Phase 8: Packaging & Deployment

- [ ] Electron build configuration
- [ ] Auto-updater implementation
- [ ] Multi-platform testing
- [ ] Production deployment

---

_This architecture document provides a comprehensive foundation for building a robust, offline-first quiz application with reliable data synchronization capabilities._
