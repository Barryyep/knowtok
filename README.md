# KnowTok Web MVP

KnowTok is a web-first research feed built on arXiv + Supabase + OpenAI.

## What this MVP includes

- Next.js (App Router) web app in TypeScript
- Email/password auth with Supabase
- Onboarding gate: users must add at least one profile field or upload a resume
- Resume upload (PDF/DOCX, max 10MB) with text extraction
- Swipe-like card flow: Skip / Save / "What does this mean for me?"
- Personalized relevance insight generated on demand and cached per user/paper
- Daily paper ingestion pipeline from arXiv (`CS/Physics/Math`, 30 per domain)
- LLM-generated 1-line hook summary + 3-5 tags per ingested paper
- Supabase SQL migration with RLS and storage policies
- Vitest + Playwright test scaffolding

## Stack

- Next.js + React + TypeScript + Tailwind
- Supabase (Postgres/Auth/Storage)
- OpenAI API (server-side only)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

Fill all variables in `.env.local`.

3. Apply database migration in Supabase:

- File: `supabase/migrations/20260213_001_web_mvp_schema.sql`
- Run in Supabase SQL Editor, or via Supabase CLI migration flow.

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Manual ingest (local trigger)

Daily mode:

```bash
npm run ingest:papers -- --mode daily
```

Backfill mode (14 days example):

```bash
npm run ingest:papers -- --mode backfill --days 14
```

The run writes metrics to `public.ingest_runs`.

## API overview

- `GET /api/feed`
- `POST /api/papers/:paperId/save`
- `POST /api/papers/:paperId/skip`
- `POST /api/papers/:paperId/impact`
- `GET /api/papers/:paperId`
- `GET|PUT /api/profile`
- `POST /api/profile/resume`
- `GET /api/saved`
- `POST /api/ingest/run` (protected by `x-ingest-secret`)

## Testing

Unit tests:

```bash
npm run test:unit
```

E2E tests:

```bash
npm run test:e2e
```

## Security notes

- Keep `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` only in server env.
- Never expose service role or OpenAI keys to client-side code.
- If any API key was previously leaked, rotate it immediately.
