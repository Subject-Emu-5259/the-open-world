#!/usr/bin/env python3
"""Build the TOW desktop icon set from the OW explorer badge.

Source: build/icon-source.png — the-open-world-badge.png (1600x1600,
the OW explorer badge, the same art KOVA v1.2.1 shipped and the
Reddit icon was corrected to on 2026-11-14).

Outputs (electron-builder picks these up from buildResources):
  build/icon.png   1024x1024 PNG (Linux + fallback)
  build/icon.ico   multi-size ICO (Windows: 16/32/48/256)
  build/icon.icns  macOS icon set (ic07 128 / ic08 256 / ic09 512 /
                   ic10 1024, PNG-compressed elements)

The .icns writer is minimal but spec-shaped: 'icns' magic + uint32BE
total size, then one element per size (4-byte OSType + uint32BE
element size including its 8-byte header + PNG data). iconutil is
macOS-only, so the set is built here and verified by parsing it back
(scripts/build-icons.py --verify). Re-run any time the source badge
changes:  python3 scripts/build-icons.py
"""
import struct
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
BUILD = HERE.parent / "build"
SOURCE = BUILD / "icon-source.png"

# macOS icns element types for the PNG-compressed sizes.
ICNS_ELEMENTS = [("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)]
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (256, 256)]


def build_icns(im: Image.Image) -> bytes:
    body = b""
    for ostype, size in ICNS_ELEMENTS:
        resized = im.resize((size, size), Image.LANCZOS)
        import io

        buf = io.BytesIO()
        resized.save(buf, format="PNG")
        data = buf.getvalue()
        body += ostype.encode("ascii") + struct.pack(">I", len(data) + 8) + data
    return b"icns" + struct.pack(">I", len(body) + 8) + body


def parse_icns(path: Path):
    """Verify an .icns file: returns [(ostype, size, data_len)]."""
    raw = path.read_bytes()
    assert raw[:4] == b"icns", "bad icns magic"
    (total,) = struct.unpack(">I", raw[4:8])
    assert total == len(raw), f"icns total size {total} != file size {len(raw)}"
    out = []
    off = 8
    while off < len(raw):
        ostype = raw[off : off + 4].decode("ascii")
        (size,) = struct.unpack(">I", raw[off + 4 : off + 8])
        assert size >= 8 and off + size <= len(raw), f"bad element {ostype} size {size}"
        data = raw[off + 8 : off + size]
        assert data[:8] == b"\x89PNG\r\n\x1a\n", f"element {ostype} is not PNG data"
        out.append((ostype, size, len(data)))
        off += size
    return out


def main() -> int:
    if "--verify" in sys.argv:
        for name, size in ICNS_ELEMENTS:
            pass
        print("icon.icns:", parse_icns(BUILD / "icon.icns"))
        for f in ("icon.png", "icon.ico"):
            im = Image.open(BUILD / f)
            print(f, im.format, im.size, im.mode)
        return 0
    im = Image.open(SOURCE).convert("RGBA")
    assert im.size == (1600, 1600), f"unexpected source size {im.size}"
    icon_png = im.resize((1024, 1024), Image.LANCZOS)
    icon_png.save(BUILD / "icon.png", format="PNG")
    print(f"icon.png: 1024x1024 ({(BUILD / 'icon.png').stat().st_size:,} B)")
    im.save(BUILD / "icon.ico", format="ICO", sizes=ICO_SIZES)
    print(f"icon.ico: sizes {[f'{w}x{h}' for w, h in ICO_SIZES]} ({(BUILD / 'icon.ico').stat().st_size:,} B)")
    (BUILD / "icon.icns").write_bytes(build_icns(im))
    print(f"icon.icns: {parse_icns(BUILD / 'icon.icns')} ({(BUILD / 'icon.icns').stat().st_size:,} B)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
