# Content Data Sources — Evaluation & Recommendation

**Date:** 2026-07-03 · **Status:** Decision-ready
**Context:** KnowTok Daily shows one persona-tailored daily fact. Premium (会员) = professional real-time research; Free (普通) = broad general knowledge. Pipeline today: `scripts/ingest-papers.ts` → `src/lib/ingest.ts` → arXiv Atom API → LLM (`generatePaperMetadata`) generates en+zh hooks/summaries → Supabase `papers` table.

**Two grounding facts from our own codebase:**
1. Our zh content is **LLM-generated at ingest** from English source text — so native-Chinese source metadata is *not* a hard requirement for premium. It IS a requirement for free-tier *attribution links* (users must land on a page they can read).
2. arXiv has **no clinical medicine, law, culinary, or trades content** (q-bio ≈ 1.2% of volume, computational only). arXiv alone cannot serve 医生 / 律师 / 厨师 / 建筑工人 personas. This is the core gap.

## 1. Source comparison

| Source | Coverage | Freshness | Auth / rate limit | zh support | Attribution | Persona fit beyond CS | Ingest ease (Node/JSON) |
|---|---|---|---|---|---|---|---|
| **OpenAlex** | ~250M works, **all disciplines** (med, law, eng, food sci) | Live API continuous; free snapshot quarterly | None; 100k/day, 10/s; add `mailto=` | Good (`language` field; some zh-venue gaps) | DOI + landing URL | ★★★ best single source | ★★★ JSON, cursor paging; abstracts need inverted-index reconstruction |
| **Europe PMC** | ~48M biomed records; wraps PubMed **+ bioRxiv/medRxiv** + Agricola | PubMed daily, preprints continuous | None; 10 req/s | English-dominant (zh papers get EN titles) | DOI/PMID/PMCID + canonical URL | ★★★ doctors, nurses, pharma, public health | ★★★ JSON, `cursorMark` paging |
| **PubMed E-utilities** | >40M biomed citations, MeSH vocabulary | Daily | Free key: 10/s (3/s without) | English-only in practice | PMID/DOI | ★★★ health, precise MeSH targeting | ★★ `efetch` is **XML-only**; 10K search ceiling |
| **medRxiv / bioRxiv API** | ~61K / ~310K preprints; medRxiv categories map to clinical occupations (Nursing, Surgery, EM…) | Daily (~24–48h post-screening) | None; unpublished limits | English only | DOI (10.1101/…) + canonical URL | ★★ cutting-edge clinical | ★★★ JSON; paginate by **30**; restrictive licenses → paraphrase only |
| **Crossref** | ~180M DOI records, all disciplines | Real-time deposits | None; ~50/s polite pool w/ `mailto=` | Decent, publisher-dependent | DOI (authoritative) | ★★ metadata layer, uneven abstracts | ★★★ JSON, cursor deep paging |
| **Semantic Scholar** | ~214M papers, TLDRs/embeddings | Continuous; bulk weekly | Key required; **1 req/s** default | Weak | DOI + externalIds | ★★ | ★ live API too throttled; use bulk datasets |
| **CORE** | ~449M records, 49M **full texts** | Continuous | Key required; ~1 req/10s (strict) | Repo-dependent | DOI + repo links | ★★ | ★ use bulk dump only |
| **DOAJ** | OA journals only (curated) | Continuous | None; 2/s | Good tagging | DOI + links | ★ narrow | ★★ easy but shallow |
| **Wikipedia REST feed** (`/feed/featured`, `/feed/onthisday`) | Daily featured article, on-this-day, image of day | Daily; on-this-day evergreen | None; 200 req/min w/ descriptive User-Agent (mandatory) | **★★★ zh.wikipedia feed live-confirmed** (tfa + onthisday) | CC BY-SA + `content_urls` page link | ★★★ universal | ★★★ keyless JSON |
| **Wikipedia page summary** (`/page/summary/{title}`) | Any article → clean 1–2 sentence extract + thumbnail | On edit | Same as above | ★★★ en + zh subdomains | CC BY-SA + page link | ★★★ hydrate any occupation topic | ★★★ keyless JSON |
| **Wikidata (SPARQL)** | ~115M entities; occupation property `P106` | Continuous | None; 60s query-time/min | ★★★ multilingual labels (zh-hans/hant fallback) | **CC0** (no attribution required) | ★★★ "notable {occupation}" queries | ★★ SPARQL learning curve |
| **NASA ADS** | 15M astro/physics | Daily | Token; 5,000/day | No | bibcode/DOI | ★ astronomers only | ★★ |
| **GDELT DOC 2.0** | Global news, 65+ languages incl. zh | **15-min cycle** | None (be gentle ~1/s) | ★★ machine-translated queries, native links | Publisher URLs | ★★ freshness lane | ★★★ keyless JSON |
| **CourtListener v4** | US case law (incl. CAP corpus) | Continuous | Free token; 5/min baseline | English only | Public-domain opinions | ★★ lawyers (US-centric) | ★★ |
| **USDA FoodData Central** | 300K+ foods, nutrients | Periodic | Free data.gov key; 1,000/hr | English only | Public domain | ★★ chefs (nutrition facts) | ★★★ JSON |

