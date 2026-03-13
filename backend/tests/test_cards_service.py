from __future__ import annotations

from datetime import datetime, UTC
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest
from app.schemas import HookGenerationProfile
from app.services.personalized_hooks import build_personalized_hook_prompt, build_user_profile_hash

from app.auth import require_bearer_token
from app.schemas import CardTodayItem
from app.services.cards import list_today_cards


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, _stmt):
        return FakeResult(self.rows)


class FakePaper:
    def __init__(self):
        self.id = uuid4()
        self.title = "Test title"
        self.abstract = "Test abstract"
        self.source = "arxiv"
        self.published_at = datetime.now(UTC)
        self.metadata_ = {
            "authors": [{"name": "Alice"}, {"name": "Bob"}],
            "primary_category": "cs.AI",
            "comment": "Demo comment",
            "abs_url": "https://arxiv.org/abs/1234.5678",
            "pdf_url": "https://arxiv.org/pdf/1234.5678",
            "arxiv_page": {
                "subjects": ["Artificial Intelligence (cs.AI)"],
                "submission_history": "[v1] Wed, 11 Mar 2026 17:59:59 UTC",
                "license_url": "https://creativecommons.org/licenses/by/4.0/",
            },
        }


class FakeHook:
    def __init__(self):
        self.hook_text = "Hook"
        self.plain_summary = "Summary"
        self.confidence = Decimal("0.8")
        self.source_refs = [{"text": "Evidence", "section": "abstract", "rank": 1}]


def test_list_today_cards_maps_rows() -> None:
    cards = list_today_cards(FakeSession([(FakePaper(), FakeHook())]), limit=5)
    assert len(cards) == 1
    assert isinstance(cards[0], CardTodayItem)
    assert cards[0].hook_text == "Hook"
    assert cards[0].authors == ["Alice", "Bob"]
    assert cards[0].subjects == ["Artificial Intelligence (cs.AI)"]
    assert [link.label for link in cards[0].links] == ["Abstract", "PDF", "License"]


def test_require_bearer_token_rejects_missing_token() -> None:
    with pytest.raises(Exception):
        require_bearer_token(None)


def test_require_bearer_token_uses_supabase_user_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(url: str, headers: dict[str, str], timeout: float) -> httpx.Response:
        assert url.endswith("/auth/v1/user")
        assert headers["Authorization"] == "Bearer token-123"
        assert headers["apikey"]
        return httpx.Response(200, json={"id": "user-123"})

    monkeypatch.setattr(httpx, "get", fake_get)

    identity = require_bearer_token("Bearer token-123")
    assert identity.sub == "user-123"


def test_build_user_profile_hash_is_stable_for_equivalent_profiles() -> None:
    first = HookGenerationProfile(
        role="产品经理",
        interests=["AI", "机器人"],
        age_group="25-34",
        reading_preference="朋友型",
    )
    second = HookGenerationProfile(
        role="产品经理",
        interests=["机器人", "AI"],
        age_group="25-34",
        reading_preference="朋友型",
    )

    assert build_user_profile_hash("user-1", first) == build_user_profile_hash("user-1", second)


def test_build_personalized_hook_prompt_includes_user_context() -> None:
    profile = HookGenerationProfile(
        role="设计师",
        interests=["艺术科技"],
        age_group="25-34",
        reading_preference="朋友型",
    )

    prompt = build_personalized_hook_prompt(
        title="A paper",
        abstract="An abstract",
        plain_summary="一句话摘要",
        profile=profile,
        metadata={"primary_category": "cs.AI"},
    )

    assert "User role: 设计师" in prompt
    assert "User interests: 艺术科技" in prompt
    assert "Paper plain summary: 一句话摘要" in prompt
