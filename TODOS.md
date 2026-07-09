# TODOS

## Mobile (Ohlo app)

### Lazy-load LXGW WenKai fonts (27MB) for zh users only
**Priority:** P2
Both TTFs load unconditionally at startup; English users pay 27MB install + startup cost. Two-phase useFonts keyed on profile.language, or subset the TTFs.

### iOS widget autonomous refresh
**Priority:** P2
WidgetKit timeline only re-reads App Group data; after midnight it shows yesterday's fact until the app opens (stale-date muted styling shipped as V1). V2: background URLSession fetch in the extension or BGTaskScheduler.

### rebalance-curiosity.ts writes don't scale past a small user base
**Priority:** P3
Reads are now paginated (`.range()`, fixed 2026-07-08 per /ship adversarial review — the prior unbounded SELECT risked silent truncation past the project's Supabase Max Rows setting). The write side is still one sequential `.update()` per changed persona instead of a batched `.upsert()`. Fine at current tester-scale; before real growth, batch the writes.

### Weekly rebalance job logs full UUID + weight maps to CI logs
**Priority:** P3
`scripts/rebalance-curiosity.ts`'s per-user `[OK]` log line prints the raw `user_id` and the full before/after `domain_weights` map to GitHub Actions logs every run — a behavioral profile in plaintext, subject to whatever Actions log retention/access the org has rather than the app's own access controls. Low urgency at current tiny tester count and private-repo Actions logs, but tighten before wider release: log only aggregate counts (updated/unchanged/failed), not per-user weight maps. Flagged by /ship adversarial review 2026-07-08.

### Weekly rebalance job can clobber a concurrent manual RadarScreen edit
**Priority:** P2
`scripts/rebalance-curiosity.ts` SELECTs all eligible personas' `domain_weights` once at job start (T0), then writes each user's nudged value later in a sequential loop (job can run for minutes). If a user opens RadarScreen and saves a manual weight edit between T0 and their turn in the loop, the job's later `.update()` — computed from the stale T0 snapshot + that week's event tallies, not the user's fresh edit — silently overwrites it. No error, no merge, no conflict surfaced. Narrow window (only while the job is actively running, ~weekly) and self-healing (user can re-save), so not blocking at current tester-scale. Real fix needs optimistic concurrency (compare-and-swap against `updated_at`, or a Postgres RPC doing an atomic jsonb merge against the live row instead of a client-computed full snapshot). Flagged by /ship red-team review 2026-07-08.

## Web (repositioned 2026-07-04: marketing/intro site only, no product features)

### Root-side coverage gaps
**Priority:** P3
feed-mix encode/decodeCursor, resume-parse heuristics, http.jsonError branches, generatePersonalizedHook retry path. Flagged by testing specialist.

## Data pipeline

### ~~Switch non-CS premium track from OpenAlex to OWID~~ DONE
Completed 2026-07-04: OWID ingest live (20 facts, 6 domains), OpenAlex reduced to Climate-only recipe (25 rows), 224 bad rows purged. See scripts/ingest-owid.ts, docs/data-sources-v2.md.

### Clean up stuck 'running' ingest_runs
**Priority:** P3
If the GitHub Actions runner is SIGKILLed (60min timeout), ingest_runs stays status='running' forever. Add pg_cron or scheduled function marking runs failed after 90min.

### dispatchNumber unicode contract
**Priority:** P4
TS uses charCodeAt (UTF-16), Swift uses UTF-8 bytes — identical for current ASCII factIds only. Add an ASCII assertion or switch TS to TextEncoder bytes.

## Cross-platform / Shared code

### Shared dispatchNumber utility for web + mobile
**Priority:** P3
The djb2 hash in `src/app/s/[id]/page.tsx` and `mobile/src/components/slipUtils.ts` is copy-duplicated — drift risk if either side diverges. Extract to a shared package or a canonical source (mobile) with a symlink/workspace reference.

### Share-landing hex tokens duplicated from DESIGN.md
**Priority:** P3
`src/app/s/[id]/page.tsx` and `src/components/MarketingPage.tsx` each define their own inline `C = {...}` token objects that duplicate DESIGN.md values. Extract a shared token source (`src/lib/tokens.ts`) so palette changes in DESIGN.md have a single code-side update point.

### Shared PaperRow type for web /s page + mobile paperService
**Priority:** P3
`PaperRow` is independently defined in `src/app/s/[id]/page.tsx` and in `mobile/src/lib/paperService.ts`. A drift in column selection (e.g. adding `metadata`) requires two edits. Extract to a shared type module.

## Completed

### Implicit curiosity learning from daily choices (第二层问卷)
**Completed:** v0.6.0.0 (2026-07-08). `src/lib/curiosity-rebalance.ts` (pure weighting + tallying, 22 tests), `scripts/rebalance-curiosity.ts` (weekly job, paginated), `.github/workflows/weekly-curiosity-rebalance.yml` (Sunday 21:00 UTC cron), mobile-side `fact.domain` logging across all 5 event types + `domain_weights` sync in `personaService.ts`. Migration `20260326_007_curiosity_events.sql` applied to production; merged to `main` so the cron is live. Known follow-ups tracked above (P2/P3): weekly-job-vs-manual-edit race, per-user UUID+weights in CI logs, write-side batching.

### Set up a mobile test framework (vitest for mobile/)
**Completed:** 2026-07-05, commit 6de56d7 (test: bootstrap mobile vitest framework — 137 tests on the algorithm core). Extended 2026-07-07: added paperService.ts (domainsToCategories, pickDailyPaper determinism, paperToFact) and prompt.ts (buildWhyCarePrompt, cleanWhyCare) coverage. Now 13 test files / 242 tests passing (`npm test` in mobile/). Remaining untested: personaService.ts, watchSync.ts (network/native-module calls, not pure).

### Move goodvision key server-side before public release
**Completed:** 2026-07-05, commit a98fbe1 (feat: goodvision key moves server-side behind /api/llm). Production calls proxy through https://ohlo.app/api/llm authenticated by Supabase JWT; direct key use is DEV-only.

### Reposition web as the Ohlo marketing site (+ /s QR landing, /zh /en split)
**Completed:** v0.3.0.0 (2026-07-05)

### arXiv hook regeneration backfill + 40-char/no-dash sweep across all 396 rows
**Completed:** v0.3.0.0 (2026-07-05)

### Dual-track data source, Daily Dispatch design system, mobile app, watch, widgets, daily ingest workflow
**Completed:** v0.2.0.0 (2026-07-04)
