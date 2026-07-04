# TODOS

## Mobile (KnowTok Daily app)

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

## Web (Next.js feed)

### Fix feed API performance criticals
**Priority:** P1
(1) randomQuery pulls 500 full rows per request for in-memory shuffle — replace with bounded random sample. (2) firstLoad awaits up to 6 personalized-hook LLM calls before responding (p95 3-9s) — move into after() like the non-first-load path. Deferred from /ship 2026-07-04 (web currently offline pending Vercel env update).

### Root-side coverage gaps
**Priority:** P3
feed-mix encode/decodeCursor, resume-parse heuristics, http.jsonError branches, generatePersonalizedHook retry path. Flagged by testing specialist.

## Data pipeline

### Switch non-CS premium track from OpenAlex to OWID
**Priority:** P1
Empirical research (docs/data-sources-v2.md): OpenAlex unusable for Health/Money/Food (~35% usable; taxonomy lacks consumer topics); OWID Data Insights ~85-90% usable with real citations. Plan: purge 112 openalex rows, build OWID Atom + grapher ingest, keep OpenAlex for Climate+AI with topic-allowlist/score/paratext filters.

### Clean up stuck 'running' ingest_runs
**Priority:** P3
If the GitHub Actions runner is SIGKILLed (60min timeout), ingest_runs stays status='running' forever. Add pg_cron or scheduled function marking runs failed after 90min.

### dispatchNumber unicode contract
**Priority:** P4
TS uses charCodeAt (UTF-16), Swift uses UTF-8 bytes — identical for current ASCII factIds only. Add an ASCII assertion or switch TS to TextEncoder bytes.

## Completed

### Dual-track data source, Daily Dispatch design system, mobile app, watch, widgets, daily ingest workflow
**Completed:** v0.2.0.0 (2026-07-04)
