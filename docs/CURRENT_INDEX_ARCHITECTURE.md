# Current Index Architecture in Quiz System

## Overview

The `currentIndex` is the core navigation mechanism in our quiz system. It's an integer that points to a specific position in the `questionItems` array, which contains ALL processed items from CSV import - not just questions, but also passages, headers, and images.

**Critical Understanding**: `currentIndex` ≠ Question Number. It's an array index that can point to any type of content.

## Detailed Type Breakdown

### QuestionItem Types and Their Behavior

#### 1. **Passage** (`type: "passage"`)

- **Purpose**: Reading material for comprehension questions
- **Navigation**: Can navigate TO and FROM (user reads then continues)
- **Answerable**: NO - purely informational
- **Display**: Full passage content with "Continue" button

#### 2. **Header** (`type: "header"`)

- **Purpose**: Instructions for upcoming question(s)
- **Navigation**: PAIRED - always displayed with next question
- **Answerable**: NO - but triggers answer collection for paired question
- **Display**: Header text + paired question + answer options

#### 3. **Image** (`type: "image"`)

- **Purpose**: Visual content for question context
- **Navigation**: PAIRED - always displayed with next question
- **Answerable**: NO - but triggers answer collection for paired question
- **Display**: Image + paired question + answer options

#### 4. **Question** (`type: "question"`)

- **Purpose**: Actual quiz question requiring an answer
- **Navigation**: Can be STANDALONE or PAIRED with header/image
- **Answerable**: YES - the core answerable unit
- **Display**: Question text + answer options

## Detailed Navigation Walkthroughs

### Scenario 1: Mixed Content Quiz

Let's trace through this CSV structure:

```csv
[PASSAGE] Read the following text about climate change...  // index 0
[HEADER] Now answer these questions.                       // index 1
The world is _______ everyday                              // index 2 (Question Order: 1)
People change by _______                                   // index 3 (Question Order: 2)
[HEADER] Choose the correct synonym for underlined words   // index 4
The nation is **confronted** with challenges              // index 5 (Question Order: 3)
[IMAGE] position:up\nhttps://example.com/diagram.jpg      // index 6
Based on the diagram, what is the correct answer?         // index 7 (Question Order: 4)
```

#### Step-by-Step Navigation:

**STEP 1: Initial Load**

```typescript
// System starts here
currentIndex = 0; // Points to passage
currentQuestionNumber = 1; // Will show question 1 when we reach it
```

- **Display**: Passage content with "Continue" button
- **User Action**: Reads passage, clicks "Continue"
- **System Action**: `getNextAnswerableQuestionIndex(0)` → returns 1

**STEP 2: Navigation to Header+Question Pair**

```typescript
currentIndex = 1; // Points to header
// But header is PAIRED with next question (index 2)
```

- **Display Logic**:
  - `currentItem = questionItems[1]` (header)
  - `renderHeaderWithQuestion()` called
  - Shows header text + question at index 2
- **Answer Logic**:
  - `getAnswerableQuestion(1)` → returns questionItems[2]
  - Answer saves to question ID at index 2
- **Progress**: Shows "Question 1 of 4" (because paired question is Question Order 1)

**STEP 3: User Answers First Question**

```typescript
// User selects option "C"
handleAnswerSelect("C") {
  questionToAnswer = getAnswerableQuestion(1)  // Returns index 2 question
  saveAnswer(questionItems[2].question.id, "C")
}
```

- **User Action**: Clicks "Next"
- **System Action**: `getNextAnswerableQuestionIndex(1)` → returns 3

**STEP 4: Standalone Question**

```typescript
currentIndex = 3; // Points directly to question
```

- **Display Logic**:
  - `currentItem = questionItems[3]` (question)
  - `renderRegularQuestion()` called
  - Shows question text + options
- **Answer Logic**:
  - `getAnswerableQuestion(3)` → returns questionItems[3]
  - Answer saves to question ID at index 3
- **Progress**: Shows "Question 2 of 4"

**STEP 5: Next Header+Question Pair**

```typescript
currentIndex = 4; // Points to header (second one)
```

- **Display**: Header text + question at index 5
- **Answer**: Saves to question ID at index 5
- **Progress**: Shows "Question 3 of 4"

**STEP 6: Image+Question Pair**

```typescript
currentIndex = 6; // Points to image
```

- **Display Logic**:
  - `currentItem = questionItems[6]` (image)
  - `renderImageWithQuestion()` called
  - Shows image + question at index 7
- **Answer Logic**:
  - `getAnswerableQuestion(6)` → returns questionItems[7]
  - Answer saves to question ID at index 7
- **Progress**: Shows "Question 4 of 4"

### Scenario 2: Resume Mode Navigation

User previously answered questions 1 and 2, now resuming:

```typescript
// Existing answers
answers = {
  "question-id-1": "C",  // From index 2
  "question-id-2": "A"   // From index 3
}

// findCurrentQuestionIndex() logic:
for (let i = 0; i < questionItems.length; i++) {
  if (i === 0) continue;  // Passage, skip
  if (i === 1) {          // Header+Question pair
    answerableQuestion = getAnswerableQuestion(1);  // Returns index 2
    if (answerableQuestion.question.id NOT in answers) {
      return 1;  // Would resume here if unanswered
    }
  }
  if (i === 3) {          // Standalone question
    if (questionItems[3].question.id NOT in answers) {
      return 3;  // Would resume here if unanswered
    }
  }
  if (i === 4) {          // Header+Question pair
    answerableQuestion = getAnswerableQuestion(4);  // Returns index 5
    if (answerableQuestion.question.id NOT in answers) {
      return 4;  // Resume here - first unanswered!
    }
  }
}

// Result: currentIndex = 4 (header for question 3)
```

