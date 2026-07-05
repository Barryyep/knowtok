/**
 * relevance.ts — shared scoring module for algorithm-v1 A1.
 *
 * Exports:
 *   RELEVANCE_SCHEMA      — TypeScript type for per-row relevance metadata
 *   RelevanceRecord       — stored shape (schema + structure + scored_at)
 *   scoreStructure()      — 0-1 regex score from hook text
 *   generateRelevance()   — batched LLM scorer (≤20 rows per call)
 *
 * All raw components are stored separately so formula tweaks (docs/algorithm-v1.md
 * §1.2) never require re-backfill.
 */

import OpenAI from "openai";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RelevanceContext = "professional" | "student" | "homemaker" | "parent";
export type RelevanceUtility = "conversation" | "decision" | "self";
export type RelevanceTimeliness = "evergreen" | "recent" | "breaking";

/**
 * RELEVANCE_SCHEMA — the per-row relevance metadata shape.
 *   contexts:     which audience segments find this useful (subset of the 4 personas)
 *   utility:      "conversation" = talking-point trivia
 *                 "decision"     = actionable, helps you decide something
 *                 "self"         = self-understanding / introspection
 *   timeliness:   "evergreen" | "recent" | "breaking"
 *   hook_strength: 停下来指数 — would this stop a scrolling thumb, 0-1
 *                  deadpan calibration: 0.9+ is genuinely rare.
 */
export type RELEVANCE_SCHEMA = {
  contexts: RelevanceContext[];
  utility: RelevanceUtility;
  timeliness: RelevanceTimeliness;
  hook_strength: number;
};

/**
 * RelevanceRecord — what gets written to metadata.relevance.
 * Extends the LLM-generated schema with the regex-derived structure score
 * and a scored_at timestamp.
 */
export type RelevanceRecord = RELEVANCE_SCHEMA & {
  structure: number;   // from scoreStructure() — 0, 0.5, or 1
  scored_at: string;  // ISO timestamp
};

// ── Fallback ──────────────────────────────────────────────────────────────────

export const FALLBACK_RELEVANCE: RELEVANCE_SCHEMA = {
  contexts: [],
  utility: "self",
  timeliness: "evergreen",
  hook_strength: 0.5,
};

// ── scoreStructure ─────────────────────────────────────────────────────────────

/**
 * scoreStructure — 0-1 from regex signals in hook text.
 *   +0.5 if hook contains any digit
 *   +0.5 if hook contains a comparative pattern (更|vs|than|compared|倍|%)
 *   capped at 1
 */
export function scoreStructure(
  hookEn: string | null | undefined,
  hookZh: string | null | undefined,
): number {
  const text = `${hookEn ?? ""} ${hookZh ?? ""}`;
  let score = 0;
  if (/\d/.test(text)) score += 0.5;
  if (/更|vs\.?|than|compared|倍|%/.test(text)) score += 0.5;
  return Math.min(score, 1);
}

// ── generateRelevance ─────────────────────────────────────────────────────────

export type RelevanceInputRow = {
  id: string;
  title: string;
  hook_summary_en: string | null | undefined;
  hook_summary_zh: string | null | undefined;
};

/**
 * generateRelevance — batched LLM scorer, ≤20 rows per call.
 *
 * Returns a Map<rowId, RELEVANCE_SCHEMA>. Per-row fallback on any parse or
 * per-item failure: { contexts:[], utility:"self", timeliness:"evergreen", hook_strength:0.5 }.
 *
 * @param rows          Rows to score (can be any length; internally batched by 20)
 * @param openaiClient  OpenAI client instance
 * @param model         OpenAI model string (e.g. "gpt-4o-mini")
 * @param opts.timelinessHint  Optional source-level timeliness suggestion for the prompt
 */
