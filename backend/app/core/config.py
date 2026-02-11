from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Gidix"
    database_url: str = "postgresql+psycopg2://postgres:postgres@db:5432/diplom"
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


settings = Settings()
