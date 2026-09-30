"""
Core application configuration using pydantic-settings.
All settings are read from environment variables / .env file.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "Mint"
    app_env: str = "development"
    app_secret_key: str = "change_me"
    app_debug: bool = False
    app_port: int = 8000

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://ipreneur:ipreneur_dev@localhost:5432/ipreneur"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # ── Supabase ─────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # ── Redis ────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600

    # ── Auth ─────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    # ── Google Gemini (primary — better quality) ─────────────────────────────
    # Supports both AQ. OAuth2 tokens (new format) and AIzaSy... API keys (legacy)
    gemini_api_key: str = ""
    gemini_api_key_2: str = ""
    gemini_model: str = ""
    gemini_model_research: str = "gemini-1.5-flash"
    gemini_max_tokens: int = 16384
    gemini_thinking_budget: int = 0

    # ── Groq AI (automatic fallback when Gemini is unavailable) ──────────────
    # Free tier: llama-3.3-70b-versatile, ~12K tokens/request, 30 RPM
    groq_api_key: str = ""

    # ── Storage ──────────────────────────────────────────────────────────────
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "ipreneur"
    s3_region: str = "us-east-1"
    cdn_base_url: str = "http://localhost:9000/ipreneur"

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    #: Regex matched against the Origin header, in addition to the exact list
    #: above. Exists for Cloudflare Pages preview deployments: every commit gets
    #: its own <hash>.<project>.pages.dev host, so they cannot be enumerated in
    #: cors_origins and every API call from a preview would fail CORS.
    #:
    #: Example: r"https://[a-z0-9-]+\.mint-abc\.pages\.dev"
    #:
    #: Keep it anchored to your own project. A loose pattern (".*pages.dev")
    #: lets any Cloudflare user's site call this API with the browser's
    #: credentials attached, since allow_credentials is on.
    cors_origin_regex: Optional[str] = None

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # ── Celery ───────────────────────────────────────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── Monitoring ───────────────────────────────────────────────────────────
    sentry_dsn: Optional[str] = None
    log_level: str = "DEBUG"

    # ── Billing ──────────────────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""
    stripe_enterprise_price_id: str = ""

    # ── Crawler ──────────────────────────────────────────────────────────────
    playwright_headless: bool = True
    crawl_timeout_ms: int = 30000
    crawl_max_pages: int = 18

    # ── Error tracking ───────────────────────────────────────────────────────
    #: Empty disables Sentry entirely — development and tests send nothing.
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1

    # ── Production guards ────────────────────────────────────────────────────
    #: Placeholders that are fine locally and unacceptable in production. A
    #: missing env var previously fell back silently, which for jwt_secret_key
    #: means tokens signed with a value published in this repo — anyone could
    #: forge a login. Refuse to boot instead.
    @model_validator(mode="after")
    def _no_placeholder_secrets_in_production(self) -> "Settings":
        if not self.is_production:
            return self
        problems: list[str] = []
        if self.app_secret_key in ("", "change_me"):
            problems.append("APP_SECRET_KEY is unset or still 'change_me'")
        if self.jwt_secret_key in ("", "change_me"):
            problems.append("JWT_SECRET_KEY is unset or still 'change_me'")
        if len(self.jwt_secret_key) < 32:
            problems.append("JWT_SECRET_KEY is shorter than 32 characters")
        if self.app_debug:
            problems.append("APP_DEBUG is true")
        if not self.gemini_api_key:
            problems.append("GEMINI_API_KEY is unset — deck generation cannot run")
        if not self.gemini_model:
            problems.append("GEMINI_MODEL is unset")
        if any("localhost" in o or "127.0.0.1" in o for o in self.cors_origins_list):
            problems.append(
                "CORS_ORIGINS still contains localhost — set it to the deployed origin(s)"
            )
        if problems:
            raise ValueError(
                "Refusing to start with APP_ENV=production:" + chr(10) + "  - "
                + (chr(10) + "  - ").join(problems)
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — call this everywhere."""
    return Settings()


# Export singleton
settings = get_settings()
