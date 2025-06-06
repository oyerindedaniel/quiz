# Quiz Timer Continuity Theory & Implementation

## 📖 Overview

This document explains the theory and architecture behind implementing quiz timer continuity across sessions, interruptions, and system failures in our quiz application.

## 🎯 The Problem

### Real-World Scenario

```
Student starts a quiz at 2:00 PM
├─ Answers 5 questions (10 minutes elapsed)
├─ WiFi connection drops at 2:10 PM
├─ Student troubleshoots network for 30 minutes
└─ Reconnects at 2:40 PM and continues quiz
```

**Challenge**: How do we ensure the timer shows 10 minutes elapsed (not 40 minutes) when they resume?

### Types of Interruptions

1. **Network Outages** - Internet connectivity lost
2. **Application Crashes** - Browser/app closes unexpectedly
3. **System Restarts** - OS updates, power loss
4. **Intentional Breaks** - Student closes laptop, takes break
5. **Device Switching** - Continue on different device

## 🏗️ Architectural Solution

### Core Concept: Time Decomposition

Instead of one continuous timer, we split time into components:

```
Total Quiz Time = Previous Sessions + Current Session

Where:
├─ Previous Sessions: Stored in database (persistent)
├─ Current Session: Calculated from session start
└─ Total: Combined for accurate display
```

### Visual Representation

```
Session 1     Interruption    Session 2     Interruption    Session 3
┌─────────┐   ┌─────────┐    ┌─────────┐   ┌─────────┐    ┌─────────┐
│ 0-10min │   │ OFFLINE │    │10-25min │   │ OFFLINE │    │25-45min │
│ Active  │   │ 30min   │    │ Active  │   │ 15min   │    │ Active  │
└─────────┘   └─────────┘    └─────────┘   └─────────┘    └─────────┘
     │             │              │             │              │
     ▼             ▼              ▼             ▼              ▼
Save: 10min   (ignored)     Save: 25min   (ignored)     Save: 45min
```

**Result**: Timer shows continuous progression: 10min → 25min → 45min

## 🗄️ Database Schema Design

### Schema Evolution

#### Before (Simple Approach)

```sql
quiz_attempts {
  id: text,
  startedAt: timestamp,     -- When quiz first started
  sessionDuration: int      -- Only final duration when submitted
}
```

**Problem**: No way to track time across interruptions.

#### After (Continuity Support)

```sql
quiz_attempts {
  id: text,
  startedAt: timestamp,     -- When quiz first started
  sessionDuration: int,     -- Final total duration (unchanged)
  elapsedTime: int,         -- 🆕 Accumulated time across sessions
  lastActiveAt: timestamp   -- 🆕 Last activity timestamp
}
```

### Field Purposes

| Field             | Purpose                 | Example                 |
| ----------------- | ----------------------- | ----------------------- |
| `startedAt`       | Quiz creation time      | "2024-01-15 14:00:00"   |
| `elapsedTime`     | Accumulated active time | 900 (15 minutes)        |
| `lastActiveAt`    | Last activity timestamp | "2024-01-15 14:15:30"   |
| `sessionDuration` | Final total time        | 1800 (30 minutes total) |

## ⏱️ Timer Implementation Theory

### State Management

```typescript
class QuizTimer {
  // From database (persistent)
  previousElapsedTime: number = 900; // 15 minutes from previous sessions

  // Current session (runtime)
  sessionStartTime: number = Date.now();

  // Calculated (live)
  getCurrentElapsed(): number {
    const sessionTime = (Date.now() - this.sessionStartTime) / 1000;
    return this.previousElapsedTime + sessionTime;
  }
}
```

### Session Lifecycle

```
┌─────────────┐    start()    ┌─────────────┐
│  NEW QUIZ   │──────────────▶│   ACTIVE    │
│elapsedTime:0│               │elapsedTime:N│
└─────────────┘               └─────────────┘
                                     │
                              interruption│
                                     ▼
┌─────────────┐    resume()   ┌─────────────┐
│  RESUMED    │◀──────────────│   PAUSED    │
│elapsedTime:N│               │elapsedTime:N│
└─────────────┘               └─────────────┘
       │                             │
       │          submit()           │
       ▼              ▼              ▼
┌─────────────────────────────────────────┐
│             COMPLETED                    │
│      sessionDuration: TOTAL              │
└─────────────────────────────────────────┘
```

