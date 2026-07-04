import type { DailyFact } from "../lib/types";

/**
 * Deterministic global dispatch № for a fact, with no backend.
 * djb2 hash of source.factId → 1000 + (hash % 9000).
 *
 * The Swift widgets/watch mirror this exactly (djb2 over the UTF-8 bytes,
 * UInt32 wrapping arithmetic, same modulo) so every surface agrees. factIds
 * are ASCII (uuids / hex), for which charCodeAt == the UTF-8 byte.
 */
export function dispatchNumber(factId: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < factId.length; i += 1) {
    // h = h * 33 + c, wrapping at 2^32 (Math.imul matches Swift's &* / &+).
    h = (Math.imul(h, 33) + factId.charCodeAt(i)) >>> 0;
  }
  return 1000 + (h % 9000);
}

/** Zero-padded dispatch №, e.g. "№ 1432". */
export function formatDispatch(factId: string): string {
  return `№ ${dispatchNumber(factId)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local YYYY-MM-DD for a Date (matches how facts store their date). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Number of distinct fact-dates within the last 7 days (today included).
 * Drives the 7 streak dots in the date eyebrow. Capped at 7.
 */
export function streakCount(history: DailyFact[]): number {
  const window = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    window.add(localDateKey(new Date(now.getTime() - i * DAY_MS)));
  }
  const hit = new Set<string>();
  for (const f of history) {
    if (window.has(f.date)) hit.add(f.date);
  }
  return Math.min(hit.size, 7);
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Postmark-style date eyebrow from a YYYY-MM-DD string, e.g. "THU · JUL 3".
 * English abbreviations on both languages — it's a postmark, not prose.
 */
export function formatEyebrow(date: string): string {
  const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return date;
  const wd = new Date(y, m - 1, d).getDay();
  return `${WEEKDAYS[wd]} · ${MONTHS[m - 1]} ${d}`;
}
