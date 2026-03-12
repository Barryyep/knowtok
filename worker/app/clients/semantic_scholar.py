from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from app.config.settings import get_settings


SEMANTIC_SCHOLAR_FIELDS = ",".join(
    [
        "paperId",
        "title",
        "abstract",
        "citationCount",
        "influentialCitationCount",
        "fieldsOfStudy",
        "publicationDate",
        "venue",
        "url",
        "externalIds",
        "openAccessPdf",
    ]
)


@dataclass(slots=True)
class SemanticScholarPaper:
    paper_id: str
    citation_count: int
    influential_citation_count: int
    venue: str | None
    fields_of_study: list[str]
    open_access_pdf_url: str | None
    source_payload: dict[str, Any]


class SemanticScholarClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._headers = {"User-Agent": self.settings.arxiv_user_agent}
        if self.settings.semantic_scholar_api_key:
            self._headers["x-api-key"] = self.settings.semantic_scholar_api_key

    def is_enabled(self) -> bool:
        return True

    def fetch_metadata(self, *, doi: str | None, title: str) -> tuple[SemanticScholarPaper | None, dict]:
        started_at = time.perf_counter()
        if doi:
            payload = self._get_by_doi(doi)
            if payload is not None:
                return self._normalize(payload), self._meta(started_at, f"doi:{doi}")

        payload = self._search_by_title(title)
        if payload is None:
            return None, self._meta(started_at, f"title:{title}")
        return self._normalize(payload), self._meta(started_at, f"title:{title}")

    def _get_by_doi(self, doi: str) -> dict[str, Any] | None:
        response = self._request(
            f"/paper/DOI:{quote(doi, safe='')}",
            params={"fields": SEMANTIC_SCHOLAR_FIELDS},
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()

    def _search_by_title(self, title: str) -> dict[str, Any] | None:
        response = self._request(
            "/paper/search",
            params={
                "query": title,
                "limit": 1,
                "fields": SEMANTIC_SCHOLAR_FIELDS,
            },
        )
        response.raise_for_status()
        body = response.json()
        data = body.get("data") or []
        return data[0] if data else None

    def _request(self, path: str, *, params: dict[str, Any]) -> httpx.Response:
        time.sleep(max(1.0 / self.settings.semantic_scholar_rps, 0.0))
        return httpx.get(
            f"{self.settings.semantic_scholar_base_url}{path}",
            headers=self._headers,
            params=params,
            timeout=self.settings.semantic_scholar_timeout_seconds,
        )

    def _normalize(self, payload: dict[str, Any]) -> SemanticScholarPaper:
        open_access_pdf = payload.get("openAccessPdf") or {}
        return SemanticScholarPaper(
            paper_id=payload["paperId"],
            citation_count=int(payload.get("citationCount") or 0),
            influential_citation_count=int(payload.get("influentialCitationCount") or 0),
            venue=payload.get("venue"),
            fields_of_study=list(payload.get("fieldsOfStudy") or []),
            open_access_pdf_url=open_access_pdf.get("url"),
            source_payload=payload,
        )

    def _meta(self, started_at: float, key: str) -> dict[str, Any]:
        return {
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "payload_hash": hashlib.sha256(key.encode("utf-8")).hexdigest(),
        }
