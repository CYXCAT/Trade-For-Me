from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SQLITE_PATH = Path(__file__).resolve().parents[2] / "tradingagents.db"


class Settings(BaseSettings):
    app_name: str = "TradingAgents Web Backend"
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
    api_key_header: str = "X-API-Key"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
