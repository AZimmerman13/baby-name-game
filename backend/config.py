from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Database
    database_url: str = "sqlite:///./baby_name_game.db"

    # API
    backend_port: int = 8000
    admin_secret_key: str = "change-this-in-production"

    # JWT Authentication
    jwt_secret_key: str = "CHANGE-THIS-SECRET-KEY-IN-PRODUCTION-USE-RANDOM-STRING"
    cookie_secure: bool = False  # Set to True in production (HTTPS)

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_per_minute: int = 20

    # Email (Resend)
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()
