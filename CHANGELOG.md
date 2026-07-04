# Changelog

## v0.2.0.0 — 2026-07-04

KnowTok Daily: the widget-first mobile product.

### Added
- **Mobile app (Expo RN, iOS/Android/Watch)**: Supabase auth shared with web (email + Sign in with Apple; Google code-ready behind OAuth config), persona onboarding, Today/History/Settings tabs.
- **Dual-track daily facts**: persona-routed — real papers (arXiv + OpenAlex) for matched personas, Wikipedia-grounded general knowledge for everyone else; personalized "why you'd care" generated async so the card renders instantly.
- **Daily Dispatch design system** (DESIGN.md): cream slip on warm-dark desk, Fraunces / LXGW WenKai heroes, dispatch №, first-class seal for paper-track, source postmark; applied across app, home/lock widgets, Android widget, watch app + complications.
- **Share**: the slip captures to an image straight into the system share sheet.
- **Daily ingest pipeline** (GitHub Actions, 06:00 CST): arXiv + OpenAlex with bilingual hooks; hook prompt v5 (fact-first, deadpan, no formulaic openers) with a meta-phrase retry guard.
- **Data**: fresh Supabase project (knowtok-v2), 318 papers (206 arXiv + 112 OpenAlex), source_id generalization + unique index.

### Fixed
- 10 critical review findings pre-merge (persona-track fallback cache poisoning, background hooks losing user language, OpenAlex ids mislabelled as arXiv on Swift surfaces, ingest N+1, missing source_id on new upserts, widget config palette, stale-guard field, LLM error text persisted to user data, timing-unsafe secret compare, legacy cached facts crashing dispatch №).

### Notes
- Coverage gate overridden at 35% (mobile lacks a test framework — P1 TODO). Unit tests 96 → 110.
- Feed API performance criticals deferred to P1 TODO (web currently offline pending Vercel env update).
