from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from html import unescape
import re
from urllib.parse import urlencode
from urllib.parse import urljoin

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
            published_at = _parse_arxiv_timestamp(_entry_value(entry, "published"))
            if published_at < cutoff:
                continue
            tags = [tag["term"] for tag in _entry_value(entry, "tags", [])]
            metadata = _build_metadata(entry, params)
            page_details = self._fetch_page_details(metadata["abs_url"])
            if page_details:
                metadata["arxiv_page"] = page_details
            papers.append(
                ArxivPaper(
                    title=" ".join(_entry_value(entry, "title").split()),
                    abstract=" ".join(_entry_value(entry, "summary").split()),
                    raw_url=metadata["abs_url"],
                    published_at=published_at,
                    tags=tags,
                    doi=_entry_value(entry, "arxiv_doi"),
                    metadata=metadata,
                )
            )
        return papers

    def _fetch_page_details(self, abs_url: str | None) -> dict | None:
        if not abs_url:
            return None

        try:
            response = httpx.get(
                abs_url,
                timeout=20.0,
                follow_redirects=True,
                headers={"User-Agent": self.settings.arxiv_user_agent},
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        return _parse_arxiv_abs_page(response.text, abs_url)


def _entry_value(entry, key: str, default=None):
    if isinstance(entry, dict):
        return entry.get(key, default)
    return getattr(entry, key, default)


def _parse_arxiv_timestamp(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)


def _extract_links(entry) -> tuple[str, str | None, list[dict[str, str]]]:
    links = []
    abs_url = _entry_value(entry, "id")
    pdf_url = None

    for link in _entry_value(entry, "links", []):
        link_payload = {
            "href": link.get("href"),
            "rel": link.get("rel"),
            "type": link.get("type"),
            "title": link.get("title"),
        }
        links.append({key: value for key, value in link_payload.items() if value})
        if link.get("rel") == "alternate" and link.get("href"):
            abs_url = link["href"]
        if link.get("title") == "pdf" and link.get("href"):
            pdf_url = link["href"]

    return abs_url, pdf_url, links


def _extract_authors(entry) -> list[dict[str, str]]:
    authors: list[dict[str, str]] = []
    for author in _entry_value(entry, "authors", []):
        name = author.get("name")
        if not name:
            continue
        author_payload = {"name": name}
        affiliation = author.get("affiliation")
        if affiliation:
            author_payload["affiliation"] = affiliation
        authors.append(author_payload)
    return authors


def _build_metadata(entry, params: dict[str, str | int]) -> dict:
    abs_url, pdf_url, links = _extract_links(entry)
    return {
        "entry_id": _entry_value(entry, "id"),
        "abs_url": abs_url,
        "pdf_url": pdf_url,
        "updated_at": _entry_value(entry, "updated"),
        "comment": _entry_value(entry, "arxiv_comment"),
        "journal_ref": _entry_value(entry, "arxiv_journal_ref"),
        "primary_category": (_entry_value(entry, "arxiv_primary_category") or {}).get("term"),
        "authors": _extract_authors(entry),
        "links": links,
        "query": urlencode(params),
    }


def _clean_html_fragment(value: str | None) -> str | None:
    if not value:
        return None
    text = re.sub(r"<br\\s*/?>", "\n", value, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip() or None


def _match_first(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.S | re.I)
    return match.group(1).strip() if match else None


def _split_subjects(subjects_text: str | None) -> list[str]:
    if not subjects_text:
        return []
    return [item.strip() for item in subjects_text.split(";") if item.strip()]


def _parse_arxiv_abs_page(html: str, abs_url: str) -> dict:
    comments_html = _match_first(r'<td class="tablecell comments[^"]*">(.*?)</td>', html)
    subjects_html = _match_first(r'<td class="tablecell subjects[^"]*">(.*?)</td>', html)
    journal_ref_html = _match_first(r'<td class="tablecell jref[^"]*">(.*?)</td>', html)
    doi_href = _match_first(r'<td class="tablecell doi[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"', html)
    submission_history_html = _match_first(r'<div class="submission-history">(.*?)</div>', html)
    license_href = _match_first(r'<div class="abs-license"><a href="([^"]+)"', html)
    html_href = _match_first(r'<a href="([^"]+)" class="abs-button" id="latexml-download-link">', html)
    source_href = _match_first(r'<a href="([^"]+)" class="abs-button download-eprint">', html)

    comments = _clean_html_fragment(comments_html)
    subjects_text = _clean_html_fragment(subjects_html)
    journal_ref = _clean_html_fragment(journal_ref_html)
    submission_history = _clean_html_fragment(submission_history_html)

    return {
        "comments_html": comments_html,
        "comments_text": comments,
        "subjects": _split_subjects(subjects_text),
        "journal_ref": journal_ref,
        "doi_url": urljoin(abs_url, doi_href) if doi_href else None,
        "license_url": urljoin(abs_url, license_href) if license_href else None,
        "html_url": urljoin(abs_url, html_href) if html_href else None,
        "source_url": urljoin(abs_url, source_href) if source_href else None,
        "submission_history": submission_history,
    }
