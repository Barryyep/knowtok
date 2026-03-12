from app.clients.semantic_scholar import SemanticScholarClient
from app.services.content import build_embedding_input, ensure_safe_copy
from app.services.papers import build_title_hash, mark_paper_pipeline_status
from app.tasks.pipeline import enqueue_or_run


def test_build_title_hash_is_stable() -> None:
    assert build_title_hash("A  Sample Title") == build_title_hash("a sample title")


def test_build_embedding_input_contains_fields() -> None:
    text = build_embedding_input("Hello", "World")
    assert "Title: Hello" in text
    assert "Abstract: World" in text


def test_forbidden_copy_raises() -> None:
    try:
        ensure_safe_copy("这会颠覆行业")
    except ValueError as exc:
        assert "forbidden term" in str(exc)
    else:
        raise AssertionError("Expected ensure_safe_copy to raise")


def test_enqueue_or_run_executes_inline_without_redis() -> None:
    @enqueue_or_run.__globals__["shared_task"](name="tests.inline_task")
    def inline_task(value: int) -> int:
        return value + 1

    result = enqueue_or_run(inline_task, 1)
    assert result.get() == 2


class DummyPaper:
    embedding_status = "pending"
    summary_status = "pending"
    hook_status = "pending"


class DummySession:
    def __init__(self) -> None:
        self.flushed = False

    def flush(self) -> None:
        self.flushed = True


def test_mark_paper_pipeline_status_updates_requested_fields() -> None:
    paper = DummyPaper()
    session = DummySession()

    mark_paper_pipeline_status(
        session,
        paper=paper,
        summary_status="completed",
        hook_status="completed",
    )

    assert paper.embedding_status == "pending"
    assert paper.summary_status == "completed"
    assert paper.hook_status == "completed"
    assert session.flushed is True


def test_enqueue_or_run_returns_apply_result_like_object() -> None:
    @enqueue_or_run.__globals__["shared_task"](name="tests.inline_task_two")
    def inline_task_two(value: int) -> dict:
        return {"value": value}

    result = enqueue_or_run(inline_task_two, 3)
    assert result.get()["value"] == 3


def test_semantic_scholar_normalize_maps_expected_fields() -> None:
    client = SemanticScholarClient()
    paper = client._normalize(
        {
            "paperId": "paper-123",
            "citationCount": 12,
            "influentialCitationCount": 3,
            "venue": "TestConf",
            "fieldsOfStudy": ["Computer Science"],
            "openAccessPdf": {"url": "https://example.com/paper.pdf"},
        }
    )
    assert paper.paper_id == "paper-123"
    assert paper.citation_count == 12
    assert paper.influential_citation_count == 3
    assert paper.fields_of_study == ["Computer Science"]
    assert paper.open_access_pdf_url == "https://example.com/paper.pdf"
