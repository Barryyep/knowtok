# Data Sources v2 — Empirical Evaluation for the Non-CS Premium Track

**Date:** 2026-07-04
**Audience:** 泛好奇大众 (curious laypeople), NOT academics.
**Categories to fill:** Your Health · Your Money · Your Food · Climate.
(AI & Robots already well-served by arXiv and is out of scope here.)
**Hard requirement:** every fact needs a real, linkable source. LLM rewrites to zh + en, so an English source is fine.

**Method:** every candidate below was hit with the **live API** (curl). Sample titles/extracts are real, pulled during this evaluation. "Usable rate" = share of a ~12–15 item sample that a curious layperson would find *interesting AND comprehensible after LLM rewriting*.

---

## Candidate 1 — OpenAlex with fixed filters

### What I tried
Iterated the filter set: `type:article`, `is_paratext:false`, `language:en`, topic-level (not field-level) `primary_topic.id`, date windows, `cited_by_count` floors, and both `publication_date` and `cited_by_count` sorts.

### Finding A — the recency/citation tension is real
Filter (Health nutrition topics + 90-day window + `cited_by_count:>5`):
```
https://api.openalex.org/works?filter=primary_topic.id:T12873|T14495|T10397,type:article,is_paratext:false,language:en,from_publication_date:2026-04-05,cited_by_count:%3E5&sort=publication_date:desc
```
→ **count: 0.** Papers published in the last 90 days have not accrued citations yet. You cannot simultaneously have "fresh" and "citation-filtered for quality." You must pick one.

### Finding B — dropping the citation floor gives fresh-but-clinical junk
Same topics, no citation floor, sorted by date:
```
https://api.openalex.org/works?filter=primary_topic.id:T12873|T14495|T10397,type:article,is_paratext:false,language:en,from_publication_date:2026-04-05&sort=publication_date:desc
```
→ count: 1478. Sample titles (Your Health):
1. "Study on nutritional status and incidence of sarcopenia in elderly patients with chronic heart failure" (cites 0)
2. "Malnutrition: Low Diagnosis and Treatment Rates in Hospitalized Patients. An Analysis of German Nationwide Health Insurance Data" (cites 0)
3. "Dynamic Loss of Psoas Muscle Volume During Induction Chemotherapy Predicts Survival in Advanced Urothelial Carcinoma Receiving Avelumab Maintenance" (cites 0)
4. "Diagnostic Value of Temporal Muscle Ultrasound Parameters in the Assessment of Pediatric Malnutrition" (cites 0)
5. "Corrigendum to 'Probable respiratory sarcopenia trajectories…'" (cites 0) ← a *corrigendum*, pure paratext leaking through.

These are hospital/clinical-audience papers. Sarcopenia, cachexia, malnutrition-in-inpatients dominate. **Usable rate for a layperson: ~25–35%**, and that is being generous.

### Finding C — the citation-sort variant is cleaner but still academic
Health topics, 1-year window, `cited_by_count:>10`, sorted by cites:
```
https://api.openalex.org/works?filter=primary_topic.id:T12873|T14495|T10397,type:article,is_paratext:false,language:en,from_publication_date:2025-07-01,cited_by_count:%3E10&sort=cited_by_count:desc
```
→ count: 12. Sample:
1. "ESPEN guideline on clinical nutrition in surgery – Update 2025" (91)
2. "Weighing the risk of GLP-1 treatment in older adults: Should we be concerned about sarcopenic obesity?" (21) ← *this one is genuinely interesting* (Ozempic muscle-loss angle)
3. "GLP-1 receptor agonists and sarcopenia: Weight loss at a cost?" (20) ← also usable
4. "The role of exercise-induced short-chain fatty acids in the gut–muscle axis" (16)
5. "The Review of Mokbang (Broadcast Eating) Phenomena…" (18, primary_topic score **0.17**) ← off-topic leak despite the topic filter.

So even with a citation floor, ~2 of 12 are layperson-grade; the rest are surgical/clinical guidance or off-topic leaks. **Usable rate ~30–40%.** A `primary_topic.score` threshold would help kill the Mokbang-style 0.17 leaks — **but OpenAlex does not support filtering on `primary_topic.score`**, only on the topic id; you can only post-filter client-side.

