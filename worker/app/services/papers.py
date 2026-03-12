import hashlib
import uuid
from decimal import Decimal

from sqlalchemy import false, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.paper import AuditLog, HookCache, Paper, PaperEmbedding


def normalize_title(title: str) -> str:
    return " ".join(title.lower().split())


def build_title_hash(title: str) -> str:
    return hashlib.sha256(normalize_title(title).encode("utf-8")).hexdigest()


def get_paper_by_id(session: Session, paper_id: str | uuid.UUID) -> Paper | None:
    return session.scalar(select(Paper).where(Paper.id == paper_id))


def upsert_paper(session: Session, payload: dict) -> tuple[Paper, bool]:
    doi = payload.get("doi")
    existing = session.scalar(
        select(Paper).where((Paper.doi == doi) if doi else false())
    )
    if existing is None:
        existing = session.scalar(
            select(Paper).where(
                Paper.source == payload["source"],
                Paper.title_hash == payload["title_hash"],
            )
        )
    if existing is not None:
        existing.title = payload["title"]
        existing.abstract = payload["abstract"]
        existing.raw_url = payload["raw_url"]
        existing.tags = payload["tags"]
        existing.published_at = payload["published_at"]
        existing.metadata_ = payload["metadata_"]
        existing.ingest_status = "processed"
        existing.updated_at = func.now()
        session.flush()
        return existing, False

    stmt = (
        insert(Paper)
        .values(**payload)
        .on_conflict_do_update(
            index_elements=[Paper.source, Paper.title_hash],
            set_={
                "abstract": payload["abstract"],
                "raw_url": payload["raw_url"],
                "tags": payload["tags"],
                "published_at": payload["published_at"],
                "updated_at": func.now(),
                "metadata": payload["metadata_"],
                "ingest_status": "processed",
            },
        )
        .returning(Paper.id)
    )
    paper_id = session.execute(stmt).scalar_one()
    paper = get_paper_by_id(session, paper_id)
    assert paper is not None
    return paper, True


def upsert_embedding(session: Session, paper_id: uuid.UUID, model: str, embedding: list[float]) -> None:
    stmt = (
        insert(PaperEmbedding)
        .values(paper_id=paper_id, model=model, embedding=embedding)
        .on_conflict_do_update(
            index_elements=[PaperEmbedding.paper_id, PaperEmbedding.model],
            set_={"embedding": embedding},
        )
    )
    session.execute(stmt)


def upsert_hook_cache(
    session: Session,
    *,
    paper_id: uuid.UUID,
    user_profile_hash: str,
    template_id: str,
    plain_summary: str,
    hook_text: str,
    confidence: float,
    source_refs: list[dict],
) -> None:
    stmt = (
        insert(HookCache)
        .values(
            paper_id=paper_id,
            user_profile_hash=user_profile_hash,
            template_id=template_id,
            plain_summary=plain_summary,
            hook_text=hook_text,
            confidence=Decimal(str(confidence)),
            source_refs=source_refs,
            language="zh-CN",
        )
        .on_conflict_do_update(
            index_elements=[
                HookCache.paper_id,
                HookCache.user_profile_hash,
                HookCache.template_id,
                HookCache.language,
            ],
            set_={
                "plain_summary": plain_summary,
                "hook_text": hook_text,
                "confidence": Decimal(str(confidence)),
                "source_refs": source_refs,
            },
        )
    )
    session.execute(stmt)


def mark_paper_pipeline_status(
    session: Session,
    *,
    paper: Paper,
    embedding_status: str | None = None,
    summary_status: str | None = None,
    hook_status: str | None = None,
) -> None:
    if embedding_status is not None:
        paper.embedding_status = embedding_status
    if summary_status is not None:
        paper.summary_status = summary_status
    if hook_status is not None:
        paper.hook_status = hook_status
    session.flush()


def apply_semantic_scholar_enrichment(
    session: Session,
    *,
    paper: Paper,
    semantic_scholar_paper_id: str,
    citation_count: int,
    influential_citation_count: int,
    venue: str | None,
    fields_of_study: list[str],
    open_access_pdf_url: str | None,
    source_payload: dict,
) -> None:
    paper.semantic_scholar_paper_id = semantic_scholar_paper_id
    paper.citation_count = citation_count
    paper.influential_citation_count = influential_citation_count
    paper.venue = venue
    paper.fields_of_study = fields_of_study
    paper.open_access_pdf_url = open_access_pdf_url
    paper.metadata_ = {
        **(paper.metadata_ or {}),
        "semantic_scholar": source_payload,
    }
    session.flush()


def create_audit_log(
    session: Session,
    *,
    event_type: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    provider: str | None,
    model: str | None,
    payload_hash: str,
    status: str,
    error_summary: str | None = None,
    meta: dict | None = None,
) -> None:
    session.add(
        AuditLog(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            provider=provider,
            model=model,
            payload_hash=payload_hash,
            status=status,
            error_summary=error_summary,
            meta=meta or {},
        )
    )
