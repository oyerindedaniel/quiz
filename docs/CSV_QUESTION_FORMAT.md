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

## Text Formatting Features

### Underlined Text Support

Use `**text**` to create underlined text in the quiz interface:

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,The **intelligent** boy won the scholarship,quick,clever,kind,selfish,B,12
SS2_ENG,Choose the **correct** answer from the options,option A,option B,option C,option D,C,13
```

**Renders as:**

- "The <u>intelligent</u> boy won the scholarship"
- "Choose the <u>correct</u> answer from the options"

**Usage Guidelines:**

- Works in Question Text, Options A-D, Headers, and Passages
- Highlights key terms, target words for synonym/antonym questions
- Emphasizes important concepts in instructions
- Use sparingly for maximum impact

## Basic Example (Regular Questions)

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_MATH,What is 2 + 2?,3,4,5,6,B,1
SS2_MATH,Solve: x + 5 = 10,x = 3,x = 5,x = 10,x = 15,B,2
SS2_ENG,What is a **noun**?,A verb,A person place or thing,An action,A description,B,1
```

## Special Content Types (for English/Literature)

### 1. Passage Blocks

For comprehension passages that apply to multiple questions:

**Format**: Start Question Text with `[PASSAGE]`

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"[PASSAGE] PASSAGE 1
Read the following passage carefully and answer the questions that follow by choosing the most appropriate of the options lettered A-E

There was once a terrible **famine** in the land of the animals. Food and money were **scarce**. Hunger made all the creatures very weak...",,,,,,
SS2_ENG,By giving the advice he gave the elephant was a _____ animal.,cunning,great,smart,wise,E,1
SS2_ENG,The passage is mainly _____ in form.,Argumentative,descriptive,narrative,persuasive,C,2
```

### 2. Section Headers

For bold section instructions that pair with the next question:

**Format**: Start Question Text with `[HEADER]`

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,[HEADER] Complete each of the following questions with the most **appropriate** option,,,,,,
SS2_ENG,Don't argue with your mother it is a sign of _____,disrespect,irrespect,misrespect,unrespect,A,11
SS2_ENG,Crude oil is sold to other countries in containers called _____,barrels,bottles,drums,tanks,A,12
```

### 3. Image Blocks

For visual content that pairs with the next question:

**Format**: Start Question Text with `[IMAGE]`

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_MATH,"[IMAGE] position:up
https://example.com/images/math-diagram.png",,,,,,
SS2_MATH,Based on the diagram above what is the value of angle X?,45°,60°,90°,120°,C,5
SS2_SCI,"[IMAGE] position:down
https://example.com/images/cell-structure.jpg",,,,,,
SS2_SCI,The structure shown below is found in which type of cell?,Plant cells only,Animal cells only,Both plant and animal cells,Neither plant nor animal cells,A,8
```

**Image Positioning:**

- **position:up** - Image displays above the question text
- **position:down** - Image displays below the question text
- Image URL should be a valid external link (HTTP/HTTPS)
- Images are paired with the immediately following question
- Both image and question appear on the same navigation page

### 4. Navigation Grouping Logic

**How Questions Are Grouped in UI:**

- **PASSAGE**: Standalone navigation page (has enough content)
- **HEADER + Next Question**: Paired together on same navigation page
- **IMAGE + Next Question**: Paired together on same navigation page (image positioned above/below)
- **Regular Questions**: Individual navigation pages
- **Questions After Header/Image**: Individual navigation (only first question after header/image is paired)

**Example Navigation Flow:**

```
Page 1: [PASSAGE] + passage content only
Page 2: Question 1 about passage
Page 3: Question 2 about passage
Page 4: [HEADER] + Question 11 together
Page 5: [IMAGE] + Question 12 together (image positioned as specified)
Page 6: Question 13 alone
```

## CSV Formatting Rules

### Text Escaping

- **Quoted Fields**: Wrap fields containing commas, quotes, or line breaks in double quotes
- **Embedded Quotes**: Use double quotes to escape quotes within quoted fields

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"What does ""Hello, **world**!"" demonstrate?",A greeting,A program,A quote,An example,D,5
```

### Multi-line Content

For passages, images, or long questions with line breaks:

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_ENG,"[PASSAGE] PASSAGE 1
Read the following passage carefully...

