"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/ragbuilder"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Encryption key (Fernet) — generate with:
    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    SECRET_FERNET_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # API prefix
    API_V1_PREFIX: str = "/api/v1"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str) -> str:
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
