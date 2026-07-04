# KnowTok Daily — Design Research

**Date:** 2026-07-03  
**Status:** Research complete, ready for design-consultation pass

---

## 1. Comparable Apps — Per-App Takeaways

### Readwise (daily highlight review)

**What they do well:** Readwise's dark-marketing theme is the closest analogue to KnowTok's use case. A single piece of saved text is foregrounded each session, with all chrome stripped out.

**Concrete details:**
- Background: `#000000` (pure black), but document area stays lighter
- Primary text: `#F5F5F5`, body/secondary: `rgb(190, 201, 214)` (soft blue-gray), muted captions: `rgb(156, 159, 176)` (lavender-gray)
- Accent: `rgb(55, 110, 242)` (saturated blue — contrasts well against pure black)
- Sidebar/chrome: `rgb(40, 49, 59)` (dark charcoal)
- Typography: Inter, 58px/600 for display, 40px sections, 16px body, ~65-char line length
- Buttons: borderRadius 18px (pill), generous 8×18px padding
- "Brutally minimal" philosophy: no visible chrome during the reading moment
- Warm highlight palette (yellow `#FBDA83`, coral `#E4938E`, blue `#8DBBFF`) creates a paper-book feel without leaving the dark theme

**Reusable takeaways for KnowTok:**
- The "one thing per session" mental model maps perfectly — we need the same zero-chrome approach on the Today card
- Inter at heavier weights on dark is proven readable; worth loading over system default
- A warm secondary accent (amber/gold) layered on a cool dark base creates visual warmth without leaving the premium dark aesthetic
- Source attribution can be handled as a "citation strip" at bottom in muted lavender-gray — exactly what Readwise does with author/book metadata

---

### Duolingo (daily streak / habit mechanics)

**What they do well:** The strongest daily-ritual design in any consumer app. Every pixel exists to get you back tomorrow.

**Concrete details:**
- Colors: Green `#58CC02` (primary action/success), Orange `#ff9600` (streak/fire), Red `#ff4b4b` (urgency/missed), Yellow `#ffc800` (XP rewards)
- Font: proprietary "Feather" / "Feather Bold" — rounded sans with slightly childlike proportions
- Streak visualization: flame icon + large-number counter, daily calendar grid with filled circles (completed) vs empty circles (pending)
- Visual state escalation: flame animates faster as midnight approaches when streak is at risk
- Sessions capped at 3–5 minutes to minimize activation friction
- 3D-press button effect: thick bottom-border disappears on tap → tactile without native haptics
- Mascot carries emotional state (healthy / worried / celebrating) in notifications

**Reusable takeaways for KnowTok:**
- Weekly calendar row with filled/empty day-dots is a single-row component that takes ~24px height — low visual cost, high habit reinforcement
- Two-state streak: "today complete" (filled dot, amber) vs "pending" (outline dot, dim) is enough — no need for the full Duolingo complexity
- Evening urgency nudge is notification-layer, not UI-layer — the UI just needs the streak counter visible
- Orange/amber as the "ritual/streak" color is now culturally legible — worth adopting as our "today moment" accent

---

### Flighty (widget-first premium app)

**What they do well:** The best example of a dark, widget-first information app in the App Store. Single-screen card that reveals depth on swipe.

**Concrete details:**
- Core palette: Flighty Blue `#0A84FF` on deep-black `#0B0B0F`
- Widget structure: map (75% of screen) + card peeking from bottom → two swipes reveal full data layers
- 300+ airline icons: monochrome for dark, color for light — demonstrates systematic asset design
- Premium = more data layers, not a different visual language
- iOS 26 update adopted Liquid Glass — translucent navigation layer, content behind it

**Reusable takeaways for KnowTok:**
- "Peek and reveal" pattern works for our Today card: the top of the card visible in the widget/lock-screen, tap to reveal full fact + why-care + source
- Premium differentiation via data density (more layers, not different colors) — free gets the fact, premium gets the fact + real-time paper metadata + why-care + full citation
- Deep black (`#0B0B0F`) is visually distinct from our current `#0B0F1A` navy — our navy actually has better warmth and is less harsh
- Single strong accent color (not multiple) with a very dark base is their recipe

---