**Ruled out:** NewsAPI (100 req/day free, non-commercial only, ~$449/mo paid, weak zh) — GDELT dominates it. Semantic Scholar / CORE / DOAJ as primaries — rate limits or scope too narrow vs OpenAlex, which supersets them for our need.

## 2. Recommendation

### Premium tier (会员) — "professional real-time research"

**arXiv (keep) + OpenAlex (add, primary breadth) + Europe PMC (add, health depth).**

- **Persona → source routing by concept mapping:**
  - CS/物理/数学/quant → **arXiv** (already built, best-in-class here)
  - 医生/护士/药剂师/health → **Europe PMC** (`resultType=core`, `sort_date:y`, `isOpenAccess:Y`; it already wraps medRxiv/bioRxiv so we get clinical preprints for free — skip separate medRxiv client for now)
  - 律师/厨师/建筑工人/everyone else → **OpenAlex** `filter=topics.id:...` or `concepts` mapped from `jobTitle` by the LLM once at onboarding (e.g. 建筑工人 → construction engineering, materials science, occupational safety topics)
- **Why not Crossref/PubMed directly:** OpenAlex already ingests Crossref and adds topics + OA links; Europe PMC avoids PubMed's XML-only `efetch` and 10K ceiling while keeping the same corpus. Fewer clients, same coverage.
- **Ops:** all three are free. Send `mailto=`/User-Agent everywhere. Rate limits (OpenAlex 10/s, EPMC 10/s) are far above our daily-cron needs — the existing `ARXIV_MIN_INTERVAL_MS` throttle pattern generalizes.
- **zh:** keep the existing LLM step generating `hook_summary_zh` / `plain_summary_zh` — no source dependency.
- **Attribution:** store DOI + landing URL in the existing `abs_url`/`pdf_url` slots; DOI link is the canonical citation.

### Free tier (普通) — "broad general knowledge, grounded"

**Wikipedia REST + Wikidata, LLM-tailored.** Do NOT burn research-API quota or LLM personalization depth on free users.

- Daily pull of `GET {en,zh}.wikipedia.org/api/rest_v1/feed/featured/YYYY/MM/DD` (tfa, on-this-day, image) — **zh feed is live-confirmed working**. On-this-day is evergreen: the free tier never runs dry.
- Occupation flavor: a small curated topic list per persona hydrated via `/page/summary/{title}` (works in zh natively), optionally a weekly Wikidata SPARQL "notable person with `P106` = user's occupation" fact.
- LLM writes the hook (reusing `generatePaperMetadata`-style prompt), but the **attribution link is the real Wikipedia page** (`content_urls.desktop.page`) — this grounds the fact and satisfies CC BY-SA attribution. Wikidata is CC0.
- Mandatory: descriptive `User-Agent` with contact email on all Wikimedia calls.

### Tier model

| | Free 普通 | Premium 会员 |
|---|---|---|
| Source | Wikipedia feed + summaries (+ Wikidata) | arXiv + OpenAlex + Europe PMC |
| Freshness | Daily featured / evergreen | Papers from the last 1–7 days |
| Personalization | Occupation-flavored topic pick + generic hook | Deep persona hook + "why this matters to you" impact |
| Attribution | Wikipedia page link (CC BY-SA) | DOI + journal/arXiv landing page |
| zh | Native zh.wikipedia content + links | LLM-translated hooks, EN source link |

This also gives a clean upsell line: free = "interesting fact near your world"; premium = "what was published in your field this week."

### Phased rollout

**Phase 1 (now, ~days):**
1. Decouple schema: rename/generalize `arxiv_id_base` → `source_id` (keep `source` column, add `('arxiv','openalex','epmc','wikipedia')`), migration in `supabase/migrations/`.
2. Add `src/lib/openalex.ts` mirroring `arxiv.ts` (JSON is simpler; reconstruct abstract from `abstract_inverted_index`); route non-CS personas to it via an LLM-generated `jobTitle → OpenAlex topic IDs` mapping stored on `user_personas`.
3. Add `src/lib/wikipedia.ts` for the free tier (featured feed + page summary, en+zh) with its own ingest lane.

**Phase 2 (next, ~1–2 weeks):** Europe PMC client for health personas (cursorMark pagination); expand `DOMAINS`/`HumanCategory` beyond the current 5 to cover law/food/construction; per-source ingest stats in `ingest_runs.log`.

**Phase 3 (later, on signal):** GDELT freshness lane for "in the news for your profession" (zh-capable); niche enrichers where engagement warrants — CourtListener (律师, US law), USDA FoodData Central (厨师); OpenAlex bulk snapshot for backfill if the live API pagination gets slow.

**Explicit non-goals:** Semantic Scholar, CORE, DOAJ, NASA ADS, NewsAPI — superseded or too narrow/throttled for our shape of product.
