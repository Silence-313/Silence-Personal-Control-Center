"""Application configuration, loaded from environment variables / .env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="control_center_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000

    # Empty by default in local development (localhost access permitted only).
    api_token: str = ""

    database_url: str = f"sqlite:///{DATA_DIR / 'control-center.db'}"

    # Comma-separated CORS origins for the Next.js frontend.
    allowed_origins: str = "http://localhost:3000"

    # Project registry (user-filled, read-only git monitoring).
    projects_config: str = str(BACKEND_DIR / "config" / "projects.yaml")

    # Local node identity (single machine in v0.1).
    node_id: str = "macbook-pro"
    node_name: str = "MacBook Pro"
    heartbeat_interval_seconds: float = 10.0

    @property
    def allowed_origin_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.env.lower() in {"development", "dev"}


settings = Settings()