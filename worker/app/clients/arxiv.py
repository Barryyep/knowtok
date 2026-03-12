from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import feedparser
import httpx

from app.config.settings import get_settings


@dataclass(slots=True)
class ArxivPaper:
    title: str
    abstract: str
    raw_url: str
    published_at: datetime
    tags: list[str]
    doi: str | None
    metadata: dict


class ArxivClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def fetch_recent_papers(self, max_results: int = 50) -> list[ArxivPaper]:
        query = " OR ".join(f"cat:{category}" for category in self.settings.arxiv_categories)
        params = {
            "search_query": query,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": max_results,
        }
        response = httpx.get(
            "https://export.arxiv.org/api/query",
            params=params,
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": self.settings.arxiv_user_agent},
        )
        response.raise_for_status()
        feed = feedparser.parse(response.text)

        cutoff = datetime.now(UTC) - timedelta(days=self.settings.arxiv_lookback_days)
        papers: list[ArxivPaper] = []
        for entry in feed.entries:
            published_at = datetime.strptime(entry.published, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
            if published_at < cutoff:
                continue
            tags = [tag["term"] for tag in entry.get("tags", [])]
            papers.append(
                ArxivPaper(
                    title=" ".join(entry.title.split()),
                    abstract=" ".join(entry.summary.split()),
                    raw_url=entry.id,
                    published_at=published_at,
                    tags=tags,
                    doi=getattr(entry, "arxiv_doi", None),
                    metadata={
                        "authors": [author.name for author in entry.authors],
                        "entry_id": entry.id,
                        "primary_category": entry.get("arxiv_primary_category", {}).get("term"),
                        "query": urlencode(params),
                    },
                )
            )
        return papers
