"""Device authorization: pairing, verification, and per-device access tokens.

The flow: a device posts its `device_code` + `label` → the Mac issues a random
6-digit code (shown as a macOS notification + structured log) → the device posts
the code back → the server issues a per-device `access_token`. That token is
then presented as a Bearer token on every protected request.
"""

import hmac
import logging
import secrets
import shutil
import subprocess
import threading
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.device import Device, Pairing, PairingStatus

logger = logging.getLogger("silence.backend.device")

PAIRING_TTL_SECONDS = 300  # 5 minutes


def _new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


_ALERT_BIN = Path(__file__).resolve().parents[2] / "bin" / "silence-code-alert"


def _modal_alert(code: str, device_code: str) -> None:
    """Pop the verification-code dialog (native styled popup; osascript fallback)."""
    if _ALERT_BIN.exists():
        try:
            subprocess.run(
                [str(_ALERT_BIN), code, device_code[:8]],
                timeout=310,
                check=False,
            )
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("mac custom alert failed", extra={"error": str(exc)})
    if shutil.which("osascript"):
        message = f"验证码 {code}，设备 {device_code[:8]}，5 分钟内有效。"
        try:
            subprocess.run(
                [
                    "osascript",
                    "-e",
                    f'display alert "Silence 连接验证码" message "{message}" as informational giving up after 300',
                ],
                timeout=310,
                check=False,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("mac alert fallback failed", extra={"error": str(exc)})


def _notify_mac(code: str, device_code: str, label: str) -> None:
    """Show the verification code on the Mac.

    Displays a native, styled popup on a background thread so the pairing
    request still responds immediately. The code is also logged and reachable
    via the admin-only `/auth/pending`.
    """
    threading.Thread(target=_modal_alert, args=(code, device_code), daemon=True).start()
    logger.info(
        "PAIRING_CODE_ISSUED",
        extra={"code": code, "device_code": device_code, "label": label},
    )


def is_authorized(session: Session, device_code: str) -> Device | None:
    return session.get(Device, device_code)


def authenticate(session: Session, token: str) -> Device | None:
    device = session.exec(select(Device).where(Device.access_token == token)).first()
    if device is not None:
        device.last_seen = datetime.now()
        session.add(device)
        session.commit()
    return device


def create_pairing(session: Session, device_code: str, label: str) -> Pairing:
    now = datetime.now()
    pairing = Pairing(
        id=uuid4().hex[:12],
        device_code=device_code,
        label=label[:80],
        verification_code=_new_code(),
        status=PairingStatus.PENDING.value,
        created_at=now,
        expires_at=now + timedelta(seconds=PAIRING_TTL_SECONDS),
    )
    session.add(pairing)
    session.commit()
    session.refresh(pairing)
    _notify_mac(pairing.verification_code, device_code, label)
    return pairing


def verify(session: Session, device_code: str, code: str) -> Device:
    pairing = session.exec(
        select(Pairing)
        .where(
            Pairing.device_code == device_code,
            Pairing.status == PairingStatus.PENDING.value,
        )
        .order_by(Pairing.created_at.desc())
    ).first()

    if pairing is None:
        raise HTTPException(status_code=404, detail="No pending pairing for this device")
    if pairing.expires_at < datetime.now():
        pairing.status = PairingStatus.EXPIRED.value
        session.add(pairing)
        session.commit()
        raise HTTPException(status_code=410, detail="Pairing code expired")
    if not hmac.compare_digest(pairing.verification_code, code):
        raise HTTPException(status_code=401, detail="Invalid verification code")

    pairing.status = PairingStatus.VERIFIED.value
    pairing.verified_at = datetime.now()
    session.add(pairing)

    device = session.get(Device, device_code)
    access_token = secrets.token_urlsafe(32)
    if device is None:
        device = Device(id=device_code, label=pairing.label, access_token=access_token)
    else:
        device.access_token = access_token
        device.label = pairing.label or device.label
    device.last_seen = datetime.now()
    session.add(device)
    session.commit()
    session.refresh(device)

    logger.info(
        "DEVICE_AUTHORIZED",
        extra={"device_code": device_code, "label": device.label},
    )
    return device