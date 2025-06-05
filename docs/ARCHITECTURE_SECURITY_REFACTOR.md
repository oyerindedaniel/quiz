# Architecture Security Refactor - Database Operations

## Current Security Issues ❌

### 1. Direct Database Access in Renderer Process

- **Files Affected**: `enhanced-quiz-container.tsx`, all quiz components
- **Issue**: Using `LocalDatabaseService` directly in React components
- **Risk**: Violates Electron security model, exposes database to renderer

### 2. ORM Usage in Renderer

- **Files Affected**: `neon.ts`, `local-database-service.ts`
- **Issue**: Drizzle ORM running in renderer process
- **Risk**: Node.js APIs accessible to potentially malicious scripts

### 3. Database Connection Strings in Renderer

- **Files Affected**: `neon.ts`
- **Issue**: Database credentials accessible in renderer
- **Risk**: Sensitive data exposure

## Proper Electron Architecture ✅

### Main Process (Secure Zone)

```
electron/main.ts
├── Database Services
├── File System Operations
├── Network Requests
├── IPC Handlers
└── Security Policies
```

### Renderer Process (Sandboxed)

```
src/components/
├── UI Components Only
├── State Management
├── Event Handling
└── IPC Calls to Main
```

## Refactor Implementation Plan

### Phase 1: Main Process Database Layer

#### 1.1 Database Service in Main Process

```typescript
// electron/services/database-service.ts
import { LocalDatabaseService } from "../src/lib/database/local-database-service";

export class MainDatabaseService {
  private localDb: LocalDatabaseService;

  constructor() {
    this.localDb = LocalDatabaseService.getInstance();
  }

  async initialize(): Promise<void> {
    await this.localDb.initialize();
  }

  // Expose safe database operations via IPC
  async getQuestionsForSubject(subjectId: string) {
    return this.localDb.getQuestionsForSubject(subjectId);
  }

  async createQuizAttempt(attemptData: any) {
    return this.localDb.createQuizAttempt(attemptData);
  }

  async updateQuizAnswer(
    attemptId: string,
    questionId: string,
    answer: string
  ) {
    return this.localDb.updateQuizAnswer(attemptId, questionId, answer);
  }

  // ... other safe database operations
}
```

#### 1.2 IPC Handlers in Main Process

```typescript
// electron/main.ts
import { ipcMain } from "electron";
import { MainDatabaseService } from "./services/database-service";

class QuizApp {
  private dbService: MainDatabaseService;

  constructor() {
    this.dbService = new MainDatabaseService();
    this.setupIPC();
  }

  private setupIPC(): void {
    // Quiz operations
    ipcMain.handle("quiz:get-questions", async (event, subjectId: string) => {
      return this.dbService.getQuestionsForSubject(subjectId);
    });

    ipcMain.handle("quiz:create-attempt", async (event, attemptData: any) => {
      return this.dbService.createQuizAttempt(attemptData);
    });

    ipcMain.handle(
      "quiz:save-answer",
      async (event, attemptId: string, questionId: string, answer: string) => {
        return this.dbService.updateQuizAnswer(attemptId, questionId, answer);
      }
    );

    ipcMain.handle("quiz:submit", async (event, attemptId: string) => {
      return this.dbService.submitQuiz(attemptId);
    });

    // CSV Import operations
    ipcMain.handle("csv:import", async (event, csvContent: string) => {
      return this.dbService.importCSVQuestions(csvContent);
    });

    ipcMain.handle("csv:read-file", async (event, filePath: string) => {
      const fs = await import("fs/promises");
      return fs.readFile(filePath, "utf-8");
    });
  }
}
```

### Phase 2: Renderer Process Refactor

#### 2.1 IPC Service Layer

```typescript
// src/lib/services/ipc-database-service.ts
export class IPCDatabaseService {
  async getQuestionsForSubject(subjectId: string) {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    return window.electronAPI.quiz.getQuestions(subjectId);
  }

  async createQuizAttempt(attemptData: any) {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    return window.electronAPI.quiz.createAttempt(attemptData);
  }

  async saveAnswer(attemptId: string, questionId: string, answer: string) {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    return window.electronAPI.quiz.saveAnswer(attemptId, questionId, answer);
  }

  async submitQuiz(attemptId: string) {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    return window.electronAPI.quiz.submit(attemptId);
  }
}
```

#### 2.2 Updated Preload Script

