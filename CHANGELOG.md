# Changelog

## v0.6.0.0 — 2026-07-08

### Added
- **The app now learns from what you actually do, not just what you said once during onboarding.** 换一条, sharing a fact, and tapping through to the source are read as signal — a weekly job nudges your curiosity weights toward what you engage with, so your feed keeps adjusting on its own instead of staying frozen at whatever you picked on day one.
- **Usage analytics on the web site**, via Vercel Analytics.

### Fixed
- Behavior events (换一条, share, source-link tap) now record the stable topic id instead of the on-screen label text, so the same topic aggregates correctly whether you're reading in Chinese or English.
- Saving your profile no longer risks silently overwriting curiosity weights the weekly learning job just computed.
- A pre-existing type mismatch in two web feed tests is resolved.

## v0.5.0.0 — 2026-07-06

### Added
- **The content pool grows every day again.** A PubMed pipeline pulls high-impact journals daily (Nature Medicine, The Lancet, NEJM, Cell, PNAS, and more), restating one fact per article in our own words with the journal stamped and the DOI linked — the abstract is read and discarded, never stored. A per-journal cap keeps any single journal from dominating. Combined with the arXiv fix below, the pool went from ~410 to ~1300 facts.
- **The Today card flips to the source too.** The source stamp now lives on the back with the why-you line; the front is just the fact, its date postmark, and the flip hint.
- **The watch flips to the why-you line** on tap.
- **The site downloads the Android app directly** and its dispatch deck cascades vertically on touch devices.

### Changed
- **换一条 changes the topic.** A swap now rotates to a different curiosity domain (a swap means "not this today"), instead of the next fact in the same domain.
- **The Today card is calmer** — the dispatch № and the duplicate date are gone; the circular postmark is the card's identity.
- **The real Ohlo logo** replaces the placeholder across iOS, Android, and the watch.

### Fixed
- **arXiv daily was re-fetching the same papers every day** (it anchored its date window to nothing, so over holidays/weekends it kept returning the same top slice). It now tracks the newest paper it has per field and pulls everything since, so genuinely new research flows in daily.
- **The hidden face of a flipped card no longer eats taps** (source no longer fires from the front).
- **Returning users don't flash the onboarding screen**, and the widget/watch re-sync when the app comes to the foreground.

## v0.4.2.0 — 2026-07-05

### Added
- **One a day, held to it.** 换一条 is now capped at three swaps per day; after that the button becomes a quiet 「明天再来一封 · 好东西值得等」 note. The daily fact itself is always free — only deliberate rerolls count, and the counter resets at midnight.

### Changed
- **Free-text answers are hardened against prompt injection.** Quiz "other" input is sanitized (control characters stripped, newlines collapsed, capped at 120 characters) and passed to the classifier as clearly delimited data, never instructions, with the domain allowlist as a second line of defense.
- **The LLM backend is now swappable.** The server proxy selects its provider (goodvision, Anthropic direct, or OpenAI) from a single env value, so changing endpoints is configuration rather than code. Default behavior is unchanged.

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