## 🔄 Data Flow Architecture

### Component Interaction

```
UI Layer (QuizTimer)
├─ Displays: previousElapsedTime + currentSessionTime
├─ Updates: Every second
└─ Shows: "(resumed)" indicator if previousElapsedTime > 0

Controller Layer (QuizController)
├─ Manages: Session state and elapsed time calculation
├─ Triggers: Periodic elapsed time updates
└─ Coordinates: Between UI and database

Database Layer
├─ Stores: Persistent elapsed time
├─ Updates: On answer saves and periodic intervals
└─ Provides: Recovery data for resumption
```

### Update Strategy

```typescript
// When student saves an answer
async saveAnswer(questionId: string, answer: string) {
  // 1. Save the answer
  await database.updateAnswer(questionId, answer);

  // 2. Calculate current total elapsed time
  const totalElapsed = this.calculateTotalElapsed();

  // 3. Persist elapsed time (checkpoint)
  await database.updateElapsedTime(attemptId, totalElapsed);

  // 4. Update session timestamp
  await database.updateLastActive(attemptId, now());
}
```

## 🛡️ Reliability Patterns

### 1. Checkpoint Strategy

Like database transaction logs, we periodically save progress:

```typescript
// Checkpoint triggers
├─ On answer save (user action)
├─ On navigation (question change)
├─ On window blur (user switching apps)
└─ On periodic timer (every 30 seconds)
```

### 2. Graceful Degradation

```typescript
async updateElapsedTime() {
  try {
    await database.updateElapsedTime(attemptId, elapsedTime);
  } catch (error) {
    console.warn("Time update failed, continuing quiz...");
    // Quiz continues, slight data loss acceptable
  }
}
```

### 3. Recovery Mechanisms

```typescript
// On quiz resume
async resumeQuiz(attempt: QuizAttempt) {
  const previousTime = attempt.elapsedTime || 0;  // Default to 0
  const sessionStart = Date.now();

  return {
    attemptId: attempt.id,
    elapsedTime: previousTime,     // Restore previous progress
    sessionStart: sessionStart,   // New session timing
    isResume: previousTime > 0     // Indicate if resumed
  };
}
```

## 📊 Mathematical Model

### Time Calculation Formula

```
Total_Elapsed(t) = Σ(Session_i.duration) + Current_Session.elapsed

Where:
├─ Session_i.duration = Previous completed sessions
├─ Current_Session.elapsed = (now - session_start) / 1000
└─ Total_Elapsed = Displayed timer value
```

### Example Calculation

```
Student timeline:
├─ Session 1: 0-600 seconds (10 min) → saved to database
├─ Break: 1800 seconds (30 min) → not counted
├─ Session 2: 600-900 seconds (5 min) → current session
└─ Display: 900 seconds (15 min total)

Calculation:
Total = database.elapsedTime + (now - sessionStart)
Total = 600 + (Date.now() - sessionStart) / 1000
Total = 600 + 300 = 900 seconds = "00:15:00"
```

## 🔧 Implementation Details

### Timer Component Logic

```typescript
function QuizTimer({ previousElapsedTime = 0, startTime }) {
  const [currentSessionTime, setCurrentSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setCurrentSessionTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const totalElapsed = previousElapsedTime + currentSessionTime;
  const displayTime = formatTime(totalElapsed);

  return (
    <div>
      {displayTime}
      {previousElapsedTime > 0 && <span>(resumed)</span>}
    </div>
  );
}
```

### Database Update Pattern

