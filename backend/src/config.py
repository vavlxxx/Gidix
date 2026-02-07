from pathlib import Path
from typing import Literal

from pydantic import BaseModel, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

BASE_DIR: Path = Path(__file__).parent.parent


class DBConfig(BaseModel):
    ### sqlalchemy
    echo: bool = False
    expire_on_commit: bool = False
    autoflush: bool = False
    autocommit: bool = False
    naming_convention: dict[str, str] = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    ### database config
    host: str
    user: str
    name: str
    port: int
    password: SecretStr
    name_test: str = "postgres"

    @property
    def async_url(self) -> URL:
        return URL.create(
            drivername="postgresql+asyncpg",
            host=self.host,
            port=self.port,
            database=self.name,
            username=self.user,
            password=self.password.get_secret_value(),
        )


class GunicornConfig(BaseModel):
    port: int = 8888
    reload: bool = False
    host: str = "0.0.0.0"
    workers: int = 1
    timeout: int = 900
    workers_class: str = "uvicorn.workers.UvicornWorker"
    error_log: str | None = "-"
    access_log: str | None = "-"


class UvicornConfig(BaseModel):
    port: int = 8888
    host: str = "127.0.0.1"
    reload: bool = True


class GeneralAppConfig(BaseModel):
    title: str = "FastAPI Quick Start"
    mode: Literal["TEST", "DEV"]


class Settings(BaseSettings):
    db: DBConfig
    app: GeneralAppConfig
    gunicorn: GunicornConfig = GunicornConfig()
    uvicorn: UvicornConfig = UvicornConfig()

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env",),
        extra="ignore",
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="CFG_",
    )


settings = Settings()  # type: ignore
