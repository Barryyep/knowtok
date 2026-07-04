# Design System — Ohlo 「每日信笺 · The Daily Dispatch」

## Product Context
- **What this is:** Widget-first mobile app (iOS/Android/Apple Watch, Expo RN) delivering ONE personalized fun-fact per day from real sources (papers / Wikipedia).
- **Who it's for:** 泛好奇大众 — curious general public, NOT academics. The fact is social currency ("聊天冷场的 backup").
- **Memorable thing:** 每日仪式感 — "每天抬眼那一刻的小期待" + "我可以拿去讲给别人听"。
- **Project type:** Mobile app + home/lock-screen widgets + watch complication. Dark-first.

## Aesthetic Direction
- **Direction:** The Daily Dispatch(每日信笺)— a cream paper slip "mailed" onto a warm near-black desk each morning. Fortune-cookie slip × trading card × postage stamp. NOT a dark premium reader.
- **Decoration level:** intentional — the physicality of the slip (fold edge, stamp tilt) carries the personality; no gradients, no patterns.
- **Mood:** opening a small piece of mail at 8am — warm, delightful, screenshot-ready. First-3-seconds target: "Ooh — what'd I get today?" → involuntary smile → "I'm telling someone this."
- **Core inversion:** the whole category does dark-card-on-dark; our hero object is LIGHT paper on a dark desk. The chrome stays dark (dark-first honored); only the slip is cream.

## Typography
- **EN Hero (the fact):** Fraunces (Google Fonts, variable; use ~SemiBold, high optical size) — warm, editorial pull-quote with a wink.
- **ZH Hero (the fact):** 霞鹜文楷 LXGW WenKai (OFL; bundle common-glyph subset ~5-8MB or lazy-load; fallback Songti SC / Noto Serif SC — NEVER PingFang for the hero).
- **UI/Labels:** Instrument Sans (en) / system PingFang SC · Noto Sans SC (zh).
- **Dispatch № + source stamp + dates:** Space Mono — the "receipt/postmark" texture. `№ 1432`, `⌖ arXiv:2506.01847 ✓`, `THU · JUL 3`.
- **Loading:** expo-google-fonts (Fraunces, Instrument Sans, Space Mono); LXGW WenKai subset TTF in assets. Register all in `UIAppFonts` so WidgetKit widgets can use them (widgets read the app bundle).
- **Scale:** hero-fact 23/1.5 semibold (compact card 16/1.45) · why-care 13/1.6 · stamp/№ 11-13 mono · eyebrow 12 mono ls+2 · UI label 15 · tab 12.

## Color
- **Approach:** warm ink + riso duotone. NO navy, NO cool blue, NO purple, NO gradients.
- **The desk (dark ground):** `ink-900 #14110D` app bg · `ink-800 #1E1A14` nav/tab/elevated · `ink-line #2A251C` hairlines · `ink-text #EDE3D0` text on dark · `ink-muted #9A8D74` meta on dark.
- **The paper (hero slip):** `paper-0 #F3E9D6` card surface · `paper-edge #E4D6BC` bottom fold (4px border-bottom = the "it's paper" trick) · `para-ink #241E15` fact text · `para-soft #6B5E48` secondary on paper.
- **Accents (ink stamps — sparing, high impact):** `persimmon #EC4A24` dispatch №, primary button, share, premium seal · `marigold #F2A63B` RITUAL: date eyebrow, streak dots, "today arrived" · `postmark #1C5C63` source stamp (credibility = stamp of approval, not citation) · `mint #7FD1B0` verified ✓ only.
- **Semantic:** success mint · warning marigold · error persimmon · info postmark.

## Spacing & Layout
- **Base unit:** 4px. Scale: xs4 sm8 md16 lg24 xl32 2xl48.
- **Layout:** the slip is the single hero; №/date/source are stamp-sized marginalia around it. One sentence = the screen.
- **Radius:** slip 18 · widget 22 · buttons pill(999) · stamps 4.
- **Signature details:** source stamp always tilted -1.2° (hand-stamped feel); slip bottom fold edge always present; date eyebrow + 7 streak dots (filled marigold = done) live ABOVE the card, ~24px tall.

## Motion
- **Approach:** intentional, transform/opacity only (RN Animated / SwiftUI safe).
- **落信 (mail arrival):** translateY +10→0 + scale .98→1, 180ms ease-out, one light haptic.
- **Streak fill:** scale 1→1.15→1 marigold pop.
- **Durations:** micro 100 · short 180 · medium 300. Easing: enter ease-out, exit ease-in.

## Surfaces
- **Today screen:** dark desk; marigold date eyebrow + streak dots; cream slip (№, fact, dashed divider, 跟你有什么关系, source stamp); persimmon pill 换一条; dark tab bar (今日/历史/设置).
- **Widget (4×2 + lock):** cream slip look: № + date/streak line, 2-3 line fact (never truncate mid-clause), tiny source line. Lock-screen (monochrome): № + one clause, stamp-typeset.
- **Watch:** same hierarchy at complication scale: topic accent line, fact body, label footer.
- **Share card:** the card IS the share asset — screenshot-perfect: slip + № + source stamp + tiny `OHLO · DAILY DISPATCH` wordmark in the fold. Every shared card is a self-attributing growth unit.
- **Premium (会员/paper track):** "头等信笺" — 4px persimmon left seal-edge + small `FIRST CLASS` tag; free tier = plain slip. Richer stationery, never a crown.
- **Numbering:** every fact carries a global dispatch № (collectible framing).

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-03 | Initial system created (/design-consultation) | Synthesis of docs/design-research.md + bold-direction subagent + founder positioning (非学术/仪式感/社交弹药) |
| 2026-07-03 | Cream-slip-on-dark inversion adopted | Category differentiation + screenshot-as-share growth loop |
| 2026-07-03 | Space Grotesk → Instrument Sans for UI | Space Grotesk is the AI-tool convergence font |
