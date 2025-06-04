import type { Question } from "../database/local-schema";
import type { QuestionItem, ProcessedQuizData } from "@/types/app";

export class QuestionProcessor {
  /**
   * Process raw questions from database into structured question items
   */
  static processQuestions(rawQuestions: Question[]): ProcessedQuizData {
    const questionItems: QuestionItem[] = [];
    const actualQuestions: QuestionItem[] = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const question = rawQuestions[i];
      const questionText = question.text.trim();

      if (questionText.startsWith("[PASSAGE]")) {
        const passageItem = this.createPassageItem(question);
        questionItems.push(passageItem);
      } else if (questionText.startsWith("[HEADER]")) {
        const headerItem = this.createHeaderItem(question);
        questionItems.push(headerItem);

        // Check if next question should be paired with this header
        const nextQuestion = rawQuestions[i + 1];
        if (
          nextQuestion &&
          !nextQuestion.text.startsWith("[PASSAGE]") &&
          !nextQuestion.text.startsWith("[HEADER]")
        ) {
          const pairedQuestionItem = this.createRegularQuestion(nextQuestion);
          questionItems.push(pairedQuestionItem);
          actualQuestions.push(pairedQuestionItem);
          i++; // Skip the next question since we processed it here
        }
      } else {
        // Regular question
        const questionItem = this.createRegularQuestion(question);
        questionItems.push(questionItem);
        actualQuestions.push(questionItem);
      }
    }

    return {
      questionItems,
      actualQuestions,
      totalQuestions: actualQuestions.length,
    };
  }

  /**
   * Create a passage item
   */
  private static createPassageItem(question: Question): QuestionItem {
    const content = question.text.replace(/^\[PASSAGE\]\s*/, "").trim();

    return {
      question,
      type: "passage",
      content: this.formatPassageContent(content),
    };
  }

  /**
   * Create a header item
   */
  private static createHeaderItem(question: Question): QuestionItem {
    const content = question.text.replace(/^\[HEADER\]\s*/, "").trim();

    return {
      question,
      type: "header",
      content,
    };
  }

  /**
   * Create a regular question item
   */
  private static createRegularQuestion(question: Question): QuestionItem {
    const options = this.parseOptions(question.options);

    return {
      question,
      type: "question",
      content: question.text.trim(),
      options,
      answer: question.answer,
    };
  }

  /**
   * Parse options from JSON string, handling empty options for special questions
   */
  private static parseOptions(optionsJson: string): string[] {
    try {
      const parsed = JSON.parse(optionsJson);
      return Array.isArray(parsed)
        ? parsed.filter((option) => option && option.trim())
        : [];
    } catch (error) {
      console.warn("Failed to parse question options:", optionsJson);
      return [];
    }
  }

  /**
   * Format passage content for better readability
   */
  private static formatPassageContent(content: string): string {
    return content
      .replace(/\r\n/g, "\n") // Normalize line breaks
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive line breaks to 2
      .trim();
  }

  /**
   * Find the question item that contains a specific question ID
   */
  static findQuestionItemById(
    questionItems: QuestionItem[],
    questionId: string
  ): QuestionItem | null {
    return (
      questionItems.find(
        (item) => item.question.id === questionId && item.type === "question"
      ) || null
    );
  }

  /**
   * Get the index of the next answerable question from current position
   */
  static getNextAnswerableQuestionIndex(
    questionItems: QuestionItem[],
    currentIndex: number
  ): number | null {
    for (let i = currentIndex + 1; i < questionItems.length; i++) {
      if (questionItems[i].type === "question") {
        return i;
      }
      // Skip to next question if current is header (header + question are paired)
      if (
        questionItems[i].type === "header" &&
        i + 1 < questionItems.length &&
        questionItems[i + 1].type === "question"
      ) {
        return i; // Return header index, component will handle pairing
      }
    }
    return null;
  }

  /**
   * Get the index of the previous answerable question from current position
   */
  static getPreviousAnswerableQuestionIndex(
    questionItems: QuestionItem[],
    currentIndex: number
  ): number | null {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (questionItems[i].type === "question") {
        // Check if this question is paired with a previous header
        if (i > 0 && questionItems[i - 1].type === "header") {
          return i - 1; // Return header index for paired display
        }
        return i;
      }
      if (questionItems[i].type === "passage") {
        return i;
      }
    }
    return null;
  }

  /**
   * Check if current item is the last answerable question
   */
  static isLastAnswerableQuestion(
    questionItems: QuestionItem[],
    currentIndex: number
  ): boolean {
    const nextAnswerableIndex = this.getNextAnswerableQuestionIndex(
      questionItems,
      currentIndex
    );
    return nextAnswerableIndex === null;
  }

  /**
   * Count answered questions from answers object
   */
  static countAnsweredQuestions(
    actualQuestions: QuestionItem[],
    answers: Record<string, string>
  ): number {
    return actualQuestions.filter(
      (item) => item.question.id in answers && answers[item.question.id]
    ).length;
  }

  /**
   * Get current question number for display (1-based)
   */
  static getCurrentQuestionNumber(
    questionItems: QuestionItem[],
    actualQuestions: QuestionItem[],
    currentIndex: number
  ): number {
    const currentItem = questionItems[currentIndex];
    if (!currentItem) return 1;

    if (currentItem.type === "question") {
      return (
        actualQuestions.findIndex(
          (q) => q.question.id === currentItem.question.id
        ) + 1
      );
    }

    // For header, find the paired question
    if (
      currentItem.type === "header" &&
      currentIndex + 1 < questionItems.length &&
      questionItems[currentIndex + 1].type === "question"
    ) {
      const pairedQuestion = questionItems[currentIndex + 1];
      return (
        actualQuestions.findIndex(
          (q) => q.question.id === pairedQuestion.question.id
        ) + 1
      );
    }

    return 1;
  }

  /**
   * Validate that the question structure makes sense
   */
  static validateQuestionStructure(questionItems: QuestionItem[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    for (let i = 0; i < questionItems.length; i++) {
      const item = questionItems[i];

      // Check for orphaned headers (header not followed by question)
      if (item.type === "header") {
        const nextItem = questionItems[i + 1];
        if (!nextItem || nextItem.type !== "question") {
          issues.push(`Header at index ${i} is not followed by a question`);
        }
      }

      // Check for questions with empty options (except paired ones)
      if (
        item.type === "question" &&
        (!item.options || item.options.length === 0)
      ) {
        const prevItem = questionItems[i - 1];
        if (!prevItem || prevItem.type !== "header") {
          issues.push(
            `Question at index ${i} has no options and is not paired with a header`
          );
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
