from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HookCache, Paper
from app.schemas import CardPaperLink, CardTodayItem


def _build_paper_links(metadata: dict) -> list[CardPaperLink]:
    arxiv_page = metadata.get("arxiv_page") or {}
    candidate_links = [
        ("Abstract", metadata.get("abs_url") or metadata.get("entry_id")),
        ("PDF", metadata.get("pdf_url")),
        ("HTML", arxiv_page.get("html_url")),
        ("Source", arxiv_page.get("source_url")),
        ("License", arxiv_page.get("license_url")),
        ("DOI", arxiv_page.get("doi_url")),
    ]
    return [CardPaperLink(label=label, url=url) for label, url in candidate_links if url]


def list_today_cards(session: Session, *, limit: int = 5) -> list[CardTodayItem]:
    stmt = (
        select(Paper, HookCache)
        .join(HookCache, HookCache.paper_id == Paper.id)
        .where(Paper.embedding_status == "completed")
        .where(Paper.summary_status == "completed")
        .where(Paper.hook_status == "completed")
        .where(Paper.quality_status == "active")
        .where(Paper.retracted_at.is_(None))
        .where(HookCache.user_profile_hash == "generic_zh_cn")
        .order_by(Paper.published_at.desc())
        .limit(limit)
    )
    rows = session.execute(stmt).all()
    return [
        CardTodayItem(
            paper_id=str(paper.id),
            title=paper.title,
            abstract=paper.abstract,
            source=paper.source,
            published_at=paper.published_at,
            hook_text=hook.hook_text,
            plain_summary=hook.plain_summary,
            confidence=float(hook.confidence),
            source_refs=hook.source_refs,
            impact_level="early_signal",
            time_scale="days_to_years",
            authors=[author.get("name") for author in (paper.metadata_ or {}).get("authors", []) if author.get("name")],
            primary_category=(paper.metadata_ or {}).get("primary_category"),
            comment=((paper.metadata_ or {}).get("arxiv_page") or {}).get("comments_text") or (paper.metadata_ or {}).get("comment"),
            journal_ref=((paper.metadata_ or {}).get("arxiv_page") or {}).get("journal_ref") or (paper.metadata_ or {}).get("journal_ref"),
            subjects=((paper.metadata_ or {}).get("arxiv_page") or {}).get("subjects") or [],
            submission_history=((paper.metadata_ or {}).get("arxiv_page") or {}).get("submission_history"),
            links=_build_paper_links(paper.metadata_ or {}),
        )
        for paper, hook in rows
    ]
