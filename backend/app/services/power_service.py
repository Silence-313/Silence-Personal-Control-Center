"""Power state (battery/charge) + the display-sleep / wake primitives.

"Sleep" here is *screen sleep* (`pmset displaysleepnow`) so the host and its
API stay reachable — the iPad can then wake the screen back (`caffeinate -u`).
Full system sleep (`pmset sleepnow`) is deliberately not used so remote wake
actually works. Nothing here is exposed directly; only the allowlisted Command
Gateway may invoke it.
"""

import logging
import shutil
import subprocess

import psutil

from app.schemas.power import PowerOut

logger = logging.getLogger("silence.backend.power")


def _sleep_supported() -> bool:
    return shutil.which("pmset") is not None


def status() -> PowerOut:
    battery: int | None = None
    charging: bool | None = None
    try:
        b = psutil.sensors_battery()
        if b is not None:
            battery = round(b.percent)
            charging = bool(b.power_plugged)
    except Exception:
        logger.exception("battery read failed")
    return PowerOut(
        state="awake",
        battery=battery,
        charging=charging,
        sleep_supported=_sleep_supported(),
    )


def sleep() -> tuple[bool, str]:
    """Turn the display off (screen sleep). Returns (ok, message)."""
    pmset = shutil.which("pmset")
    if pmset is None:
        return False, "pmset executable not found"
    try:
        proc = subprocess.run(
            [pmset, "displaysleepnow"], capture_output=True, text=True, timeout=10
        )
    except Exception as exc:  # noqa: BLE001 — surface OS error to the command result
        return False, str(exc)
    if proc.returncode == 0:
        return True, "display sleep initiated"
    return False, (proc.stderr or "pmset displaysleepnow failed").strip()


def wake() -> tuple[bool, str]:
    """Wake the display via a brief user-activity assertion. Returns (ok, message)."""
    caffeinate = shutil.which("caffeinate")
    if caffeinate is None:
        return False, "caffeinate executable not found"
    try:
        proc = subprocess.run(
            [caffeinate, "-u", "-t", "1"], capture_output=True, text=True, timeout=10
        )
    except Exception as exc:  # noqa: BLE001 — surface OS error to the command result
        return False, str(exc)
    if proc.returncode == 0:
        return True, "display wake initiated"
    return False, (proc.stderr or "caffeinate failed").strip()


def display_on() -> bool:
    """Best-effort check of whether the display is currently on.

    Reads the most recent "Display is turned on/off" event from `pmset -g log`.
    Defaults to True on any doubt so a parse failure never shows a false
    "sleeping" state.
    """
    pmset = shutil.which("pmset")
    if pmset is None:
        return True
    try:
        proc = subprocess.run(
            [pmset, "-g", "log"], capture_output=True, text=True, timeout=10
        )
    except Exception:
        return True
    last_on = -1
    last_off = -1
    for idx, line in enumerate(proc.stdout.splitlines()):
        if "Display is turned on" in line:
            last_on = idx
        elif "Display is turned off" in line:
            last_off = idx
    if last_on == -1 and last_off == -1:
        return True
    return last_on > last_off