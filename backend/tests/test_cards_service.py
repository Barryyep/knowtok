from __future__ import annotations

from datetime import datetime, UTC
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest

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
        self.source = "arxiv"
        self.published_at = datetime.now(UTC)


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
