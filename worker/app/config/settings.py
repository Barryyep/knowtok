from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")
    zhipu_api_key: str = Field(alias="ZHIPU_API_KEY")
    zhipu_base_url: str = Field(default="https://open.bigmodel.cn/api/paas/v4", alias="ZHIPU_BASE_URL")
    semantic_scholar_api_key: str | None = Field(default=None, alias="SEMANTIC_SCHOLAR_API_KEY")
    semantic_scholar_base_url: str = Field(
        default="https://api.semanticscholar.org/graph/v1",
        alias="SEMANTIC_SCHOLAR_BASE_URL",
    )
    semantic_scholar_timeout_seconds: float = Field(
        default=30.0,
        alias="SEMANTIC_SCHOLAR_TIMEOUT_SECONDS",
    )
    semantic_scholar_rps: float = Field(default=1.0, alias="SEMANTIC_SCHOLAR_RPS")
    semantic_scholar_backfill_batch_size: int = Field(
        default=10,
        alias="SEMANTIC_SCHOLAR_BACKFILL_BATCH_SIZE",
    )
    arxiv_category_set: str = Field(default="cs.AI,cs.LG,q-bio", alias="ARXIV_CATEGORY_SET")
    arxiv_lookback_days: int = Field(default=7, alias="ARXIV_LOOKBACK_DAYS")
    embedding_model: str = Field(default="embedding-3", alias="EMBEDDING_MODEL")
    chat_model: str = Field(default="glm-4.5-air", alias="CHAT_MODEL")
    hook_template_id: str = Field(default="default_v1", alias="HOOK_TEMPLATE_ID")
    default_user_profile_hash: str = Field(default="generic_zh_cn", alias="DEFAULT_USER_PROFILE_HASH")
    worker_timezone: str = Field(default="America/Los_Angeles", alias="WORKER_TIMEZONE")
    task_always_eager: bool = Field(default=False, alias="TASK_ALWAYS_EAGER")
    zhipu_embedding_timeout_seconds: float = Field(default=60.0, alias="ZHIPU_EMBEDDING_TIMEOUT_SECONDS")
    zhipu_chat_timeout_seconds: float = Field(default=120.0, alias="ZHIPU_CHAT_TIMEOUT_SECONDS")
    zhipu_request_retries: int = Field(default=3, alias="ZHIPU_REQUEST_RETRIES")
    arxiv_user_agent: str = Field(
        default="KnowTokBot/0.1 (+https://knowtok.app; contact: team@knowtok.app)",
        alias="ARXIV_USER_AGENT",
    )

    @property
    def arxiv_categories(self) -> list[str]:
        return [item.strip() for item in self.arxiv_category_set.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
