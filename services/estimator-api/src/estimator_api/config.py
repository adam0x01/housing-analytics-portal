from pathlib import Path

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    model_api_url: HttpUrl = HttpUrl("http://127.0.0.1:8000")
    model_timeout_seconds: float = Field(default=10, gt=0, le=120)
    database_path: Path = Path("storage/estimates.sqlite")
