from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CardPaperLink(BaseModel):
    label: str
    url: str


class HookGenerationProfile(BaseModel):
    role: str
    interests: list[str]
    age_group: str
    reading_preference: str


class CardTodayItem(BaseModel):
    paper_id: str
    title: str
    abstract: str
    source: str
    published_at: datetime
    hook_text: str
    plain_summary: str
    confidence: float
    source_refs: list[dict]
    impact_level: str
    time_scale: str
    authors: list[str]
    primary_category: str | None
    comment: str | None
    journal_ref: str | None
    subjects: list[str]
    submission_history: str | None
    links: list[CardPaperLink]


class UserIdentity(BaseModel):
    sub: str


class PersonalizedHookRequest(BaseModel):
    profile: HookGenerationProfile


class PersonalizedHookResult(BaseModel):
    paper_id: str
    hook_text: str
    confidence: float
    user_profile_hash: str
    template_id: str
    cache_hit: bool
