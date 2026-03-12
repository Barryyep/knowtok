from __future__ import annotations

import uuid

from celery import shared_task
from sqlalchemy import or_, select

from app.clients.arxiv import ArxivClient
from app.clients.db import SessionLocal
from app.clients.semantic_scholar import SemanticScholarClient
from app.clients.zhipu import ZhipuClient
from app.config.settings import get_settings
from app.models.paper import Paper
from app.services.content import build_embedding_input, ensure_safe_copy, payload_hash
from app.services.papers import (
    apply_semantic_scholar_enrichment,
    build_title_hash,
    create_audit_log,
    get_paper_by_id,
    mark_paper_pipeline_status,
    upsert_embedding,
    upsert_hook_cache,
    upsert_paper,
)


settings = get_settings()


def enqueue_or_run(task, *args, **kwargs):
    if settings.task_always_eager or not settings.redis_url:
        return task.apply(args=args, kwargs=kwargs)
    return task.delay(*args, **kwargs)


def enqueue_if_background_available(task, *args, **kwargs):
    if settings.redis_url and not settings.task_always_eager:
        return task.delay(*args, **kwargs)
    return None


@shared_task(name="app.tasks.pipeline.crawl_arxiv", autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def crawl_arxiv(max_results: int = 50) -> dict:
    client = ArxivClient()
    papers = client.fetch_recent_papers(max_results=max_results)
    queued_enrichment = 0
    queued_embedding = 0
    pending_ids: list[str] = []

    with SessionLocal() as session:
        for item in papers:
            paper, is_new = upsert_paper(
                session,
                {
                    "title": item.title,
                    "abstract": item.abstract,
                    "source": "arxiv",
                    "doi": item.doi,
                    "raw_url": item.raw_url,
                    "tags": item.tags,
                    "published_at": item.published_at,
                    "title_hash": build_title_hash(item.title),
                    "ingest_status": "processed",
                    "metadata_": item.metadata,
                },
            )
            create_audit_log(
                session,
                event_type="paper_ingested",
                entity_type="paper",
                entity_id=paper.id,
                provider="arxiv",
                model=None,
                payload_hash=payload_hash(item.raw_url),
                status="success",
                meta={"source": "arxiv", "tags": item.tags},
            )
            if is_new:
                pending_ids.append(str(paper.id))
                queued_enrichment += 1
        session.commit()

    for paper_id in pending_ids:
        enqueue_or_run(embed_paper, paper_id)
        queued_embedding += 1
        if enqueue_if_background_available(enrich_paper_metadata, paper_id) is not None:
            queued_enrichment += 1

    return {
        "fetched": len(papers),
        "queued_embedding": queued_embedding,
        "queued_enrichment": queued_enrichment,
    }


@shared_task(
    name="app.tasks.pipeline.enrich_paper_metadata",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    rate_limit="1/s",
)
def enrich_paper_metadata(paper_id: str) -> dict:
    client = SemanticScholarClient()
    with SessionLocal() as session:
        paper = _require_paper(session, paper_id)
        try:
            enriched, meta = client.fetch_metadata(doi=paper.doi, title=paper.title)
            if enriched is None:
                create_audit_log(
                    session,
                    event_type="semantic_scholar_enriched",
                    entity_type="paper",
                    entity_id=paper.id,
                    provider="semantic_scholar",
                    model=None,
                    payload_hash=meta["payload_hash"],
                    status="success",
                    meta={**meta, "matched": False},
                )
            else:
                apply_semantic_scholar_enrichment(
                    session,
                    paper=paper,
                    semantic_scholar_paper_id=enriched.paper_id,
                    citation_count=enriched.citation_count,
                    influential_citation_count=enriched.influential_citation_count,
                    venue=enriched.venue,
                    fields_of_study=enriched.fields_of_study,
                    open_access_pdf_url=enriched.open_access_pdf_url,
                    source_payload=enriched.source_payload,
                )
                create_audit_log(
                    session,
                    event_type="semantic_scholar_enriched",
                    entity_type="paper",
                    entity_id=paper.id,
                    provider="semantic_scholar",
                    model=None,
                    payload_hash=meta["payload_hash"],
                    status="success",
                    meta={
                        **meta,
                        "matched": True,
                        "citation_count": enriched.citation_count,
                        "influential_citation_count": enriched.influential_citation_count,
                    },
                )
            session.commit()
        except Exception as exc:
            create_audit_log(
                session,
                event_type="semantic_scholar_enriched",
                entity_type="paper",
                entity_id=paper.id,
                provider="semantic_scholar",
                model=None,
                payload_hash=payload_hash(str(paper.id)),
                status="failure",
                error_summary=str(exc)[:500],
            )
            session.commit()
    return {"paper_id": paper_id, "status": "completed"}


@shared_task(
    name="app.tasks.pipeline.backfill_semantic_scholar",
    rate_limit="1/s",
)
def backfill_semantic_scholar(limit: int | None = None) -> dict:
    batch_size = limit or settings.semantic_scholar_backfill_batch_size
    with SessionLocal() as session:
        paper_ids = list(
            session.scalars(
                select(Paper.id)
                .where(
                    or_(
                        Paper.semantic_scholar_paper_id.is_(None),
                        Paper.citation_count.is_(None),
                    )
                )
                .order_by(Paper.created_at.asc())
                .limit(batch_size)
            ).all()
        )

    processed = 0
    for paper_id in paper_ids:
        if settings.redis_url and not settings.task_always_eager:
            enrich_paper_metadata.delay(str(paper_id))
        else:
            enrich_paper_metadata.run(str(paper_id))
        processed += 1

    return {"selected": len(paper_ids), "processed": processed}


@shared_task(name="app.tasks.pipeline.embed_paper", autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def embed_paper(paper_id: str) -> dict:
    zhipu = ZhipuClient()
    with SessionLocal() as session:
        paper = _require_paper(session, paper_id)
        mark_paper_pipeline_status(session, paper=paper, embedding_status="processing")
        session.commit()

        try:
            text = build_embedding_input(paper.title, paper.abstract)
            embedding, meta = zhipu.create_embedding(text)
            upsert_embedding(session, paper.id, settings.embedding_model, embedding)
            mark_paper_pipeline_status(session, paper=paper, embedding_status="completed")
            create_audit_log(
                session,
                event_type="embedding_generated",
                entity_type="paper",
                entity_id=paper.id,
                provider="zhipu",
                model=settings.embedding_model,
                payload_hash=meta["payload_hash"],
                status="success",
                meta=meta,
            )
            session.commit()
        except Exception as exc:
            mark_paper_pipeline_status(session, paper=paper, embedding_status="failed")
            create_audit_log(
                session,
                event_type="embedding_generated",
                entity_type="paper",
                entity_id=paper.id,
                provider="zhipu",
                model=settings.embedding_model,
                payload_hash=payload_hash(str(paper.id)),
                status="failure",
                error_summary=str(exc)[:500],
            )
            session.commit()
            raise

    enqueue_or_run(summarize_paper, paper_id)
    return {"paper_id": paper_id, "status": "completed"}


@shared_task(name="app.tasks.pipeline.summarize_paper", autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def summarize_paper(paper_id: str) -> dict:
    zhipu = ZhipuClient()
    with SessionLocal() as session:
        paper = _require_paper(session, paper_id)
        mark_paper_pipeline_status(session, paper=paper, summary_status="processing")
        session.commit()

        try:
            content, meta = zhipu.create_summary_and_hook(paper.title, paper.abstract)
            plain_summary = content["plain_summary"].strip()
            hook_text = content["hook_text"].strip()
            ensure_safe_copy(plain_summary)
            ensure_safe_copy(hook_text)
            create_audit_log(
                session,
                event_type="summary_generated",
                entity_type="paper",
                entity_id=paper.id,
                provider="zhipu",
                model=settings.chat_model,
                payload_hash=meta["payload_hash"],
                status="success",
                meta=meta,
            )
            session.commit()
        except Exception as exc:
            mark_paper_pipeline_status(session, paper=paper, summary_status="failed")
            create_audit_log(
                session,
                event_type="summary_generated",
                entity_type="paper",
                entity_id=paper.id,
                provider="zhipu",
                model=settings.chat_model,
                payload_hash=payload_hash(str(paper.id)),
                status="failure",
                error_summary=str(exc)[:500],
            )
            session.commit()
            raise

    enqueue_or_run(
        generate_hook_cache,
        paper_id,
        plain_summary=plain_summary,
        hook_text=hook_text,
        confidence=float(content["confidence"]),
        source_refs=content["source_refs"],
    )
    return {"paper_id": paper_id, "status": "completed"}


@shared_task(name="app.tasks.pipeline.reconcile_paper_states")
def reconcile_paper_states() -> dict:
    with SessionLocal() as session:
        repaired = session.query(Paper).filter(
            Paper.summary_status != "completed",
            Paper.hook_status == "completed",
        ).update({"summary_status": "completed"}, synchronize_session=False)
        session.commit()
    return {"repaired": repaired}


@shared_task(name="app.tasks.pipeline.generate_hook_cache", autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def generate_hook_cache(
    paper_id: str,
    *,
    plain_summary: str,
    hook_text: str,
    confidence: float,
    source_refs: list[dict],
) -> dict:
    ensure_safe_copy(plain_summary)
    ensure_safe_copy(hook_text)

    with SessionLocal() as session:
        paper = _require_paper(session, paper_id)
        mark_paper_pipeline_status(session, paper=paper, hook_status="processing")
        upsert_hook_cache(
            session,
            paper_id=paper.id,
            user_profile_hash=settings.default_user_profile_hash,
            template_id=settings.hook_template_id,
            plain_summary=plain_summary,
            hook_text=hook_text,
            confidence=confidence,
            source_refs=source_refs,
        )
        mark_paper_pipeline_status(
            session,
            paper=paper,
            summary_status="completed",
            hook_status="completed",
        )
        create_audit_log(
            session,
            event_type="hook_cached",
            entity_type="paper",
            entity_id=paper.id,
            provider="zhipu",
            model=settings.chat_model,
            payload_hash=payload_hash(f"{paper.id}:{settings.default_user_profile_hash}:{settings.hook_template_id}"),
            status="success",
            meta={"template_id": settings.hook_template_id, "confidence": confidence},
        )
        session.commit()
    return {"paper_id": paper_id, "status": "completed"}


def _require_paper(session, paper_id: str) -> Paper:
    paper = get_paper_by_id(session, uuid.UUID(paper_id))
    if paper is None:
        raise ValueError(f"Paper not found: {paper_id}")
    return paper