export async function generateRelevance(
  rows: RelevanceInputRow[],
  openaiClient: OpenAI,
  model: string,
  opts?: { timelinessHint?: RelevanceTimeliness },
): Promise<Map<string, RELEVANCE_SCHEMA>> {
  const BATCH_SIZE = 20;
  const result = new Map<string, RELEVANCE_SCHEMA>();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const items = batch.map((r, batchIdx) => ({
      batchIdx,
      id: r.id,
      title: (r.title ?? "").slice(0, 150),
      hook_en: (r.hook_summary_en ?? "").slice(0, 150),
      hook_zh: (r.hook_summary_zh ?? "").slice(0, 80),
    }));

    const timelinessNote = opts?.timelinessHint
      ? `\nNote: content from this source tends to be "${opts.timelinessHint}" in timeliness — use your judgment but lean toward this default.`
      : "";

    try {
      const completion = await openaiClient.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You score content relevance for a general-audience scroll feed. Output JSON only.",
          },
          {
            role: "user",
            content: [
              `Score each item for relevance metadata. Return JSON: {"results": [...]}`,
              ``,
              `Each result object must have:`,
              `  "idx": <batchIdx number>`,
              `  "contexts": array, subset of ["professional","student","homemaker","parent"]`,
              `    - professional: work, career, technical, finance, scientific`,
              `    - student: learning, discovery, science, education`,
              `    - homemaker: home, family, food, health, everyday life`,
              `    - parent: child health, education, family, safety`,
              `    Can be [] if truly niche. Can be multiple.`,
              `  "utility": "conversation" | "decision" | "self"`,
              `    - conversation: interesting talking point, trivia, water-cooler fact`,
              `    - decision: actionable, helps you make a choice or change behavior`,
              `    - self: self-understanding, introspection, who-am-I`,
              `  "timeliness": "evergreen" | "recent" | "breaking"`,
              `    - evergreen: timeless fact, valid for decades`,
              `    - recent: relevant now but ages within 1-2 years`,
              `    - breaking: very current, days/weeks`,
              `  "hook_strength": 停下来指数 — would this stop a scrolling thumb? 0-1 float.`,
              `    Calibrate deadpan:`,
              `      0.9+ = genuinely rare, world-changing, shocks almost everyone`,
              `      0.7-0.9 = surprising, most people would pause`,
              `      0.5-0.7 = moderately interesting`,
              `      0.3-0.5 = niche or limited appeal`,
              `      <0.3 = unlikely to stop anyone`,
              `    0.9+ should be rare — most items land 0.4-0.75.`,
              timelinessNote,
              ``,
              `Items (idx is the array position, use it as "idx" in results):`,
              ...items.map(
                (it) =>
                  `[${it.batchIdx}] title="${it.title}" hook_en="${it.hook_en}" hook_zh="${it.hook_zh}"`,
              ),
              ``,
              `Return exactly one result per item: {"results":[{"idx":0,"contexts":[...],"utility":"...","timeliness":"...","hook_strength":0.0},...]}`,
            ].join("\n"),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: {
        results?: Array<{
          idx: unknown;
          contexts?: unknown;
          utility?: unknown;
          timeliness?: unknown;
          hook_strength?: unknown;
        }>;
      };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        // Entire batch parse failure — use fallbacks
        for (const row of batch) {
          result.set(row.id, { ...FALLBACK_RELEVANCE });
        }
        continue;
      }

      const VALID_CONTEXTS = new Set<string>(["professional", "student", "homemaker", "parent"]);
      const VALID_UTILITY = new Set<string>(["conversation", "decision", "self"]);
      const VALID_TIMELINESS = new Set<string>(["evergreen", "recent", "breaking"]);

      for (const item of parsed.results ?? []) {
        const idx = typeof item.idx === "number" ? item.idx : -1;
        const row = batch[idx];
        if (!row) continue;

        const rawContexts = Array.isArray(item.contexts) ? item.contexts : [];
        const contexts = rawContexts
          .filter((c): c is string => typeof c === "string" && VALID_CONTEXTS.has(c))
          .map((c) => c as RelevanceContext);

        const utility =
          typeof item.utility === "string" && VALID_UTILITY.has(item.utility)
            ? (item.utility as RelevanceUtility)
            : FALLBACK_RELEVANCE.utility;

        const timeliness =
          typeof item.timeliness === "string" && VALID_TIMELINESS.has(item.timeliness)
            ? (item.timeliness as RelevanceTimeliness)
            : FALLBACK_RELEVANCE.timeliness;

        const rawStrength = item.hook_strength;
        const hook_strength =
          typeof rawStrength === "number" && Number.isFinite(rawStrength)
            ? Math.max(0, Math.min(1, rawStrength))
            : FALLBACK_RELEVANCE.hook_strength;

        result.set(row.id, { contexts, utility, timeliness, hook_strength });
      }

      // Fallback for any rows not returned by the LLM
      for (const row of batch) {
        if (!result.has(row.id)) {
          result.set(row.id, { ...FALLBACK_RELEVANCE });
        }
      }
    } catch {
      // Per-batch network/API failure — set fallback for all rows in this batch
      for (const row of batch) {
        result.set(row.id, { ...FALLBACK_RELEVANCE });
      }
    }
  }

  return result;
}
