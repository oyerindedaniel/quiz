import React from "react";

/**
 * Parse text content and render with underline support
 * Converts **text** to <u>text</u>
 */
export function parseTextWithUnderlines(text: string): React.ReactNode {
  if (!text || typeof text !== "string") {
    return text;
  }

  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Remove the ** markers and render as underlined
      const underlinedText = part.slice(2, -2);
      return React.createElement(
        "u",
        {
          key: index,
          className: "decoration-2 underline-offset-2",
        },
        underlinedText
      );
    }
    return part;
  });
}
