# Changelog

## v0.4.1.0 — 2026-07-05

### Changed
- **The gateway key left the app.** LLM calls now route through ohlo.app/api/llm authenticated by your Supabase session; the key lives only on the server, behind a model allowlist and a token cap. Local dev keeps the direct path. Removes an extractable credential ahead of any public release.

### Added
- **Mobile test framework.** 137 vitest tests now guard the algorithm core — quiz decision tree, need × have ranking, ISO week keying, storage normalization, taxonomy invariants, and the dispatch number (pinned so the web copy can't drift). CI runs them on every push.

## v0.4.0.0 — 2026-07-05

### Added
- **Selection algorithm V1 — the want × need × have overlap.** Every fact in the pool now carries AI-scored relevance (who it's for, what it's useful as, how fresh) and quality components; the daily pick ranks candidates within your rotated domain by life-relevance × quality instead of choosing at random. 换一条 hands you the next-best, not a reroll. Design: docs/algorithm-v1.md.
- **Wildcard day.** One hash-picked day each week serves the best fact from a domain you never selected — a single free shot outside your bubble; swapping returns straight to your own domains.
- **Behavior signals.** Viewing, swapping, flipping to the why-you side, sharing, and opening sources are now recorded, laying the groundwork for the radar that retunes itself weekly to what you actually read.
- **Watch refresh.** The watch app and all four complication families now speak the current dispatch language: muted №, the fact as hero, clean single-line source, both languages.

### Changed
- **ohlo.app is live.** Share-poster QR codes point at the real domain, and the site defaults to English (中文 is one toggle away and remembered).

### Fixed
- ISO week numbering no longer drifts by one in Friday-starting years (would have shifted 2027's wildcard days).

## v0.3.0.0 — 2026-07-05

### Added
- **Curiosity quiz onboarding.** Setup is now a disguised questionnaire: pick your language, answer everyday-trivia questions (every one accepts a free-text "other", classified by AI), open the cards that pull you in across six adaptive multi-select rounds, and finish with your name — optional and last. It ends with a personal curiosity radar instead of a form.
- **Adjustable curiosity radar.** Settings now shows all ten knowledge domains as draggable bars; your weights directly drive which domain each day's dispatch comes from (weighted rotation).
- **Flippable dispatch card.** The daily card flips over to 「寄给你的理由」— a full-face, personally written explanation of why this fact found you.
- **Share poster with QR code.** Sharing generates a designed dispatch poster; scanning its QR opens a web page showing that exact fact with a link to get Ohlo.
- **Three new content sources.** NASA APOD (daily astronomy), Wikidata evergreen superlatives (history/nature/space), and OWID Grapher trend facts (120 across six domains) join arXiv and OWID Insights — the content pool grew from 251 to ~400 cited facts, all wired into the daily ingest pipeline.
- **Dated postmark.** Each card carries a circular OHLO cancellation mark with the day's date; research facts always show their publish date on the source stamp.
- **Bilingual marketing site.** The web home is now a product introduction with a hover-scattering deck of real dispatches, app showcase compositions, and separate /zh and /en pages with automatic language routing.

### Changed
- **Renamed product from KnowTok to Ohlo.** Same product; new name. Updates app display name, bundle id (`com.knowtok.daily` → `com.ohlo.daily`), App Group, URL scheme, widget/watch target identifiers, storage key prefixes, and all user-facing copy across web + mobile. Historical entries below refer to the product by its former name.
- **Web repositioned as marketing site.** The feed, saved, profile, and web onboarding product surfaces now redirect home; the app is the product.
- **Widgets restructured.** Fact on top; below, the source stamp sits beside a 「寄给你的理由」 pill (small widgets keep just the pill). Dispatch № recedes, the stray fold-edge bar is gone, and nothing clips.
- **Shorter, cleaner facts.** Every fact is now at most 40 Chinese characters (100 English), with dashes banned pipeline-wide; all ~400 existing facts were rewritten to comply and 46 legacy hooks regenerated to the current voice.
- **Streak made legible.** The seven mystery dots became a plain 「连续 N 天」 label, shown only from day two.

### Fixed
- **Switching accounts no longer leaks the previous user's data** — profile, history, cards, and widget contents are wiped when a different account signs in, so new users correctly start at onboarding.
- **Switching language now regenerates the day's card** in the new language instead of keeping the old one.
- **A fact seen once never repeats** — repeat-avoidance memory grew from 14 to 500 facts.
- **Ingested history/nature/society facts are now actually served** — a routing guard previously skipped the content database for these domains entirely.
- **Radar sliders no longer waste hundreds of renders per second while dragging**, and re-running the quiz no longer drops a stored custom API key.
- **arXiv category corruption repaired deterministically** after an over-eager cleanup pass; category writes are now report-only outside the canonical mapping.
- Share-page links validate their protocol, AI-classified quiz weights are capped, and the sign-out wipe can no longer race a fast re-login.

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
