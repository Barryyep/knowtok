import hashlib
import json


def normalize_user_profile(profile: dict) -> dict:
    return {
        "role": str(profile.get("role", "")).strip(),
        "interests": sorted(str(item).strip() for item in (profile.get("interests") or []) if str(item).strip()),
        "age_group": str(profile.get("age_group", "")).strip(),
        "reading_preference": str(profile.get("reading_preference", "")).strip(),
    }


FORBIDDEN_TERMS = ("颠覆", "替代", "立即淘汰")


def ensure_safe_copy(text: str) -> None:
    for term in FORBIDDEN_TERMS:
        if term in text:
            raise ValueError(f"Generated copy contains forbidden term: {term}")


def build_embedding_input(title: str, abstract: str) -> str:
    return f"Title: {title}\nAbstract: {abstract}"


def build_summary_input(title: str, abstract: str, metadata: dict | None = None) -> str:
    lines = [f"Title: {title}", f"Abstract: {abstract}"]
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


def build_personalized_hook_prompt(
    *,
    title: str,
    abstract: str,
    plain_summary: str,
    profile: dict,
    metadata: dict | None = None,
) -> str:
    normalized = normalize_user_profile(profile)
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


def build_user_profile_hash(user_id: str, profile: dict) -> str:
    raw = json.dumps(
        {"user_id": user_id, "profile": normalize_user_profile(profile)},
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def payload_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
