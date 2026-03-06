from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPBearer
import jwt

from app.core.configs import settings

oauth2_schema = HTTPBearer(bearerFormat="JWT", auto_error=False)


def create_token(
    token_type: str, lifetime: timedelta, sub: str, scopes: list[str] = []
) -> str:
    payload = {}
    now = datetime.now(timezone.utc)
    expires = now + lifetime

    payload["type"] = token_type
    payload["exp"] = expires
    payload["iat"] = now
    payload["sub"] = str(sub)
    payload["scopes"] = scopes

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def create_access_token(sub: str, scopes: list[str] = []) -> str:
    return create_token(
        token_type="access_token",
        lifetime=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        sub=sub,
        scopes=scopes,
    )


def create_token_form_access(sub: str) -> str:
    return create_access_token(sub=sub, scopes=["form_access"])
