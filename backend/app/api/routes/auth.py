"""Device authorization endpoints (pairing + verification).

These are intentionally open: authorization itself must be reachable before a
device is trusted. `/pending` is admin-only so only the Mac-side operator can
read outstanding verification codes.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.dependencies import require_access, require_admin
from app.db.database import get_session
from app.models.device import Pairing, PairingStatus
from app.schemas.auth import (
    AuthStatusResponse,
    PairRequest,
    PairResponse,
    PendingPairingOut,
    SseTicketResponse,
    VerifyRequest,
    VerifyResponse,
)
from app.services import device_service, sse_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/pair", response_model=PairResponse, status_code=201)
def pair(request: PairRequest, session: Session = Depends(get_session)) -> PairResponse:
    pairing = device_service.create_pairing(session, request.device_code, request.label)
    return PairResponse(
        pairing_id=pairing.id,
        expires_in_seconds=device_service.PAIRING_TTL_SECONDS,
    )


@router.post("/verify", response_model=VerifyResponse)
def verify(request: VerifyRequest, session: Session = Depends(get_session)) -> VerifyResponse:
    device = device_service.verify(session, request.device_code, request.verification_code)
    return VerifyResponse(device_code=device.id, access_token=device.access_token)


@router.get("/status", response_model=AuthStatusResponse)
def status(device_code: str, session: Session = Depends(get_session)) -> AuthStatusResponse:
    authorized = device_service.is_authorized(session, device_code) is not None
    return AuthStatusResponse(authorized=authorized)


@router.get(
    "/sse-ticket",
    response_model=SseTicketResponse,
    dependencies=[Depends(require_access)],
)
def sse_ticket() -> SseTicketResponse:
    """Issue a short-lived ticket for the SSE stream.

    The device presents its `access_token` as a normal Bearer header here (no
    leak), then opens `GET /api/v1/events?ticket=...` with the returned value.
    """
    return SseTicketResponse(
        token=sse_service.sse_tickets.issue(),
        expires_in_seconds=sse_service.SSE_TICKET_TTL_SECONDS,
    )


@router.get(
    "/pending",
    response_model=list[PendingPairingOut],
    dependencies=[Depends(require_admin)],
)
def pending(session: Session = Depends(get_session)) -> list[PendingPairingOut]:
    items = session.exec(
        select(Pairing).where(Pairing.status == PairingStatus.PENDING.value)
    ).all()
    return [
        PendingPairingOut(
            pairing_id=p.id,
            device_code=p.device_code,
            label=p.label,
            verification_code=p.verification_code,
            expires_at=p.expires_at,
        )
        for p in items
    ]