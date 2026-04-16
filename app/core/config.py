"""
app/core/config.py
──────────────────
Central settings loaded from environment variables / .env file.
All other modules import from here — never import os.environ directly.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_name: str = "ZenMove"
    app_version: str = "1.0.0"
    debug: bool = False

    # ── Database ───────────────────────────────────────────────────────
    database_url: str
    database_url_sync: str

    # ── Auth ───────────────────────────────────────────────────────────
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 30

    # ── AWS S3 ─────────────────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    s3_bucket_photos: str = "zenmove-photos-dev"
    s3_bucket_manifests: str = "zenmove-manifests-dev"
    s3_signed_url_expiry: int = 900  # 15 minutes

    # ── QR Config ──────────────────────────────────────────────────────
    qr_id_prefix: str = "ZM"
    qr_city_code: str = "BBS"

    # ── Pagination ─────────────────────────────────────────────────────
    default_page_size: int = 20
    max_page_size: int = 100

    # ── Redis ──────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── NIC E-Way Bill ─────────────────────────────────────────────────────────
    nic_sandbox: bool = True
    nic_api_url: str = "https://einvoice1-uat.nic.in/ewaybill/apiv1"
    nic_gstin: str = ""
    nic_username: str = ""
    nic_password: str = ""

    # ── Razorpay (mock in Phase 2) ─────────────────────────────────────────────
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # ── Platform fee ───────────────────────────────────────────────────────────
    platform_fee_pct: float = 10.0

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Cached singleton — imported everywhere as:
        from app.core.config import get_settings
        settings = get_settings()
    """
    return Settings()
