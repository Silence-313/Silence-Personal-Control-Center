#!/usr/bin/env python3
"""Generate the Silence PWA icons (no third-party deps).

Design: dark #0a0c0e canvas with an azure #59b7ff control-marker
(ring + center dot), supersampled for smooth edges.
"""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")

BG = (10, 12, 14)  # 0a0c0e
ACCENT = (89, 183, 255)  # 59b7ff


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_icon(size: int, out_path: str, ss: int = 3) -> None:
    cx = cy = (size * ss) / 2
    ring_r = size * ss * 0.30
    ring_t = size * ss * 0.052
    dot_r = size * ss * 0.135

    def sample(px: float, py: float) -> tuple[int, int, int]:
        d = math.hypot(px - cx, py - cy)
        if d <= dot_r or abs(d - ring_r) <= ring_t / 2:
            return ACCENT
        return BG

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # PNG filter byte
        for x in range(size):
            r = g = b = 0
            for dy in range(ss):
                for dx in range(ss):
                    cr, cg, cb = sample(x * ss + dx + 0.5, y * ss + dy + 0.5)
                    r += cr
                    g += cg
                    b += cb
            n = ss * ss
            raw += bytes((r // n, g // n, b // n, 255))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", ihdr)
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")

    with open(out_path, "wb") as f:
        f.write(png)
    print(f"wrote {out_path}")


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size, name in [
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (180, "apple-touch-icon.png"),
    ]:
        make_icon(size, os.path.join(OUT_DIR, name))


if __name__ == "__main__":
    main()