from __future__ import annotations

import hashlib
import json
import time
import uuid
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import HookCache, Paper
from app.schemas import HookGenerationProfile, PersonalizedHookResult


FORBIDDEN_TERMS = ("颠覆", "替代", "立即淘汰")


def ensure_safe_copy(text: str) -> None:
    for term in FORBIDDEN_TERMS:
        if term in text:
            raise ValueError(f"Generated copy contains forbidden term: {term}")


def normalize_profile(profile: HookGenerationProfile) -> dict:
    return {
        "role": profile.role.strip(),
        "interests": sorted(item.strip() for item in profile.interests if item.strip()),
        "age_group": profile.age_group.strip(),
        "reading_preference": profile.reading_preference.strip(),
    }


def build_user_profile_hash(user_id: str, profile: HookGenerationProfile) -> str:
    payload = {"user_id": user_id, "profile": normalize_profile(profile)}
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_personalized_hook_prompt(
    *,
    title: str,
    abstract: str,
    plain_summary: str,
    profile: HookGenerationProfile,
    metadata: dict | None = None,
) -> str:
    normalized = normalize_profile(profile)
    lines = [
        "You are generating a personalized Chinese science news hook for one specific user.",
        "Return JSON with keys: hook_text, confidence.",
        "Constraints: hook_text must be 22-38 Chinese characters, natural, careful, non-sensational, and directly relevant to the user profile.",
        "The hook must explicitly bridge the paper to the user's role, interests, age group, or reading preference, but must not invent personal facts.",
        "Avoid generic openings that could fit anyone. Avoid clickbait. Avoid the forbidden terms: 颠覆, 替代, 立即淘汰.",
        "Confidence must be a number between 0 and 1.",
        f"User role: {normalized['role'] or '未提供'}",
        f"User interests: {', '.join(normalized['interests']) or '未提供'}",
        f"User age group: {normalized['age_group'] or '未提供'}",
        f"User reading preference: {normalized['reading_preference'] or '未提供'}",
        f"Paper plain summary: {plain_summary}",
        f"Paper title: {title}",
        f"Paper abstract: {abstract}",
    ]

    if metadata:
        primary_category = metadata.get("primary_category")
        if primary_category:
            lines.append(f"Primary category: {primary_category}")

        comment = metadata.get("comment")
        if comment:
            lines.append(f"Author comment: {comment}")

        journal_ref = metadata.get("journal_ref")
        if journal_ref:
            lines.append(f"Journal reference: {journal_ref}")

        arxiv_page = metadata.get("arxiv_page") or {}
        subjects = arxiv_page.get("subjects") or []
        if subjects:
            lines.append(f"Subjects: {'; '.join(subjects)}")

        submission_history = arxiv_page.get("submission_history")
        if submission_history:
            lines.append(f"Submission history: {submission_history}")

    return "\n".join(lines)


def get_or_create_personalized_hook(
    session: Session,
    *,
    paper_id: str,
    user_id: str,
    profile: HookGenerationProfile,
) -> PersonalizedHookResult:
    settings = get_settings()
    profile_hash = build_user_profile_hash(user_id, profile)

    cached = session.scalar(
        select(HookCache).where(
            HookCache.paper_id == uuid.UUID(paper_id),
            HookCache.user_profile_hash == profile_hash,
            HookCache.template_id == settings.personalized_hook_template_id,
            HookCache.language == "zh-CN",
        )
    )
    if cached is not None:
        return PersonalizedHookResult(
            paper_id=paper_id,
            hook_text=cached.hook_text,
            confidence=float(cached.confidence),
            user_profile_hash=profile_hash,
        template_id=cached.template_id,
        cache_hit=True,
    )

    paper = session.scalar(select(Paper).where(Paper.id == uuid.UUID(paper_id)))
    if paper is None:
        raise ValueError(f"Paper not found: {paper_id}")

    generic_cache = session.scalar(
        select(HookCache).where(
            HookCache.paper_id == paper.id,
            HookCache.user_profile_hash == settings.default_user_profile_hash,
            HookCache.language == "zh-CN",
        )
    )
    if generic_cache is None:
        raise ValueError(f"Generic hook cache not found for paper: {paper_id}")

    prompt = build_personalized_hook_prompt(
        title=paper.title,
        abstract=paper.abstract,
        plain_summary=generic_cache.plain_summary,
        profile=profile,
        metadata=paper.metadata_,
    )
    content = _generate_hook(prompt)
    hook_text = content["hook_text"].strip()
    ensure_safe_copy(hook_text)

    cache_row = HookCache(
        paper_id=paper.id,
        user_profile_hash=profile_hash,
        template_id=settings.personalized_hook_template_id,
        plain_summary=generic_cache.plain_summary,
        hook_text=hook_text,
        confidence=Decimal(str(content["confidence"])),
        source_refs=generic_cache.source_refs,
        language="zh-CN",
    )
    session.add(cache_row)
    session.commit()

    return PersonalizedHookResult(
        paper_id=paper_id,
        hook_text=hook_text,
        confidence=float(cache_row.confidence),
        user_profile_hash=profile_hash,
        template_id=cache_row.template_id,
        cache_hit=False,
    )


def _generate_hook(prompt: str) -> dict:
    settings = get_settings()
    if not settings.zhipu_api_key:
        raise RuntimeError("ZHIPU_API_KEY is required to generate personalized hooks")
    started_at = time.perf_counter()
    response = httpx.post(
        f"{settings.zhipu_base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.zhipu_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.chat_model,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=settings.zhipu_chat_timeout_seconds,
    )
    response.raise_for_status()
    body = response.json()
    content = json.loads(body["choices"][0]["message"]["content"])
    content["_latency_ms"] = int((time.perf_counter() - started_at) * 1000)
    return content
