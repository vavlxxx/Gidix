from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="GIDIX", validation_alias="APP_NAME")
    node_env: str = Field(default="development", validation_alias="NODE_ENV")
    app_port: int = Field(default=3000, validation_alias="APP_PORT")
    api_port: int = Field(default=8000, validation_alias="API_PORT")
    public_app_url: str = Field(default="http://localhost:3000", validation_alias="PUBLIC_APP_URL")
    public_api_url: str = Field(default="http://localhost:8000", validation_alias="PUBLIC_API_URL")
    database_url: str | None = Field(
        default=None,
        validation_alias="DATABASE_URL",
    )
    db_host: str = Field(default="db", validation_alias="CFG_DB__HOST")
    db_user: str = Field(default="postgres", validation_alias="CFG_DB__USER")
    db_name: str = Field(default="diplom", validation_alias="CFG_DB__NAME")
    db_port: int = Field(default=5432, validation_alias="CFG_DB__PORT")
    db_password: str = Field(default="postgres", validation_alias="CFG_DB__PASSWORD")
    postgres_db: str = Field(default="gidix", validation_alias="POSTGRES_DB")
    postgres_user: str = Field(default="gidix", validation_alias="POSTGRES_USER")
    postgres_password: str = Field(default="gidix_password", validation_alias="POSTGRES_PASSWORD")
    postgres_host: str = Field(default="postgres", validation_alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, validation_alias="POSTGRES_PORT")
    secret_key: str = Field(default="change_me", validation_alias="JWT_SECRET")
    session_secret: str = Field(default="change_me", validation_alias="SESSION_SECRET")
    password_salt_rounds: int = Field(default=10, validation_alias="PASSWORD_SALT_ROUNDS")
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:5173"
    media_dir: str = "app/media"
    logs_dir: str = "app/logs"

    default_admin_email: str = "admin@example.com"
    default_admin_password: str = "admin123"
    osrm_base_url: str = Field(default="http://osrm:5000", validation_alias="OSRM_BASE_URL")
    osrm_profile: str = Field(default="foot", validation_alias="OSRM_PROFILE")
    osrm_timeout_seconds: int = Field(default=30, validation_alias="OSRM_TIMEOUT_SECONDS")
    overpass_url: str = Field(
        default="https://overpass-api.de/api/interpreter",
        validation_alias="OVERPASS_URL",
    )
    overpass_timeout_seconds: int = Field(default=90, validation_alias="OVERPASS_TIMEOUT_SECONDS")
    osm_user_agent: str = Field(default="GidixDiploma/1.0 contact@example.com", validation_alias="OSM_USER_AGENT")
    llm_provider: str = Field(default="ollama", validation_alias="LLM_PROVIDER")
    ollama_base_url: str = Field(default="http://ollama:11434", validation_alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="gemma3:latest", validation_alias="OLLAMA_MODEL")
    llm_timeout_seconds: int = Field(default=120, validation_alias="LLM_TIMEOUT_SECONDS")
    enable_route_generation: bool = Field(default=True, validation_alias="ENABLE_ROUTE_GENERATION")
    enable_llm_description: bool = Field(default=True, validation_alias="ENABLE_LLM_DESCRIPTION")
    enable_osm_import: bool = Field(default=True, validation_alias="ENABLE_OSM_IMPORT")
    enable_payments_mock: bool = Field(default=True, validation_alias="ENABLE_PAYMENTS_MOCK")
    route_optimization_default: str = Field(
        default="nearest_neighbor_2opt",
        validation_alias="ROUTE_OPTIMIZATION_DEFAULT",
    )
    route_optimization_max_held_karp_points: int = Field(
        default=16,
        validation_alias="ROUTE_OPTIMIZATION_MAX_HELD_KARP_POINTS",
    )
    route_optimization_max_bruteforce_points: int = Field(
        default=10,
        validation_alias="ROUTE_OPTIMIZATION_MAX_BRUTEFORCE_POINTS",
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            host = self.postgres_host or self.db_host
            user = self.postgres_user or self.db_user
            password = self.postgres_password or self.db_password
            port = self.postgres_port or self.db_port
            name = self.postgres_db or self.db_name
            object.__setattr__(
                self,
                "database_url",
                (
                    "postgresql+psycopg2://"
                    f"{user}:{password}@{host}:{port}/{name}"
                ),
            )


settings = Settings()
