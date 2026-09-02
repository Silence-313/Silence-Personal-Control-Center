"""Device authorization + pairing persistence models."""

from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class PairingStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"


class Device(SQLModel, table=True):
    """An authorized device (a browser/PWA instance), identified by its
    client-generated `device_code` (the "machine code")."""

    __tablename__ = "devices"

    id: str = Field(primary_key=True)  # device_code
    label: str = ""
    access_token: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.now)
    last_seen: datetime | None = None


class Pairing(SQLModel, table=True):
    """A pending pairing request waiting for the on-Mac verification code."""

    __tablename__ = "pairings"

    id: str = Field(primary_key=True)
    device_code: str = Field(index=True)
    label: str = ""
    verification_code: str
    status: str = Field(default=PairingStatus.PENDING.value)
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime
    verified_at: datetime | None = None