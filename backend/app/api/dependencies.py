"""Shared FastAPI dependencies (authentication, authorization)."""

import hmac
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.config import settings
from app.db.database import engine
from app.services import device_service

bearer_scheme = HTTPBearer(auto_error=False)

_LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


def get_bearer_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> str | None:
    return credentials.credentials if credentials else None


def require_access(
    request: Request,
    token: Annotated[str | None, Depends(get_bearer_token)],
) -> None:
    """Gate protected endpoints (data + commands).

    Access is granted when any holds:
      1. the client is on the machine itself (localhost);
      2. the request carries the admin API token;
      3. the request carries a valid per-device access token.
    """
    host = request.client.host if request.client else "unknown"
    if host in _LOCAL_HOSTS:
        return
    if settings.api_token and token and hmac.compare_digest(token, settings.api_token):
        return
    if token:
        with Session(engine) as session:
            if device_service.authenticate(session, token):
                return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Device not authorized",
    )


def require_admin(
    request: Request,
    token: Annotated[str | None, Depends(get_bearer_token)],
) -> None:
    """Admin-only (the Mac itself, or an API-token client)."""
    host = request.client.host if request.client else "unknown"
    if host in _LOCAL_HOSTS:
        return
    if settings.api_token and token and hmac.compare_digest(token, settings.api_token):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )