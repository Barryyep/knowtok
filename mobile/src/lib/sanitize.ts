/**
 * Shared sanitizer for user-supplied free text before it enters any LLM prompt.
 * Pure functions — no side effects, no imports.
 */

export const SANITIZE_MAX_LENGTH = 120;

/**
 * Sanitize raw user text for safe inclusion in an LLM prompt.
 *
 * Rules (applied in order):
 * 1. Strip C0, DEL, and C1 control characters (newlines are covered here —
 *    newlines are a classic injection vector used to break out of instruction
 *    context).
 * 2. Collapse any remaining run of whitespace to a single ASCII space.
 * 3. Trim leading/trailing spaces.
 * 4. Hard-truncate to SANITIZE_MAX_LENGTH characters.
 *
 * Does NOT reject content — a genuine user answer that happens to contain
 * a flagged word (e.g. "computer systems") still passes through intact.
 */
export function sanitizeUserText(raw: string): string {
  if (typeof raw !== "string") return "";

  // 1. Strip control characters: C0 (0x00-0x1F), DEL (0x7F), C1 (0x80-0x9F).
  //    This removes newlines (\n \r), tabs (\t), and null bytes in one pass.
  // eslint-disable-next-line no-control-regex
  const noControl = raw.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");

  // 2. Collapse runs of whitespace (including any that survived step 1) to a
  //    single space.
  const collapsed = noControl.replace(/\s+/g, " ");

  // 3+4. Trim and hard-cap.
  return collapsed.trim().slice(0, SANITIZE_MAX_LENGTH);
}

/**
 * Heuristic detection of common prompt injection / jailbreak patterns.
 *
 * Returns true if the text looks like an injection attempt.
 *
 * IMPORTANT: this is for logging and telemetry ONLY. It must never be used
 * to silently drop or block user answers — false positives would eat
 * legitimate answers. Callers should process the text normally and merely
 * note the flag.
 */
export function looksLikeInjection(text: string): boolean {
  const patterns: RegExp[] = [
    /ignore\s+(the\s+|all\s+)?(previous|above)\s+instructions?/i,
    /system\s+prompt/i,
    /you\s+are\s+now/i,
    /disregard/i,
    /jailbreak/i,
    /act\s+as\b/i,
    /\{\{/,
    /```/,
    /\bassistant\s*:/i,
    /\bsystem\s*:/i,
    /\bhuman\s*:/i,
  ];
  return patterns.some((re) => re.test(text));
}
