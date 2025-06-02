# CSV Question Import Format

## Required File Type

- **File Extension**: `.csv` (Comma Separated Values files only)
- **Encoding**: UTF-8 recommended for proper character support

## Column Structure (8 columns required)

| Column | Header Name    | Required | Example          |
| ------ | -------------- | -------- | ---------------- |
| A      | Subject Code   | Yes      | `SS2_MATH`       |
| B      | Question Text  | Yes      | `What is 2 + 2?` |
| C      | Option A       | Yes      | `3`              |
| D      | Option B       | Yes      | `4`              |
| E      | Option C       | Yes      | `5`              |
| F      | Option D       | Yes      | `6`              |
| G      | Correct Answer | Yes      | `B`              |
| H      | Question Order | No       | `1`              |

## Basic Example (Regular Questions)

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_MATH,What is 2 + 2?,3,4,5,6,B,1
SS2_MATH,Solve: x + 5 = 10,x = 3,x = 5,x = 10,x = 15,B,2
SS2_ENG,What is a noun?,A verb,A person place or thing,An action,A description,B,1
```

## Special Content Types (for English/Literature)

### 1. Passage Blocks

For comprehension passages that apply to multiple questions:

**Format**: Start Question Text with `[PASSAGE]`

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"[PASSAGE] PASSAGE 1
Read the following passage carefully and answer the questions that follow by choosing the most appropriate of the options lettered A-E

There was once a terrible famine in the land of the animals. Food and money were scarce. Hunger made all the creatures very weak...",,,,,,
SS2_ENG,By giving the advice he gave the elephant was a _____ animal.,cunning,great,smart,wise,E,1
SS2_ENG,The passage is mainly _____ in form.,Argumentative,descriptive,narrative,persuasive,C,2
```

### 2. Section Headers

For bold section instructions that pair with the next question:

**Format**: Start Question Text with `[HEADER]`

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,[HEADER] Complete each of the following questions with the most appropriate of the options lettered A-E,,,,,,
SS2_ENG,Don't argue with your mother it is a sign of _____,disrespect,irrespect,misrespect,unrespect,A,11
SS2_ENG,Crude oil is sold to other countries in containers called _____,barrels,bottles,drums,tanks,A,12
```

### 3. Navigation Grouping Logic

**How Questions Are Grouped in UI:**

- **PASSAGE**: Standalone navigation page (has enough content)
- **HEADER + Next Question**: Paired together on same navigation page
- **Regular Questions**: Individual navigation pages
- **Questions After Header**: Individual navigation (only first question after header is paired)

**Example Navigation Flow:**

```
Page 1: [PASSAGE] + passage content only
Page 2: Question 1 about passage
Page 3: Question 2 about passage
Page 4: [HEADER] + Question 11 together
Page 5: Question 12 alone
Page 6: Question 13 alone
```

## CSV Formatting Rules

### Text Escaping

- **Quoted Fields**: Wrap fields containing commas, quotes, or line breaks in double quotes
- **Embedded Quotes**: Use double quotes to escape quotes within quoted fields

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"What does ""Hello, world!"" demonstrate?",A greeting,A program,A quote,An example,D,5
```

### Multi-line Content

For passages or long questions with line breaks:

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"[PASSAGE] PASSAGE 1
Read the following passage carefully...

There was once a terrible famine...",,,,,,
```

## Data Rules

**Subject Code**

- Format: 3-6 letters + 2-4 numbers (e.g., `SS2_MATH`, `JSS3_ENG`)
- Creates new subject if doesn't exist
- Auto-generates readable subject name

**Question Text**

- **Regular Questions**: Max 1000 characters, cannot be empty
- **[PASSAGE] Content**: Max 5000 characters for long passages
- **[HEADER] Content**: Max 500 characters for section headers

**Options A-D**

- **Regular Questions**: Max 200 characters each, all required
- **[PASSAGE] Rows**: Leave empty (all 4 columns)
- **[HEADER] Rows**: Leave empty (all 4 columns)

**Correct Answer**

- **Regular Questions**: Must be exactly `A`, `B`, `C`, or `D`
- **[PASSAGE] Rows**: Leave empty
- **[HEADER] Rows**: Leave empty

**Question Order**

- **Regular Questions**: Optional positive number for custom ordering
- **[PASSAGE] Rows**: Leave empty (not a question)
- **[HEADER] Rows**: Leave empty (not a question)

## Complete English Example

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"[PASSAGE] PASSAGE 1
Read the following passage carefully and answer the questions that follow by choosing the most appropriate of the options lettered A-E

There was once a terrible famine in the land of the animals. Food and money were scarce. Hunger made all the creatures very weak...",,,,,,
SS2_ENG,By giving the advice he gave the elephant was a _____ animal.,cunning,great,smart,wise,E,1
SS2_ENG,The passage is mainly _____ in form.,Argumentative,descriptive,narrative,persuasive,C,2
SS2_ENG,A word that can replace 'assembled' as it is used in the passage is _____,arranged,combined,gathered,grouped,C,3
SS2_ENG,"[PASSAGE] PASSAGE II
Until the latter half of the nineteenth century, the Europeans knew little about the interior of Africa...",,,,,,
SS2_ENG,What many people think was the reason why Africa was unknown for a long time?,The Arab slave raiders were wicked,The Arabs enslaved many Africans,The natives were unfriendly to the Europeans,The Sahara Desert was too big,C,6
SS2_ENG,[HEADER] Complete each of the following questions with the most appropriate of the options lettered A-E,,,,,,
SS2_ENG,Don't argue with your mother it is a sign of _____,disrespect,irrespect,misrespect,unrespect,A,11
SS2_ENG,Crude oil is sold to other countries in containers called _____,barrels,bottles,drums,tanks,A,12
```

## UI Display Logic

**Navigation Pages:**

1. **PASSAGE Only**: Standalone page with passage content
2. **HEADER + Question**: Bold header with immediate next question on same page
3. **Regular Questions**: Individual pages

**Display Formatting:**

- **[PASSAGE] Content**: Regular text, larger font, indented paragraphs
- **[HEADER] Content**: **Bold text**, prominent styling, appears above paired question
- **Regular Questions**: Standard question formatting

## Import Process

1. Save questions as CSV file with proper encoding (UTF-8)
2. Run import command: `npm run import:csv`
3. App validates file structure and special delimiters
4. Creates missing subjects automatically
5. Groups questions based on navigation logic (passages standalone, headers paired)
6. Imports valid questions with grouping metadata
7. Shows success/error report
8. Syncs to remote database when online

## CSV Best Practices

- Use proper CSV editors (Excel, Google Sheets, LibreOffice Calc)
- Save with UTF-8 encoding to preserve special characters
- Test import with small files first
- Keep backups of original CSV files
- Validate data before bulk import

This approach ensures headers are always paired with a question, while passages get their own navigation space, providing an optimal quiz-taking experience.