There was once a terrible **famine** in the land...",,,,,,
SS2_MATH,"[IMAGE] position:up
https://example.com/images/geometry-problem.png",,,,,,
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
- **[IMAGE] Content**: Must include `position:up` or `position:down` and valid image URL
- **Underline Support**: Use `**text**` for underlined words

**Options A-D**

- **Regular Questions**: Max 200 characters each, all required
- **[PASSAGE] Rows**: Leave empty (all 4 columns)
- **[HEADER] Rows**: Leave empty (all 4 columns)
- **[IMAGE] Rows**: Leave empty (all 4 columns)
- **Underline Support**: Use `**text**` for underlined words in options

**Correct Answer**

- **Regular Questions**: Must be exactly `A`, `B`, `C`, or `D`
- **[PASSAGE] Rows**: Leave empty
- **[HEADER] Rows**: Leave empty
- **[IMAGE] Rows**: Leave empty

**Question Order**

- **Regular Questions**: Optional positive number for custom ordering
- **[PASSAGE] Rows**: **Must be empty** (not a question)
- **[HEADER] Rows**: **Must be empty** (not a question)
- **[IMAGE] Rows**: **Must be empty** (not a question)

## Complete Example with Images

```csv
Subject Code,Question Text,Option A,Option B,Option C,Option D,Correct Answer,Question Order
SS2_MATH,[HEADER] **MATHEMATICS** MOCK EXAMINATION,,,,,,
SS2_MATH,"[IMAGE] position:up
https://example.com/images/triangle-abc.png",,,,,,
SS2_MATH,In triangle ABC shown above what is the measure of angle C?,30°,45°,60°,90°,C,1
SS2_SCI,"[IMAGE] position:down
https://example.com/images/photosynthesis-diagram.jpg",,,,,,
SS2_SCI,The process illustrated below converts light energy into which form?,Chemical energy,Thermal energy,Mechanical energy,Electrical energy,A,5
SS2_ENG,The word **'brilliant'** means _____,dull,bright,dark,heavy,B,10
```

## UI Display Logic

**Text Rendering:**

- `**text**` becomes `<u>text</u>` with proper underline styling
- Applies to all text fields: questions, options, headers, passages
- Uses Tailwind classes: `decoration-2 underline-offset-2`

**Navigation Pages:**

1. **PASSAGE Only**: Standalone page with passage content (underlines preserved)
2. **HEADER + Question**: Bold header with immediate next question on same page
3. **IMAGE + Question**: Image positioned above/below question on same page
4. **Regular Questions**: Individual pages

**Display Formatting:**

- **[PASSAGE] Content**: Regular text, larger font, indented paragraphs, underlines preserved
- **[HEADER] Content**: **Bold text**, prominent styling, appears above paired question
- **[IMAGE] Content**: Responsive image display with proper loading states, positioned as specified
- **Regular Questions**: Standard question formatting with underline support
- **Underlined Words**: Rendered with consistent underline styling

**Image Display:**

- Images are responsive and maintain aspect ratio
- Loading states with skeleton placeholders
- Error handling for broken/invalid URLs
- Proper accessibility with alt text support
- Position-aware rendering (above or below question)

## Import Process

1. Save questions as CSV file with proper encoding (UTF-8)
2. Use `**text**` syntax for words you want underlined in the UI
3. Use `[IMAGE] position:up|down` followed by image URL for visual content
4. Leave Question Order empty for `[PASSAGE]`, `[HEADER]`, and `[IMAGE]` rows
5. Run import command: `npm run import:csv`
6. App validates file structure and special delimiters
7. Creates missing subjects automatically
8. Preserves underline markers and image positioning for UI rendering
9. Groups questions based on navigation logic (passages standalone, headers/images paired)
10. Imports valid questions with grouping metadata
11. Shows success/error report
12. Syncs to remote database when online

## CSV Best Practices

- Use proper CSV editors (Excel, Google Sheets, LibreOffice Calc)
- Save with UTF-8 encoding to preserve special characters
- Use `**text**` sparingly for maximum visual impact
- Ensure image URLs are accessible and use HTTPS when possible
- Test image loading and positioning with small files first
- Keep backups of original CSV files
- Validate data before bulk import
- Ensure Question Order is empty for PASSAGE, HEADER, and IMAGE rows

This approach ensures headers and images are always paired with a question, while passages get their own navigation space, and underlined text provides visual emphasis for key terms and concepts.
