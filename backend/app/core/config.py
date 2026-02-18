from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Gidix"
    database_url: str | None = Field(
        default=None,
        validation_alias="DATABASE_URL",
    )
    db_host: str = Field(default="db", validation_alias="CFG_DB__HOST")
    db_user: str = Field(default="postgres", validation_alias="CFG_DB__USER")
    db_name: str = Field(default="diplom", validation_alias="CFG_DB__NAME")
    db_port: int = Field(default=5432, validation_alias="CFG_DB__PORT")
    db_password: str = Field(default="postgres", validation_alias="CFG_DB__PASSWORD")
    secret_key: str = "change_me"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:5173"
    media_dir: str = "app/media"
    logs_dir: str = "app/logs"

    default_admin_email: str = "admin@example.com"
    default_admin_password: str = "admin123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    def model_post_init(self, __context) -> None:
        if not self.database_url:
            object.__setattr__(
                self,
                "database_url",
                (
                    "postgresql+psycopg2://"
                    f"{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
                ),
            )


settings = Settings()