```typescript
class QuizController {
  private sessionStartTime = Date.now();

  async updateElapsedTime() {
    // Calculate time spent in current session
    const currentSessionElapsed = Math.floor(
      (Date.now() - this.sessionStartTime) / 1000
    );

    // Add to previous elapsed time
    const totalElapsed =
      (this.session.elapsedTime || 0) + currentSessionElapsed;

    // Persist to database
    await this.database.updateElapsedTime(this.attemptId, totalElapsed);

    // Reset session timer (important!)
    this.sessionStartTime = Date.now();
    this.session.elapsedTime = totalElapsed;
  }
}
```

## 🎯 Design Principles

### 1. Single Source of Truth

- **Database** holds authoritative elapsed time
- **Memory** only tracks current session
- **UI** combines both for display

### 2. Eventual Consistency

- Immediate updates for user experience
- Periodic persistence for data safety
- Sync reconciliation for multi-device

### 3. Fail-Safe Defaults

- Missing elapsed time → default to 0
- Failed database update → continue quiz
- Corrupted session → restart timing

### 4. Idempotent Operations

```typescript
// Safe to call multiple times
updateElapsedTime(attemptId, 900); // Sets to 900 seconds
updateElapsedTime(attemptId, 900); // Same result, no side effects
```

## 📈 Performance Considerations

### Update Frequency Strategy

```
High Frequency (1 second)
├─ UI timer display updates
└─ In-memory calculations

Medium Frequency (answer saves)
├─ Database elapsed time updates
└─ Session state persistence

Low Frequency (periodic/emergency)
├─ Backup elapsed time saves
└─ Cleanup operations
```

### Memory vs Storage Trade-offs

| Aspect      | Memory         | Database      |
| ----------- | -------------- | ------------- |
| Speed       | Instant        | ~10-50ms      |
| Persistence | Lost on crash  | Permanent     |
| Consistency | Single session | Cross-session |
| Overhead    | Minimal        | I/O cost      |

## 🚨 Edge Cases Handled

### 1. Clock Changes

```typescript
// Use relative time, not absolute timestamps
const elapsed = (performance.now() - sessionStart) / 1000;
// Not: new Date().getTime() - sessionStart
```

### 2. Multiple Browser Tabs

```typescript
// Each tab maintains independent session timing
// Database holds authoritative total
// Last active tab wins on conflicts
```

### 3. Daylight Saving Time

```typescript
// Store as seconds elapsed, not timestamps
elapsedTime: 3600,  // 1 hour in seconds
// Not: endTime - startTime (affected by DST)
```

### 4. System Sleep/Hibernate

```typescript
// Detect large time gaps
const timeDiff = Date.now() - lastUpdate;
if (timeDiff > 60000) {
  // > 1 minute gap
  // System likely slept, don't count this time
  this.sessionStartTime = Date.now();
}
```

## 🔍 Testing Strategy

### Unit Tests

```typescript
describe("Timer Continuity", () => {
  test("resumes from previous elapsed time", () => {
    const timer = new QuizTimer({
      previousElapsedTime: 600, // 10 minutes
      startTime: Date.now(),
    });

    expect(timer.getTotalElapsed()).toBeGreaterThanOrEqual(600);
  });
});
```

### Integration Tests

```typescript
describe("Quiz Session Continuity", () => {
  test("survives application restart", async () => {
    // Start quiz
    const session1 = await startQuiz(userId, subjectId);
    await answerQuestion(session1, questionId, "A");

    // Simulate restart
    await simulateAppRestart();

    // Resume quiz
    const session2 = await startQuiz(userId, subjectId);
    expect(session2.elapsedTime).toBeGreaterThan(0);
    expect(session2.isResume).toBe(true);
  });
});
```

## 📚 Further Reading

- **Database Checkpointing**: SQLite WAL mode documentation
- **State Management**: Redux persistence patterns
- **Time Handling**: Moment.js timezone considerations
- **Offline-First**: Service worker caching strategies

---

## 💡 Key Takeaways

1. **Decompose time** into persistent + ephemeral components
2. **Checkpoint frequently** to minimize data loss
3. **Handle failures gracefully** without blocking user flow
4. **Use relative time** calculations to avoid clock issues
5. **Test edge cases** thoroughly for robust behavior

This architecture ensures fair, accurate timing regardless of interruptions! 🎯