```typescript
// electron/preload.ts
const electronAPI = {
  // Database operations
  database: {
    execute: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:execute", sql, params),
    run: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:run", sql, params),
    backup: (backupPath: string) => ipcRenderer.invoke("db:backup", backupPath),
    checkIntegrity: () => ipcRenderer.invoke("db:integrity-check"),
  },

  // Quiz operations
  quiz: {
    getQuestions: (subjectId: string) =>
      ipcRenderer.invoke("quiz:get-questions", subjectId),
    createAttempt: (attemptData: any) =>
      ipcRenderer.invoke("quiz:create-attempt", attemptData),
    saveAnswer: (attemptId: string, questionId: string, answer: string) =>
      ipcRenderer.invoke("quiz:save-answer", attemptId, questionId, answer),
    submit: (attemptId: string) => ipcRenderer.invoke("quiz:submit", attemptId),
  },

  // CSV operations
  csv: {
    import: (csvContent: string) =>
      ipcRenderer.invoke("csv:import", csvContent),
    readFile: (filePath: string) =>
      ipcRenderer.invoke("csv:read-file", filePath),
  },

  // App information
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPath: (name: string) => ipcRenderer.invoke("app:get-path", name),
  },
};
```

#### 2.3 Updated Quiz Components

```typescript
// src/components/quiz/enhanced-quiz-container.tsx
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";

export function EnhancedQuizContainer({ user, subject, onExit }: Props) {
  const [state, setState] = useState<QuizState>({...});
  const ipcDb = new IPCDatabaseService();

  const initializeQuiz = async () => {
    try {
      // Use IPC service instead of direct database access
      const existingAttempt = await ipcDb.findIncompleteAttempt(user.id, subject.id);
      const rawQuestions = await ipcDb.getQuestionsForSubject(subject.id);

      // ... rest of initialization logic
    } catch (error) {
      // ... error handling
    }
  };

  const handleAnswerSelect = async (selectedOption: string) => {
    try {
      // Use IPC service for database updates
      await ipcDb.saveAnswer(state.attempt.id, questionId, selectedOption);
      // ... update local state
    } catch (error) {
      // ... error handling
    }
  };

  // ... rest of component
}
```

### Phase 3: Type Safety Updates

#### 3.1 Enhanced ElectronAPI Types

```typescript
// src/types/electron.ts
export interface QuizAPI {
  getQuestions: (subjectId: string) => Promise<Question[]>;
  createAttempt: (attemptData: any) => Promise<string>;
  saveAnswer: (
    attemptId: string,
    questionId: string,
    answer: string
  ) => Promise<void>;
  submit: (attemptId: string) => Promise<SubmissionResult>;
  findIncompleteAttempt: (
    userId: string,
    subjectId: string
  ) => Promise<QuizAttempt | null>;
}

export interface CSVAPI {
  import: (csvContent: string) => Promise<ImportResult>;
  readFile: (filePath: string) => Promise<string>;
}

export interface ElectronAPI {
  database: DatabaseAPI;
  quiz: QuizAPI;
  csv: CSVAPI;
  app: AppAPI;
}
```

## Implementation Steps

### Immediate Actions Required

1. **Stop using database services directly in components**

   ```bash
   # Remove these imports from all React components
   import { LocalDatabaseService } from "@/lib/database/local-database-service";
   import { NeonManager } from "@/lib/database/neon";
   ```

2. **Implement IPC handlers in main process**

   - Move database operations to `electron/main.ts`
   - Create secure IPC channels for each operation
   - Validate all inputs in main process

3. **Create IPC service layer in renderer**

   - Wrap all database calls in IPC service
   - Handle connection failures gracefully
   - Provide proper TypeScript typing

4. **Update component architecture**
   - Remove direct database imports
   - Use IPC service layer
   - Maintain existing component logic

### Security Benefits

✅ **Sandboxed Renderer**: No Node.js APIs exposed to renderer  
✅ **Credential Protection**: Database strings stay in main process  
✅ **Input Validation**: All data validated before database operations  
✅ **Controlled Access**: Only exposed operations available to renderer  
✅ **Error Handling**: Secure error messages without sensitive data

### Development Workflow

1. **Phase 1**: Implement main process services (1-2 days)
2. **Phase 2**: Create IPC service layer (1 day)
3. **Phase 3**: Refactor components one by one (2-3 days)
4. **Phase 4**: Testing and validation (1 day)

This refactor ensures the application follows Electron security best practices while maintaining all existing functionality.
