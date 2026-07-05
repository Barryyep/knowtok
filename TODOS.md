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

### Reposition web as the Ohlo marketing site (+ /s QR landing, /zh /en split)
**Completed:** v0.3.0.0 (2026-07-05)

### arXiv hook regeneration backfill + 40-char/no-dash sweep across all 396 rows
**Completed:** v0.3.0.0 (2026-07-05)

### Dual-track data source, Daily Dispatch design system, mobile app, watch, widgets, daily ingest workflow
**Completed:** v0.2.0.0 (2026-07-04)
