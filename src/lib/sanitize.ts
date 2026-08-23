/**
 * Input sanitization utilities.
 * Prevents XSS in user-generated content like messages, descriptions, and reviews.
 */

/**
 * Strip HTML tags and dangerous characters from user input.
 * Preserves basic formatting like newlines and spaces.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Sanitize user-generated text content for safe storage and display.
 * Removes HTML, trims whitespace, and collapses excessive spacing.
 */
export function sanitizeText(input: string, maxLength?: number): string {
  let cleaned = stripHtml(input);

  // Collapse multiple whitespace (but preserve single newlines)
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .join("\n");

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Validate that message content is safe to store.
 * Returns null if valid, or an error message if not.
 */
export function validateMessageContent(content: string): string | null {
  if (!content || typeof content !== "string") {
    return "Message content is required";
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return "Message cannot be empty";
  }

  if (trimmed.length > 5000) {
    return "Message is too long (max 5,000 characters)";
  }

  // Check for common XSS patterns
  const xssPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      return "Message contains invalid content";
    }
  }

  return null;
}

/**
 * Check if content contains a URL (for link detection).
 */
export function containsUrl(text: string): boolean {
  return /https?:\/\/[^\s]+/i.test(text);
}

/**
 * Escape HTML entities for safe embedding in HTML strings.
 * Use when generating HTML emails or notifications.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