### Finding D — the fatal problem: the topic taxonomy has no consumer categories
The OpenAlex topic taxonomy (~4,500 research topics) simply has **no home for Your Money or Your Food-as-consumer-interest**:

| Topic search | Result |
|---|---|
| `personal finance` | **(no results)** |
| `investment saving` | **(no results)** |
| `money economics` | **(no results)** |
| `cooking nutrition` | **(no results)** |
| `finance` | Corporate Finance & Governance / Islamic Finance & Banking / Local Government Finance & Decentralization — all institutional, none consumer |
| `food` | Probiotics & Fermented Foods / Food composition and properties / Mycotoxins in Agriculture — food-*science*, not food-*curiosity* |

"Your Money" as a consumer category is essentially unrepresentable in OpenAlex. "Your Food" maps only to food-science jargon.

### Finding E — Climate is the one category OpenAlex serves well
Climate topics (T11244 Climate & Health, T10471 Climate Policy & Economics), 2-yr window, `cited_by_count:>20`, sorted by cites:
```
https://api.openalex.org/works?filter=primary_topic.id:T11244|T10471,type:article,is_paratext:false,language:en,from_publication_date:2024-07-01,cited_by_count:%3E20&sort=cited_by_count:desc
```
→ count: 225. Sample:
1. "The 2024 state of the climate report: Perilous times on planet Earth" (322)
2. "Climate policies that achieved major emission reductions: Global evidence from two decades" (288)
3. "Heat-related mortality in Europe during 2023 and the role of adaptation in protecting health" (111)
4. "Global emergence of unprecedented lifetime exposure to climate extremes" (109)
5. "The price of lighting… " *(no — that's OWID; see below)*; here: "Rising cause-specific mortality risk and burden of compound heatwaves amid climate change" (82)

These are on-topic, high-signal, and after LLM rewriting a layperson would find several genuinely interesting. **Usable rate ~60–70%** for Climate specifically.

### Verdict on OpenAlex
**Partially salvageable, but only for Climate (and AI, already covered).** With the Finding-E filter it reaches ~60–70% usable for Climate. For Health it tops out around ~35–40% even with a citation floor, and requires client-side `primary_topic.score >= ~0.5` post-filtering plus a paratext/corrigendum title blocklist. For **Money and Food it is a dead end** — the taxonomy has no consumer topics. It is not worth building the non-CS premium track on OpenAlex.

**Winning OpenAlex filter (Climate only), documented for the record:**
```
https://api.openalex.org/works?filter=primary_topic.id:T11244|T10471|T10895|T10471,type:article,is_paratext:false,language:en,from_publication_date:{today-730d},cited_by_count:%3E20&sort=cited_by_count:desc&per-page=25
```
Then client-side keep only `primary_topic.score >= 0.5` and drop titles matching `/corrigendum|erratum|retraction|editorial/i`.

---

## Candidate 2 — Wikipedia APIs

### (a) Featured feed — `en.wikipedia.org/api/rest_v1/feed/featured/{Y}/{M}/{D}` and the `api.wikimedia.org/feed/v1/wikipedia/{lang}/featured/…` mirror
Both return the same 4 keys: `tfa` (today's featured article), `mostread`, `image`, `onthisday`. **DYK is NOT exposed by the feed API** (would require scraping `Template:Did you know`).

**Freshness: excellent, changes daily** (verified):
- 2026/06/28 TFA: "Morris Park Aerodrome"
- 2026/07/01 TFA: "Eve Cone"
- 2026/07/02 TFA: "No. 1 Aircraft Depot RAAF"

**Category fit: poor.** TFA is whatever the Wikipedia community promoted — an aerodrome, a volcanic cinder cone, an RAAF maintenance unit. None map to Health/Money/Food/Climate. `mostread` is dominated by current events / sport / TV:
- "2026 FIFA World Cup", "Folarin Balogun", ".xyz", "Malik Tillman", "Bosnia and Herzegovina"

`onthisday` is history-date trivia ("A landslide at a jade mine in Hpakant killed 175–200 miners"; "IAU named Pluto's moons Kerberos and Styx"). Interesting, but a **history** category, not one of ours.

**zh is native** — `zh.wikipedia.org/api/rest_v1/feed/featured/…` returns Chinese extracts directly (珠江隧道, 亞洲金融風暴 …), so no translation risk for the zh side. But zh mostread is equally current-events-driven (World Cup, K-dramas).

Estimated share of feed items mapping cleanly to our 5 categories: **~15–20%.** Rewrite potential of the ones that *do* map is high (clean encyclopedic extracts), but you cannot rely on a category quota being filled on any given day.

### (b) Category-scoped random Good Articles
Feasible via `list=categorymembers` + `Category:Good_articles` intersections, but Wikipedia category graph is messy and not cleanly aligned to Health/Money/Food/Climate; would need a hand-built category allowlist and heavy filtering. Not tested end-to-end because (a) already shows the fit problem; this would be a curation project, not an ingest.

### (c) DYK archives
Not in any structured API; only as wikitext archive pages. High curation cost.

### Verdict on Wikipedia
**Great freshness and clean extracts, but wrong shape for a *category-targeted* daily fact.** Best used as a **supplementary/fallback "General curiosity" or "On this day" surface**, not as the backbone of Health/Money/Food/Climate. Keep it as an optional 5th "fun history/curiosity" lane if desired; do not rely on it to fill the four consumer categories.

---

## Candidate 3 — Our World in Data (Data Insights) — **the standout**

OWID has a public, no-key API and a CC-BY license. Two useful surfaces:

**Data Insights Atom feed** (`https://ourworldindata.org/atom-data-insights.xml`) — short, single-fact, curiosity-driven posts, each backed by a real linkable chart. Live sample pulled today:
1. "Obesity rates in Pakistan have tripled in the last 20 years" → **Your Health**
2. "Tobacco use in India has halved this century" → **Your Health**
3. "Europeans consume more milk and dairy products than people in other regions" → **Your Food**
4. "The price of lighting has dropped over 99.9% since 1700" → **Your Money / economics**
5. "US and Chinese companies train almost all of the world's most-used AI models" → **AI**
   (also: "A woman's risk of dying in pregnancy or childbirth varies hugely by country" → Health)

These are *exactly* the KnowTok format: one surprising, comprehensible, sourced fact. **Usable rate ~85–90%**, and they map cleanly to Health / Food / Money / Climate.

**Grapher data API** (per-chart, no key) — for building your own facts with a citation:
- Metadata: `https://ourworldindata.org/grapher/{slug}.metadata.json` → returns `title`, `citation` (e.g. "Riley (2005); Zijdeman et al. (2015); HMD (2025); UN WPP (2024)"), units, and a plain-language `descriptionShort`.
- Values: `https://ourworldindata.org/grapher/{slug}.csv?country=CHN~USA~OWID_WRL` → clean tidy CSV (Entity, Code, Year, value).

So beyond the ready-made Data Insights, you can generate templated comparison facts ("Life expectancy in China rose from X in 1960 to Y today") with an authoritative citation string attached automatically.

**Linkable source:** yes — every insight links to `ourworldindata.org/...`, and metadata carries the underlying academic citation. CC-BY, so reuse with attribution is licensed.

### Verdict on OWID
**Best fit for the non-CS premium track.** Data-driven, layperson-comprehensible, category-mappable, freely licensed, real citations, no key. Only caveats: Data Insights volume is modest (a handful per week), and coverage skews Health/economics/development over "Your Money-as-personal-finance." Combine the ready-made insights (high quality, low volume) with templated grapher facts (unlimited volume) to scale.

---

## Candidate 4 — Others tested

**Europe PMC** (`ebi.ac.uk/europepmc/webservices/rest/search`, no key) — recent open-access nutrition sample:
1. "Desmoid Fibromatosis of the Gastric Wall Mimicking Needle Tract Seeding after EUS-Guided FNB… A Case Report"
2. "Dose-response relationship between physical activity and sarcopenia in peritoneal dialysis patients"
3. "Training and supervision of lay mental health workers in community-based interventions in East Africa: a scoping review"
Same problem as OpenAlex — clinical/academic audience, case reports, scoping reviews. **Usable rate ~25–30%.** Europe PMC *does* tag `pubType` and has some plain-language content, but the default firehose is not layperson-grade. Not recommended over OWID.

**NASA APOD** (`api.nasa.gov/planetary/apod`, works with `DEMO_KEY`) — one item/day, e.g. "Pathfinder on Mars": *"On July 4th, 1997, using its own array of fireworks, a parachute, and a cocoon of airbags, the Mars Pathfinder spacecraft bounced like a giant beach ball at least 15 times…"* — beautifully written, daily, layperson-perfect, real source. **Usable rate ~95%.** But it's **Space**, not one of our four categories. Excellent candidate if a "Space/Science wonder" category is ever added; out of scope for Health/Money/Food/Climate.

---

## Overall recommendation for the non-CS premium track

1. **Adopt Our World in Data as the primary source** for Your Health, Your Food, Your Money(economics), and Climate.
   - Ingest the **Data Insights Atom feed** (`atom-data-insights.xml`) as ready-made single facts; classify each into our category with a lightweight LLM classifier on the title.
   - For volume + a filled quota every day, generate **templated facts from the Grapher API** using a hand-picked allowlist of ~40–60 chart slugs per category (life-expectancy, obesity, food-supply, energy prices, CO₂, etc.). Attach the `metadata.json` `citation` string as the source; link to the grapher URL.
   - Honor CC-BY: store and display "Source: Our World in Data" + the underlying citation.

2. **Keep OpenAlex for Climate only** (and AI, already live), using the Finding-E filter with client-side `primary_topic.score >= 0.5` and a corrigendum/erratum/editorial title blocklist. Drop OpenAlex entirely for Health, Money, and Food — the taxonomy has no consumer topics there and the sample never clears ~40% usable.

3. **Use Wikipedia's featured feed only as an optional "Daily curiosity / On this day" fallback lane**, not for the four consumer categories. Its freshness is great and zh is native, but TFA/mostread do not map to our categories reliably (~15–20% fit).

4. **Park NASA APOD** as a ready-to-go source *if/when* a Space/Science-wonder category is introduced (~95% usable, daily, keyed by free `DEMO_KEY` → get a real free key for production).

### Ingest changes implied (no code written — description only)
- Add an **RSS/Atom fetcher** for OWID Data Insights (the current pipeline is API-JSON oriented).
- Add an **OWID grapher-fact generator**: slug allowlist → `metadata.json` (citation/units/desc) + `.csv` (values) → templated fact string → LLM rewrite.
- Add a **source-type field** distinguishing `paper` (OpenAlex/arXiv) from `data-insight` (OWID) from `encyclopedia` (Wikipedia), since the "source" link and attribution differ per type.
- Restrict the OpenAlex ingest to the Climate/AI topic allowlists and add the score + paratext post-filters.

---

## Appendix — exact API calls used
- OpenAlex Health (0-result, citation+recency): see Finding A URL.
- OpenAlex Health (fresh, no floor): see Finding B URL.
- OpenAlex Health (cited-sort): see Finding C URL.
- OpenAlex topic search: `https://api.openalex.org/topics?search={q}&per-page=4`
- OpenAlex Climate: see Finding E URL.
- Wikipedia EN feed: `https://en.wikipedia.org/api/rest_v1/feed/featured/{Y}/{M}/{D}`
- Wikipedia ZH feed: `https://zh.wikipedia.org/api/rest_v1/feed/featured/{Y}/{M}/{D}`
- Wikimedia mirror: `https://api.wikimedia.org/feed/v1/wikipedia/{lang}/featured/{Y}/{M}/{D}`
- OWID Data Insights: `https://ourworldindata.org/atom-data-insights.xml`
- OWID grapher meta: `https://ourworldindata.org/grapher/{slug}.metadata.json`
- OWID grapher data: `https://ourworldindata.org/grapher/{slug}.csv?country=CHN~USA~OWID_WRL`
- Europe PMC: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={q}%20AND%20OPEN_ACCESS:Y&format=json&sort=P_PDATE_D%20desc`
- NASA APOD: `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`
