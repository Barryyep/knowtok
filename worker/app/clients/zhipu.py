import hashlib
import json
import time

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config.settings import get_settings
from app.services.content import build_personalized_hook_prompt, build_summary_input


class ZhipuClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._headers = {
            "Authorization": f"Bearer {self.settings.zhipu_api_key}",
            "Content-Type": "application/json",
        }

    def create_embedding(self, text: str) -> tuple[list[float], dict]:
        started_at = time.perf_counter()
        response = self._post_with_retry(
            "/embeddings",
            {
                "model": self.settings.embedding_model,
                "input": text,
                "dimensions": 1024,
            },
            timeout=self.settings.zhipu_embedding_timeout_seconds,
        )
        body = response.json()
        embedding = body["data"][0]["embedding"]
        return embedding, self._build_meta(body, started_at, text)

    def create_summary_and_hook(self, title: str, abstract: str, metadata: dict | None = None) -> tuple[dict, dict]:
        started_at = time.perf_counter()
        prompt = (
            "You are generating content for a Chinese science news card.\n"
            "Return JSON with keys: plain_summary, hook_text, confidence, source_refs.\n"
            "Constraints: plain_summary must be 30-50 Chinese characters. "
            "hook_text must be natural, careful, and non-sensational. "
            "source_refs must be a JSON array of objects with text, section, rank. "
            "Confidence must be a number between 0 and 1.\n"
            f"{build_summary_input(title, abstract, metadata)}"
        )
        response = self._post_with_retry(
            "/chat/completions",
            {
                "model": self.settings.chat_model,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=self.settings.zhipu_chat_timeout_seconds,
        )
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        return json.loads(content), self._build_meta(
            body, started_at, prompt
        )

    def create_personalized_hook(
        self,
        *,
        title: str,
        abstract: str,
        plain_summary: str,
        profile: dict,
        metadata: dict | None = None,
    ) -> tuple[dict, dict]:
        started_at = time.perf_counter()
        prompt = build_personalized_hook_prompt(
            title=title,
            abstract=abstract,
            plain_summary=plain_summary,
            profile=profile,
            metadata=metadata,
        )
        response = self._post_with_retry(
            "/chat/completions",
            {
                "model": self.settings.chat_model,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=self.settings.zhipu_chat_timeout_seconds,
        )
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        return json.loads(content), self._build_meta(body, started_at, prompt)

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    def _post_with_retry(self, path: str, payload: dict, *, timeout: float) -> httpx.Response:
        response = httpx.post(
            f"{self.settings.zhipu_base_url}{path}",
            headers=self._headers,
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        return response

    def _build_meta(self, body: dict, started_at: float, payload: str) -> dict:
        return {
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
            "usage": body.get("usage", {}),
            "payload_hash": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        }
