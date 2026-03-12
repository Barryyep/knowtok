import hashlib


FORBIDDEN_TERMS = ("颠覆", "替代", "立即淘汰")


def ensure_safe_copy(text: str) -> None:
    for term in FORBIDDEN_TERMS:
        if term in text:
            raise ValueError(f"Generated copy contains forbidden term: {term}")


def build_embedding_input(title: str, abstract: str) -> str:
    return f"Title: {title}\nAbstract: {abstract}"


def payload_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
