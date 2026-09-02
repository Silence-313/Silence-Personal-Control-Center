"""Device authorization request/response schemas."""

from datetime import datetime

from pydantic import BaseModel


class PairRequest(BaseModel):
    device_code: str
    label: str = ""


class PairResponse(BaseModel):
    pairing_id: str
    expires_in_seconds: int


class VerifyRequest(BaseModel):
    device_code: str
    verification_code: str


class VerifyResponse(BaseModel):
    device_code: str
    access_token: str


class AuthStatusResponse(BaseModel):
    authorized: bool


class SseTicketResponse(BaseModel):
    token: str
    expires_in_seconds: int


class PendingPairingOut(BaseModel):
    pairing_id: str
    device_code: str
    label: str
    verification_code: str
    expires_at: datetime