/**
 * Detect error pages, login walls, and empty content before sending to Gemini.
 * Returns a reason string if the content looks like an error page, null otherwise.
 */
export function isErrorPage(content: string): string | null {
  if (content.trim().length < 100) {
    return "content too short";
  }

  const head = content.slice(0, 500);

  const errorPatterns = [
    /\b404\b.*\b(not found|page|error)\b/i,
    /\bpage\s+not\s+found\b/i,
    /\b410\s+gone\b/i,
    /\b500\b.*\b(internal|server|error)\b/i,
    /\b403\b.*\b(forbidden|access denied)\b/i,
    /\baccess\s+denied\b/i,
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(head)) {
      return "error page detected";
    }
  }

  const loginPatterns = [
    /\bsign\s+in\s+to\s+(continue|view|access)\b/i,
    /\blog\s+in\s+to\s+(continue|view|access)\b/i,
    /\bcreate\s+an?\s+account\b/i,
  ];

  for (const pattern of loginPatterns) {
    if (pattern.test(content.slice(0, 1000))) {
      return "login wall detected";
    }
  }

  return null;
}
