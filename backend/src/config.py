from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL
from sqlalchemy.engine import make_url

BASE_DIR = Path(__file__).parent.parent


class DBConfig(BaseModel):
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
    host: str = "localhost"
    user: str = "gidix"
    name: str = "gidix"
    port: int = 5432
    password: SecretStr = SecretStr("gidix_password")
    name_test: str = "gidix_test"
    database_url: str | None = None

    @property
    def async_url(self) -> URL:
        if self.database_url:
            return _to_async_url(self.database_url)
        return URL.create(
            drivername="postgresql+asyncpg",
            host=self.host,
            port=self.port,
            database=self.name,
            username=self.user,
            password=self.password.get_secret_value(),
        )


class GeneralAppConfig(BaseModel):
    title: str = "GIDIX"
    mode: Literal["TEST", "DEV", "PROD"] = "DEV"
    api_prefix: str = "/api"
    v1_prefix: str = "/v1"


class UvicornConfig(BaseModel):
    port: int = 8000
    host: str = "0.0.0.0"
    reload: bool = True


class GunicornConfig(BaseModel):
    port: int = 8000
    reload: bool = False
    host: str = "0.0.0.0"
    workers: int = 1
    timeout: int = 900
    workers_class: str = "uvicorn.workers.UvicornWorker"
    error_log: str | None = "-"
    access_log: str | None = "-"


class TokenConfig(BaseModel):
    REFRESH_TOKEN_COOKIE_KEY: str = "refresh_token"
    JWT_EXPIRE_DELTA_ACCESS_MINUTES: int = 30
    JWT_EXPIRE_DELTA_REFRESH_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"
    JWT_SECRET: SecretStr = SecretStr("change_me")


class Settings(BaseSettings):
    app_name: str = Field("GIDIX", alias="APP_NAME")
    node_env: str = Field("development", alias="NODE_ENV")
    app_mode: Literal["TEST", "DEV", "PROD"] = Field("DEV", alias="APP_MODE")

    api_port: int = Field(8000, alias="API_PORT")
    app_port: int = Field(3000, alias="APP_PORT")
    public_app_url: str = Field("http://localhost:3000", alias="PUBLIC_APP_URL")
    public_api_url: str = Field("http://localhost:8000", alias="PUBLIC_API_URL")
    cors_origins: str = Field("http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")

    postgres_db: str = Field("gidix", alias="POSTGRES_DB")
    postgres_user: str = Field("gidix", alias="POSTGRES_USER")
    postgres_password: SecretStr = Field(SecretStr("gidix_password"), alias="POSTGRES_PASSWORD")
    postgres_host: str = Field("localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(5432, alias="POSTGRES_PORT")
    database_url: str | None = Field(None, alias="DATABASE_URL")

    db_host: str | None = Field(None, alias="DB_HOST")
    db_user: str | None = Field(None, alias="DB_USER")
    db_name: str | None = Field(None, alias="DB_NAME")
    db_port: int | None = Field(None, alias="DB_PORT")
    db_password: SecretStr | None = Field(None, alias="DB_PASSWORD")

    jwt_secret: SecretStr = Field(SecretStr("change_me"), alias="JWT_SECRET")
    access_token_expire_minutes: int = Field(30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(30, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    media_dir: Path = Field(BASE_DIR / "media", alias="MEDIA_DIR")
    logs_dir: Path = Field(BASE_DIR / "logs", alias="LOGS_DIR")

    enable_route_generation: bool = Field(True, alias="ENABLE_ROUTE_GENERATION")
    osrm_base_url: str = Field("http://localhost:5000", alias="OSRM_BASE_URL")
    osrm_profile: str = Field("foot", alias="OSRM_PROFILE")
    osrm_timeout_seconds: int = Field(30, alias="OSRM_TIMEOUT_SECONDS")
    route_optimization_default: str = Field("nearest_neighbor_2opt", alias="ROUTE_OPTIMIZATION_DEFAULT")
    route_optimization_max_bruteforce_points: int = Field(10, alias="ROUTE_OPTIMIZATION_MAX_BRUTEFORCE_POINTS")
    route_optimization_max_held_karp_points: int = Field(16, alias="ROUTE_OPTIMIZATION_MAX_HELD_KARP_POINTS")

    enable_llm_description: bool = Field(True, alias="ENABLE_LLM_DESCRIPTION")
    llm_provider: str = Field("ollama", alias="LLM_PROVIDER")
    ollama_base_url: str = Field("http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field("gemma3:latest", alias="OLLAMA_MODEL")
    llm_timeout_seconds: int = Field(120, alias="LLM_TIMEOUT_SECONDS")

    enable_web_fact_search: bool = Field(True, alias="ENABLE_WEB_FACT_SEARCH")
    wikipedia_language: str = Field("ru", alias="WIKIPEDIA_LANGUAGE")
    overpass_url: str = Field("https://overpass-api.de/api/interpreter", alias="OVERPASS_URL")
    overpass_timeout_seconds: int = Field(90, alias="OVERPASS_TIMEOUT_SECONDS")
    nominatim_base_url: str = Field("https://nominatim.openstreetmap.org", alias="NOMINATIM_BASE_URL")
    osm_user_agent: str = Field("GidixDiploma/1.0 contact@example.com", alias="OSM_USER_AGENT")
    enable_osm_import: bool = Field(True, alias="ENABLE_OSM_IMPORT")
    enable_payments_mock: bool = Field(True, alias="ENABLE_PAYMENTS_MOCK")

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", BASE_DIR / ".env.local"),
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    @computed_field
    @property
    def db(self) -> DBConfig:
        return DBConfig(
            host=self.db_host or self.postgres_host,
            user=self.db_user or self.postgres_user,
            name=self.db_name or self.postgres_db,
            port=self.db_port or self.postgres_port,
            password=self.db_password or self.postgres_password,
            database_url=self.database_url,
        )

    @computed_field
    @property
    def app(self) -> GeneralAppConfig:
        return GeneralAppConfig(title=self.app_name, mode=self.app_mode)

    @computed_field
    @property
    def uvicorn(self) -> UvicornConfig:
        return UvicornConfig(port=self.api_port)

    @computed_field
    @property
    def gunicorn(self) -> GunicornConfig:
        return GunicornConfig(port=self.api_port)

    @computed_field
    @property
    def auth(self) -> TokenConfig:
        return TokenConfig(
            JWT_SECRET=self.jwt_secret,
            JWT_EXPIRE_DELTA_ACCESS_MINUTES=self.access_token_expire_minutes,
            JWT_EXPIRE_DELTA_REFRESH_DAYS=self.refresh_token_expire_days,
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def _to_async_url(url: str) -> URL:
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return make_url(url)


settings = Settings()