### Economist Espresso (daily briefing, premium mobile)

**What they do well:** The canonical "finishable daily brief" design — you always know where you are and when you're done. Ritual framing is built into the structure.

**Concrete details:**
- Design ethos: "minimal classicist" — copy presented amid vivid photos through "stately color-block panels"
- Navigation: swipe left-to-right, with a checklist-like progress tracker (dot or line)
- Five 1-minute bite-size reads + "The World in Brief" + daily Figure/Quote/Chart
- Premium = dark mode (light-mode is the free/default experience)
- Recent update refreshed the typeface specifically for reading comfort
- Rating: 5/5 for design, specifically praised for "no mislaid element"

**Reusable takeaways for KnowTok:**
- Color-block panel for the daily "hero moment" — a saturated stripe or block gives the Today card a sense of editorial weight
- The "Figure of the Day" / "Quote of the Day" pattern is exactly our structure — a single statement with provenance below it
- Progress through a finishable set (we have one fact, but history scrolls) creates completion satisfaction
- Premium = richer experience (dark mode access, more context) is a proven mobile monetization pattern
- Checklist-progress for multi-day streaks: a single row of 7 dots at card top signals "week complete"

---

### Blinkist (micro-learning cards)

**What they do well:** Dense content broken into scannable hierarchy without feeling busy. Progress indicators are load-bearing.

**Concrete details (inferred from app structure analysis):**
- Card structure: topic category pill → book title (hero) → key insight body → "Read more" CTA
- Progress bar across top of card (% of "blinks" consumed)
- Dark mode: deep background with card elevation via slight lightness increase (not border)
- Audio controls integrated into card without crowding — icon-only until tapped
- Typography: heavy weight for title (700+), medium for insight (400–500), light/muted for metadata

**Reusable takeaways for KnowTok:**
- Topic pill + hero text + body + metadata is our exact card structure — Blinkist proves this hierarchy is readable at mobile scale
- Progress indicator at top of card (thin, 2px) communicates "you're in a sequence" — useful for our history feed
- Elevation via background lightness (not border) is cleaner on dark: card bg slightly lighter than page bg, no border needed
- Audio controls as icon-only tap target — if we add TTS, this is the pattern

---

### DailyArt (one-per-day, art/culture)

**What they do well:** Closest structural analogue — exactly one piece of content per day, educational context below, historical archive horizontally. Widget-first.

