from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_anon_key: str = Field(alias="SUPABASE_ANON_KEY")
    supabase_jwks_url: str = Field(alias="SUPABASE_JWKS_URL")
    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")
    zhipu_api_key: str | None = Field(default=None, alias="ZHIPU_API_KEY")
    zhipu_base_url: str = Field(default="https://open.bigmodel.cn/api/paas/v4", alias="ZHIPU_BASE_URL")
    chat_model: str = Field(default="glm-4.5-air", alias="CHAT_MODEL")
    personalized_hook_template_id: str = Field(default="personalized_v1", alias="PERSONALIZED_HOOK_TEMPLATE_ID")
    default_user_profile_hash: str = Field(default="generic_zh_cn", alias="DEFAULT_USER_PROFILE_HASH")
    zhipu_chat_timeout_seconds: float = Field(default=120.0, alias="ZHIPU_CHAT_TIMEOUT_SECONDS")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
