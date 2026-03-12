# KnowTok Worker

This service ingests recent arXiv papers, stores them in Supabase Postgres,
optionally enriches them with Semantic Scholar metadata, generates embeddings
with Zhipu, and precomputes a generic Chinese summary and hook for downstream
card delivery.

Quick start:

1. Copy `.env.example` to `.env`.
2. Create a virtualenv and install dependencies:
   `python3 -m venv .venv && . .venv/bin/activate && python -m pip install -e ".[dev]"`
3. Run one inline ingestion without Redis:
   `python scripts/run_pipeline.py --max-results 5`
4. Start a Celery worker when Redis is available:
   `celery -A app.celery_app.celery_app worker --loglevel=info`
5. Start the scheduler:
   `celery -A app.celery_app.celery_app beat --loglevel=info`

Environment notes:

- `DATABASE_URL` should point at the hosted Supabase Postgres instance.
- `REDIS_URL` is optional for manual inline runs; it is required for distributed Celery execution.
- Set `TASK_ALWAYS_EAGER=true` if you want `.delay()` calls to execute inline during local debugging.
- `SEMANTIC_SCHOLAR_API_KEY` is optional; without it, the enrichment step can still use anonymous requests.
- Semantic Scholar enrichment is best-effort and background-only; the main arXiv -> embedding -> summary path does not wait for it.

Important tasks:

- `app.tasks.pipeline.crawl_arxiv`
- `app.tasks.pipeline.enrich_paper_metadata`
- `app.tasks.pipeline.backfill_semantic_scholar`
- `app.tasks.pipeline.embed_paper`
- `app.tasks.pipeline.summarize_paper`
- `app.tasks.pipeline.generate_hook_cache`
- `app.tasks.pipeline.reconcile_paper_states`