### Scenario 3: Navigation Method Deep Dive

#### `getNextAnswerableQuestionIndex(currentIndex)`

**From currentIndex = 0 (passage)**:

```typescript
for (i = 1; i < length; i++) {
  if (i === 1 && type === "header" && i+1 exists && questionItems[2].type === "question") {
    return 1;  // Return header index for paired display
  }
}
```

**From currentIndex = 1 (header+question pair)**:

```typescript
for (i = 2; i < length; i++) {
  if (i === 2) continue; // Skip paired question (already handled)
  if (i === 3 && type === "question") {
    return 3; // Next standalone question
  }
}
```

#### `getPreviousAnswerableQuestionIndex(currentIndex)`

**From currentIndex = 4 (header+question pair)**:

```typescript
for (i = 3; i >= 0; i--) {
  if (i === 3 && type === "question") {
    return 3; // Previous standalone question
  }
  if (i === 1 && type === "header") {
    return 1; // Previous header+question pair
  }
  if (i === 0 && type === "passage") {
    return 0; // Passage is navigable for reading
  }
}
```

## Answer Collection Logic

### Key Rule: Answer Target vs Display Target

```typescript
// DISPLAY uses currentIndex directly
const currentItem = questionItems[currentIndex];

// ANSWER uses getAnswerableQuestion() result
const questionToAnswer = getAnswerableQuestion(currentIndex);
```

### Examples:

**Header+Question Pair (currentIndex = 1)**:

```typescript
// Display
currentItem = questionItems[1]; // Header content
nextItem = questionItems[2]; // Question content
// Shows: Header text + Question options

// Answer
questionToAnswer = getAnswerableQuestion(1); // Returns questionItems[2]
saveAnswer(questionItems[2].question.id, selectedOption);
```

**Standalone Question (currentIndex = 3)**:

```typescript
// Display
currentItem = questionItems[3]; // Question content
// Shows: Question options

// Answer
questionToAnswer = getAnswerableQuestion(3); // Returns questionItems[3]
saveAnswer(questionItems[3].question.id, selectedOption);
```

**Image+Question Pair (currentIndex = 6)**:

```typescript
// Display
currentItem = questionItems[6]; // Image content
nextItem = questionItems[7]; // Question content
// Shows: Image + Question options

// Answer
questionToAnswer = getAnswerableQuestion(6); // Returns questionItems[7]
saveAnswer(questionItems[7].question.id, selectedOption);
```

## Progress Calculation Logic

### Question Numbering

```typescript
getCurrentQuestionNumber(questionItems, actualQuestions, currentIndex) {
  const currentItem = questionItems[currentIndex];

  if (currentItem.type === "question") {
    // Find this question's position in actualQuestions array
    return actualQuestions.findIndex(q => q.question.id === currentItem.question.id) + 1;
  }

  if (currentItem.type === "header" || currentItem.type === "image") {
    // For paired items, find paired question's position
    const pairedQuestion = questionItems[currentIndex + 1];
    return actualQuestions.findIndex(q => q.question.id === pairedQuestion.question.id) + 1;
  }

  return 1; // Fallback for passages
}
```

### Total Questions

```typescript
// totalQuestions = actualQuestions.length (only answerable questions)
// NOT questionItems.length (which includes passages, headers, images)

actualQuestions = [
  questionItems[2], // Question 1
  questionItems[3], // Question 2
  questionItems[5], // Question 3
  questionItems[7], // Question 4
];

totalQuestions = 4; // Not 8 (questionItems.length)
```

## Complex Navigation Scenarios

### Scenario 4: Orphaned Headers/Images

```csv
[HEADER] Instructions for questions      // index 0
[HEADER] More instructions (orphaned)    // index 1
What is the answer?                      // index 2
```

**Navigation**:

- Start: `currentIndex = 0` → Header+Question pair (displays header + question at index 2)
- Next: `getNextAnswerableQuestionIndex(0)` → Skips orphaned header, no more questions
- Result: `isLastQuestion = true`

### Scenario 5: Multiple Passages

```csv
[PASSAGE] First passage...               // index 0
[PASSAGE] Second passage...              // index 1
[HEADER] Answer based on both passages   // index 2
What did you learn?                      // index 3
```

**Navigation Flow**:

1. `currentIndex = 0` → First passage → "Continue"
2. `currentIndex = 1` → Second passage → "Continue"
3. `currentIndex = 2` → Header+Question pair
4. Submit quiz

## Error Prevention & Edge Cases

### Bounds Checking

```typescript
if (currentIndex < 0 || currentIndex >= questionItems.length) {
  return null; // Prevent array access errors
}
```

### Orphaned Item Handling

```typescript
if (currentItem.type === "header" && !nextQuestionExists) {
  // Display header content only, no answer collection
  return renderOrphanedHeader();
}
```

### Empty Arrays

```typescript
if (questionItems.length === 0) {
  return renderNoQuestionsError();
}
```

## Implementation Checklist

When working with currentIndex:

✅ **Always use QuestionProcessor methods** for navigation  
✅ **Separate display logic from answer logic**  
✅ **Check bounds before array access**  
✅ **Handle edge cases (orphaned items, empty arrays)**  
✅ **Use descriptive variable names** (currentIndex vs questionNumber)  
✅ **Test with mixed content types**  
✅ **Validate CSV structure during import**

This architecture ensures that complex CSV formats with mixed content types work seamlessly while maintaining intuitive navigation for users.