**Concrete details:**
- Primary surface: full-bleed image (today's artwork) → title/artist overlay → story below
- Horizontal swipe = navigate to past days
- Category tags (e.g., "Impressionism," "Private collection") below story → deeper archive
- Widget: shows today's artwork thumbnail + title
- Light/dark widget variants

**Reusable takeaways for KnowTok:**
- The "horizontal swipe through past days" pattern is more natural than a list for a daily-drop app — our history screen could be a horizontal swipe (or at minimum, feel like a timeline)
- Date as primary navigation label: DailyArt shows the date as the page's identity, not the title
- Category tags as tappable chips for exploration is a pattern worth adding to history view
- Widgets use a thumbnail or dominant color extracted from the content — for us, that's the topic emoji + accent color

---

### Reeder / RSS reading apps (focused reading, dark)

**What they do well:** Best dark-mode reading typography in the App Store category. Multiple font options that all work on dark.

**Concrete details:**
- Font chooser: System, Rounded, Serif, Compact — four distinct reading voices
- Dark mode available per Apple HIG guidelines
- Minimal iconography, text-dominant layout
- Widget supports four font variants
- Gesture-driven (swipe to mark read, dismiss, archive)

**Reusable takeaways for KnowTok:**
- Offering a "Serif" reading mode for the fact text could be a premium toggle — serif on dark creates a journal/magazine feel (NYT, Economist vibe)
- Gesture layer (swipe left = older, swipe right = newer) is more native than buttons — already partially implemented in the current app
- Widget font choice matters: use a medium/semibold weight for the fact text so it reads at glance from a home screen

---

### Kwotes / Daily Quote widget apps (most direct comparables)

**What they do well:** The "one sentence per day" widget format. Kwotes specifically is praised for "minimalist, pure black or white background, elegant typography."

**Concrete details:**
- Kwotes: pure black OR pure white, single quote centered or left-aligned, author attribution in smaller muted text below
- No images, no distractions — type only
- Lock screen and home screen widget variants
- Lingo widget: dark + light themes, "Cool & Minimal" widget look, verified sources, topic pills

**Reusable takeaways for KnowTok:**
- The "verified source" badge next to the attribution line builds trust for knowledge apps — a small checkmark or "Verified" label on academic sources
- Pure-type widgets (no imagery) are cleaner for knowledge content than image backgrounds
- Lock-screen widget (small, 1-2 lines) should show the fact's opening clause only — tap to see full

---

## 2. Synthesized Design Direction for KnowTok Daily

This is specific enough to hand to an implementing agent. All values are for React Native / Expo.

### Palette

**Base (dark theme, primary):**
```
bg:           #0C1018   // slightly warmer than current #0B0F1A
card:         #131C2B   // card surface: +5 lightness vs bg
cardAlt:      #1A2438   // elevated card / modal surface
border:       #1E2D45   // subtle structural border
```

**Text:**
```
textPrimary:  #EDF1F7   // near-white, slightly blue-tinted (not pure white)
textBody:     #B8C4D8   // body/secondary — Readwise's blue-gray
textMuted:    #6A7A96   // metadata, captions, muted labels
```

**Accents — two-tone system:**
```
accentBlue:   #6B9BF8   // interactive, links, free tier (current app's #7C9EFF, slightly warmer)
accentAmber:  #E8AA4A   // ritual/today moment, premium tier, streak, date headers
accentAmberSoft: #2A1F0A  // amber pill background
```

**States:**
```
success:      #3ECF8E   // streak achieved, correct
danger:       #FF6B6B   // error, streak at risk (softer than current #FF7A7A)
premium:      #E8AA4A   // premium badge, paper-tier stripe
```

**Why this works:** The two-accent split (cool blue for interactive, warm amber for "today/ritual") is the key upgrade over the current single-accent system. Blue = system actions. Amber = the daily moment itself. This is the emotional difference between "an app" and "a ritual."

---

### Typography

**Font strategy for RN (Expo):**
- Install `expo-google-fonts` with `Inter` for English (or use `@expo-google-fonts/inter`)
- For Chinese: rely on system font (PingFang SC on iOS, Noto Sans SC on Android) — do NOT bundle a CJK font
- Set `fontFamily` conditionally: if language is 'en', use `Inter_500Medium` / `Inter_700Bold`; if 'zh', use undefined (system)

**Scale:**
```
factHero:     22sp / 700 / lineHeight 32   // main fact text (upgrade from current 19/500)
factBody:     16sp / 400 / lineHeight 26   // why-care body text
dateLabel:    12sp / 700 / letterSpacing 2 / UPPERCASE / amber  // "THURSDAY · JUL 3"
topicPill:    12sp / 600                   // category label
sectionLabel: 11sp / 600 / letterSpacing 1.5 / UPPERCASE / muted  // "SOURCE", "WHY THIS MATTERS"
sourceTitle:  13sp / 500 / lineHeight 19   // paper/article title
sourceLink:   12sp / 500                   // tappable link
widgetFact:   15sp / 600                   // widget fact text (heavier than current 15/400)
widgetMeta:   11sp / 500                   // widget source attribution
```

**Key change from current:** factText moves from 19/500 to 22/700. This makes the one-sentence fact command visual authority. The hero text is the product — it should feel like an editorial headline, not body copy.

---

### Card Design

**Upgraded card system (replaces current 1px-border flat card):**
```javascript
card: {
  backgroundColor: '#131C2B',
  borderRadius: 24,          // up from 20
  padding: 20,
  // Elevation via shadow (iOS) + elevation (Android)
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 8,
  // No border — shadow provides depth
}
```

**Premium paper cards — amber left-accent stripe:**
```javascript
cardPremium: {
  ...card,
  borderLeftWidth: 3,
  borderLeftColor: '#E8AA4A',
}
```

**Card internal structure (top → bottom):**
1. **Date + streak row** — `THURSDAY · JUL 3` (amber, 12/700/uppercase) + optional `· Day 7` streak dot sequence on right
2. **Topic pill** — `🧬 Molecular Biology` (blue pill, 12/600)
3. **Fact text** — 22/700, lineHeight 32, full white — 2–4 lines max, never truncated
4. **Divider** — 1px, `border` color, 20px vertical margin
5. **"Why this matters" section** — `WHY THIS MATTERS` label (11/600/uppercase/muted) + 2–3 lines body text (16/400/textBody)
6. **Divider**
7. **Source section** — `SOURCE` label (11/600/uppercase/muted) + paper title (13/500) + tappable `arXiv:2403.xxxxx →` link (12/500/accentBlue)

---

### Daily Ritual Moment

The moment the Today screen loads, the date header is the first visual anchor — not the app name. This is the same ritual framing as DailyArt, NYT Morning, Economist Espresso.

**Header hierarchy:**
```
[streak row — 7 dots, amber filled, dim empty, right-aligned]
THURSDAY · JULY 3                         ← amber, 12sp, 700, uppercase
Today's Insight  /  今日知识                ← textPrimary, 20sp, 700, left-aligned
```

**Streak dots component:**
- 7 circles, diameter 8px, gap 6px
- Completed: `accentAmber` filled circle
- Today (just completed): amber + glow ring (`accentAmber` at 30% opacity, radius 12px)
- Pending: `border` color outline only
- Render right-aligned in the date header row
- This component is 24px tall total, adds streak mechanic with zero cognitive overhead

**Loading state:** shimmer animation (not ActivityIndicator) — a pulsing gradient on the card shape. This preserves layout height and feels premium.

---

### Widget Layout (Android + iOS)

**Small widget (2×2):**
```
┌──────────────────────┐
│ 🧬 Molecular Bio     │  ← topic, 12sp, accentBlue
│                      │
│ Researchers found    │
│ that mitochondrial   │
│ DNA editing can...   │  ← fact, 14sp/600, textPrimary, 3 lines max
│                      │
│ arXiv · Jul 3        │  ← meta, 10sp, textMuted
└──────────────────────┘
```

**Medium widget (4×2):**
```
┌────────────────────────────────────────┐
│ JUL 3 · 2026              🔥 7         │  ← date amber, streak orange
│ 🧬 Molecular Biology                   │
│                                        │
│ Mitochondrial DNA editing can reverse  │
│ cellular aging markers in vitro...     │  ← 15sp/600, 2 lines
│                                        │
│ arXiv:2403.xxxxx → Read paper          │  ← 11sp, accentBlue
└────────────────────────────────────────┘
```

Widget bg: `#0C1018`, borderRadius: 24, padding: 16 — matches app exactly.

**iOS widget:** Lock Screen variant uses `widgetAccentedRenderingMode` — the topic emoji + single line of fact text only.

---

### Premium vs Free Visual Differentiation

| Element | Free tier | Premium tier |
|---|---|---|
| Card accent stripe | none | 3px amber left border |
| Fact source | Wikipedia/general KB | arXiv/Europe PMC paper |
| Source link | plain `textMuted` | tappable amber `→ Read paper` |
| Why-care section | absent or generic | personalized to job title |
| Topic pill color | blue | amber |
| Widget date line | date only | date + streak count |
| Lock screen widget | fact text only | fact + paper citation |

This is a visual system where premium feels editorially richer without requiring a "crown" icon or "Pro" badge. The amber accent is the premium signal.

---

### Motion / Micro-interactions

- **Card load-in:** `fade + translateY(+12px)`, 220ms ease-out — not a spring, too bouncy for knowledge content
- **Streak dot completion:** amber dot fills from left, 300ms, with a subtle scale 1.0→1.15→1.0 bounce
- **Tab navigation:** no slide animation — instant, like Reeder — knowledge app, not a social feed
- **Refresh button:** spin icon for 800ms while loading, then snap to new card
- **WhyCare reveal** (async LLM response): fade in from 0→1, 180ms — never layout-shifts the card

---

## 3. Skills Inventory

### Available design-related skills in `~/.claude/skills/gstack/`

| Skill | What it does | Fit for KnowTok |
|---|---|---|
| `design-consultation` | Creates a `DESIGN.md` design system from scratch: researches the landscape, proposes palette/typography/layout/spacing/motion, generates font+color preview. Interactive — asks clarifying questions. | **(a) YES — primary first step.** Feed it this research doc as context. Output is a complete `DESIGN.md` token system tuned for this RN app. |
| `design-review` | Live visual audit: takes screenshots of the running app, finds inconsistencies/hierarchy problems/AI-slop patterns, fixes them in source, commits atomically, re-verifies. Requires app running in simulator or on device. | **(b) YES — post-implementation polish.** Run after the design system is implemented. |
| `plan-design-review` | Reviews a plan or spec before implementation. Rates each design dimension 0–10, explains what would make it a 10, then rewrites the plan to get there. Interactive. | **(b) YES — plan review.** Run on the implementation plan produced by design-consultation, before writing any code. |
| `design-html` | Generates production-quality HTML/CSS using the Pretext framework. | **(c) NOT APPLICABLE.** Web-only. Does not produce React Native code. |
| `design-shotgun` | Generates multiple AI design variants as an HTML comparison board, collects structured feedback, iterates. | **(b) OPTIONAL.** Useful for exploring "what could the Today card look like" before locking the DESIGN.md. Can run before or alongside design-consultation. |
| `ios-design-review` | Connects to a real iPhone via StateServer, screenshots every screen, evaluates against Apple HIG + DESIGN.md, scores 0–10. Requires physical device with dev build installed. | **(b) YES — final hardware QA.** Run last, after simulator testing is done. Catches things the simulator misses (font rendering, safe areas, actual touch targets). |

---

### Recommended Sequence

**Prerequisites before starting:** ensure `docs/design-research.md` (this file) is committed and readable in the project root.

**Step 1 — `/design-consultation`**
- Purpose: produce `DESIGN.md` as the design source of truth
- Input: point it at this research doc + the current `src/theme.ts` + `src/components/FactCard.tsx`
- Expected output: `DESIGN.md` with full color token system, typography scale, component specs, spacing, motion guidelines — specific to Expo RN + bilingual (en/zh)
- Prerequisites: none beyond this research file

**Step 2 — `/plan-design-review`**
- Purpose: review the implementation plan (which screens to change, in what order) before any code is written
- Input: the DESIGN.md from Step 1 + a proposed list of changes
- Expected output: rated plan with fixes, ensuring no dimension is below a 7/10
- Prerequisites: DESIGN.md from Step 1

**Step 3 — Implement**
- Update `src/theme.ts` with new tokens
- Update `src/components/FactCard.tsx` with new card design
- Update `src/screens/TodayScreen.tsx` with date header + streak row
- Update `src/widgets/FactWidget.tsx` with medium/small variants
- Load Inter font via `expo-google-fonts`

**Step 4 — `/design-review`**
- Purpose: visual QA against the running app in simulator
- Prerequisites: `expo start` running, `DESIGN.md` in place
- Output: automatic fixes committed, before/after screenshots

**Step 5 — `/ios-design-review`**
- Purpose: hardware QA on real iPhone
- Prerequisites: dev build installed on physical iPhone (`eas build --profile development`), StateServer running
- Output: scored audit, automatic fixes for any issues found

**Optional (before Step 1) — `/design-shotgun`**
- Run if you want to explore visual variants before committing to a direction
- Input: "widget-first daily knowledge app, dark, bilingual, curious professionals"
- Output: 3–5 HTML mockup variants you can compare side by side

---

## Summary

**The core design problem:** Current app has a reasonable color foundation (`#0B0F1A` navy, `#7C9EFF` accent) but uses default RN system font with no custom type scale — that's the primary "ugly" signal. The fact card's 1px border reads as a generic list item, not an editorial card.

**The fix in three moves:**
1. Load Inter (English) + keep system (Chinese) → fact text from 19/500 to 22/700
2. Add amber as a second accent (`#E8AA4A`) for the date header, streak dots, and premium tier
3. Replace 1px border card with shadow-elevated card + optional premium amber stripe

**What makes it feel like a ritual:** amber date header (`THURSDAY · JUL 3`) + 7-dot streak row at top of Today screen. Two lines. Zero extra screens. Immediate sense of "this is my daily practice."
