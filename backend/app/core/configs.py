import os
from pydantic_settings import BaseSettings
from sqlalchemy.orm import DeclarativeBase
from typing import ClassVar
from fastapi_mail import ConnectionConfig


class DBBaseModel(DeclarativeBase):
    pass


class Settings(BaseSettings):
    TITLE: str = "Desafio MailerWeb API"
    API_V1_STR: str = "/api/v1"

    DB_URL: str = os.getenv("DB_URL", "sqlite+aiosqlite:///./desafio.db")

    JWT_SECRET: str = "super_secret_desafio_token_123"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    class Config:
        case_sensitive = True


settings = Settings()

config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "dummy@example.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "dummy"),
    MAIL_FROM=os.getenv("MAIL_FROM", "test@mailerweb.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 1025)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "mailhog"),
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=False,
    SUPPRESS_SEND=int(os.getenv("SUPPRESS_SEND", 0)),
)
