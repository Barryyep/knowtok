# TODOS

## Mobile (Ohlo app)

### Set up a mobile test framework (vitest or jest for mobile/)
**Priority:** P1
mobile/ has no test runner; crash-fix logic (storage.normalizeStoredFact), pickDailyPaper determinism, slipUtils dispatch/streak, personaTrack extractJson edge cases are all unprotected. Flagged by /ship coverage audit (35% gate override on 2026-07-04).

### Lazy-load LXGW WenKai fonts (27MB) for zh users only
**Priority:** P2
Both TTFs load unconditionally at startup; English users pay 27MB install + startup cost. Two-phase useFonts keyed on profile.language, or subset the TTFs.

### iOS widget autonomous refresh
**Priority:** P2
WidgetKit timeline only re-reads App Group data; after midnight it shows yesterday's fact until the app opens (stale-date muted styling shipped as V1). V2: background URLSession fetch in the extension or BGTaskScheduler.

### Move goodvision key server-side before public release
**Priority:** P1
EXPO_PUBLIC_GOODVISION_API_KEY ships in the JS bundle (extractable). Proxy whyCare/general-fact calls through a Next.js route authenticated by the Supabase JWT.


### Implicit curiosity learning from daily choices (第二层问卷)
**Priority:** P1
Founder principle: "选择多了也就知道了" — every in-app choice is a questionnaire answer. Log to the existing user_events table: 换一条 (soft veto of the shown domain), share (strong positive), source-link tap (depth interest). Weekly rebalance of curiosityDomains weights from event history, so the persona is a living curve, not an onboarding snapshot. Depends on: curiosity onboarding + domain routing (in flight 2026-07-04).

## Web (repositioned 2026-07-04: marketing/intro site only, no product features)

### Reposition web as the Ohlo marketing site
**Priority:** P1
Founder decision 2026-07-04: web is NOT a functional feed app anymore — it is the app's introduction page + QR share landing (/s/[id], built). Replace the feed homepage with a Daily Dispatch-styled product intro; retire/hide feed, saved, profile, onboarding routes. Feed API perf criticals are OBSOLETE (route retirement supersedes them).

### arXiv hook regeneration backfill (quality debt)
**Priority:** P1
DB sampling 2026-07-04: many of the 206 arXiv rows still carry pre-v5 hooks — exclamation marks, emotional tails (惊艳/改变体验), and at least one miscategorized row (audiobook paper under Your Food). OWID/OpenAlex rows are clean. Run scripts/backfill-paper-metadata.ts with hook rules v5 + META_HOOK_PATTERN guard over all arxiv rows; spot-check categories while at it.

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

## Completed

### Dual-track data source, Daily Dispatch design system, mobile app, watch, widgets, daily ingest workflow
**Completed:** v0.2.0.0 (2026-07-04)
