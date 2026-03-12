from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HookCache, Paper
from app.schemas import CardTodayItem


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
            source=paper.source,
            published_at=paper.published_at,
            hook_text=hook.hook_text,
            plain_summary=hook.plain_summary,
            confidence=float(hook.confidence),
            source_refs=hook.source_refs,
            impact_level="early_signal",
            time_scale="days_to_years",
        )
        for paper, hook in rows
    ]
