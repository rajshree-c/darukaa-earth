from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://darukaa:darukaa@localhost:5432/darukaa"
    jwt_secret: str = "development-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Resolve the repository-level environment file regardless of where Uvicorn is started.
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
