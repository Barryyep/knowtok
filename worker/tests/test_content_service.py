from app.services.content import build_summary_input


def test_build_summary_input_includes_arxiv_metadata_context() -> None:
    text = build_summary_input(
        "Paper title",
        "Paper abstract",
        {
            "primary_category": "cs.AI",
            "comment": "Accepted at TestConf 2026",
            "journal_ref": "Journal of Tests, 2026",
            "arxiv_page": {
                "subjects": ["Artificial Intelligence (cs.AI)", "Machine Learning (cs.LG)"],
                "submission_history": "[v1] Wed, 11 Mar 2026 17:59:59 UTC",
            },
        },
    )

    assert "Primary category: cs.AI" in text
    assert "Author comment: Accepted at TestConf 2026" in text
    assert "Subjects: Artificial Intelligence (cs.AI); Machine Learning (cs.LG)" in text
    assert "Submission history: [v1] Wed, 11 Mar 2026 17:59:59 UTC" in text
