from datetime import UTC, datetime

from app.clients.arxiv import _build_metadata, _parse_arxiv_abs_page, _parse_arxiv_timestamp


def test_parse_arxiv_timestamp_returns_utc_datetime() -> None:
    parsed = _parse_arxiv_timestamp("2026-03-11T17:59:59Z")

    assert parsed == datetime(2026, 3, 11, 17, 59, 59, tzinfo=UTC)


def test_build_metadata_extracts_additional_arxiv_fields() -> None:
    entry = {
        "id": "http://arxiv.org/abs/2603.11048v1",
        "updated": "2026-03-11T17:59:59Z",
        "arxiv_comment": "Project page: https://example.com/project",
        "arxiv_journal_ref": "Journal of Tests, 2026",
        "arxiv_primary_category": {"term": "cs.CV"},
        "authors": [
            {"name": "Alice Example", "affiliation": "Example Lab"},
            {"name": "Bob Example"},
        ],
        "links": [
            {"href": "https://arxiv.org/abs/2603.11048v1", "rel": "alternate", "type": "text/html"},
            {
                "href": "https://arxiv.org/pdf/2603.11048v1",
                "rel": "related",
                "type": "application/pdf",
                "title": "pdf",
            },
        ],
    }

    metadata = _build_metadata(
        entry,
        {
            "search_query": "cat:cs.AI",
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": 50,
        },
    )

    assert metadata["entry_id"] == "http://arxiv.org/abs/2603.11048v1"
    assert metadata["abs_url"] == "https://arxiv.org/abs/2603.11048v1"
    assert metadata["pdf_url"] == "https://arxiv.org/pdf/2603.11048v1"
    assert metadata["updated_at"] == "2026-03-11T17:59:59Z"
    assert metadata["comment"] == "Project page: https://example.com/project"
    assert metadata["journal_ref"] == "Journal of Tests, 2026"
    assert metadata["primary_category"] == "cs.CV"
    assert metadata["authors"] == [
        {"name": "Alice Example", "affiliation": "Example Lab"},
        {"name": "Bob Example"},
    ]
    assert metadata["links"] == [
        {"href": "https://arxiv.org/abs/2603.11048v1", "rel": "alternate", "type": "text/html"},
        {
            "href": "https://arxiv.org/pdf/2603.11048v1",
            "rel": "related",
            "type": "application/pdf",
            "title": "pdf",
        },
    ]
    assert "search_query=cat%3Acs.AI" in metadata["query"]


def test_parse_arxiv_abs_page_extracts_detail_fields() -> None:
    html = """
    <td class="tablecell comments mathjax">Project page: <a href="https://example.com/project">link</a></td>
    <td class="tablecell subjects">
      <span class="primary-subject">Artificial Intelligence (cs.AI)</span>; Machine Learning (cs.LG)
    </td>
    <td class="tablecell jref">Journal of Tests, 2026</td>
    <td class="tablecell doi"><a href="https://doi.org/10.1000/test">https://doi.org/10.1000/test</a></td>
    <div class="submission-history">
      <h2>Submission history</h2>
      <strong>[v1]</strong> Wed, 11 Mar 2026 17:59:59 UTC (4,742 KB)<br/>
    </div>
    <div class="abs-license"><a href="http://creativecommons.org/licenses/by/4.0/" title="Rights to this article"></a></div>
    <a href="https://arxiv.org/html/2603.11048v1" class="abs-button" id="latexml-download-link">HTML (experimental)</a>
    <a href="/src/2603.11048" class="abs-button download-eprint">TeX Source</a>
    """

    details = _parse_arxiv_abs_page(html, "https://arxiv.org/abs/2603.11048")

    assert details["comments_text"] == "Project page: link"
    assert details["subjects"] == [
        "Artificial Intelligence (cs.AI)",
        "Machine Learning (cs.LG)",
    ]
    assert details["journal_ref"] == "Journal of Tests, 2026"
    assert details["doi_url"] == "https://doi.org/10.1000/test"
    assert details["license_url"] == "http://creativecommons.org/licenses/by/4.0/"
    assert details["html_url"] == "https://arxiv.org/html/2603.11048v1"
    assert details["source_url"] == "https://arxiv.org/src/2603.11048"
    assert "[v1]" in details["submission_history"]
