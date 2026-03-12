from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CardTodayItem(BaseModel):
    paper_id: str
    title: str
    source: str
    published_at: datetime
    hook_text: str
    plain_summary: str
    confidence: float
    source_refs: list[dict]
    impact_level: str
    time_scale: str


class UserIdentity(BaseModel):
    sub: str
