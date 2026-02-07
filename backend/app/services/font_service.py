"""
Font Service
Manages 10 Indian-popular fonts with Devanagari support.
Download script + font registry for thumbnail generation.
"""

import os
import asyncio
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class FontInfo:
    """Font metadata."""
    id: str
    name: str
    family: str
    script: str           # "latin", "devanagari", "both"
    style: str            # "bold", "regular", "extrabold"
    weight: int           # 400, 700, 900 …
    google_font: bool     # downloadable from Google Fonts
    filename: str
    preview_text: str     # sample text for UI
    url: Optional[str] = None  # direct download URL (Google Fonts CSS)


# ── 10 Indian-popular fonts ──────────────────────────────────────────────────
FONT_REGISTRY: list[FontInfo] = [
    # ── Devanagari (Hindi) ─────────────────────────────────────────────────
    FontInfo(
        id="noto-sans-devanagari-bold",
        name="Noto Sans Devanagari Bold",
        family="Noto Sans Devanagari",
        script="devanagari",
        style="bold",
        weight=700,
        google_font=True,
        filename="NotoSansDevanagari-Bold.ttf",
        preview_text="हिंदी टेक्स्ट",
        url="https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
    ),
    FontInfo(
        id="noto-sans-devanagari-regular",
        name="Noto Sans Devanagari Regular",
        family="Noto Sans Devanagari",
        script="devanagari",
        style="regular",
        weight=400,
        google_font=True,
        filename="NotoSansDevanagari-Regular.ttf",
        preview_text="हिंदी टेक्स्ट",
        url="https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
    ),
    FontInfo(
        id="tiro-devanagari-hindi",
        name="Tiro Devanagari Hindi",
        family="Tiro Devanagari Hindi",
        script="devanagari",
        style="regular",
        weight=400,
        google_font=True,
        filename="TiroDevanagariHindi-Regular.ttf",
        preview_text="शीर्षक यहाँ",
        url="https://github.com/google/fonts/raw/main/ofl/tirodevanagariHindi/TiroDevanagariHindi-Regular.ttf",
    ),
    FontInfo(
        id="mukta-bold",
        name="Mukta Bold",
        family="Mukta",
        script="both",
        style="bold",
        weight=700,
        google_font=True,
        filename="Mukta-Bold.ttf",
        preview_text="Mukta बोल्ड",
        url="https://github.com/google/fonts/raw/main/ofl/mukta/Mukta-Bold.ttf",
    ),
    FontInfo(
        id="poppins-extrabold",
        name="Poppins ExtraBold",
        family="Poppins",
        script="latin",
        style="extrabold",
        weight=800,
        google_font=True,
        filename="Poppins-ExtraBold.ttf",
        preview_text="BOLD TEXT",
        url="https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-ExtraBold.ttf",
    ),
    # ── Bold display (YouTube popular) ─────────────────────────────────────
    FontInfo(
        id="poppins-black",
        name="Poppins Black",
        family="Poppins",
        script="latin",
        style="bold",
        weight=900,
        google_font=True,
        filename="Poppins-Black.ttf",
        preview_text="IMPACT TEXT",
        url="https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Black.ttf",
    ),
    FontInfo(
        id="montserrat-extrabold",
        name="Montserrat ExtraBold",
        family="Montserrat",
        script="latin",
        style="extrabold",
        weight=800,
        google_font=True,
        filename="Montserrat-ExtraBold.ttf",
        preview_text="MONTSERRAT",
        url="https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    ),
    FontInfo(
        id="bebas-neue",
        name="Bebas Neue",
        family="Bebas Neue",
        script="latin",
        style="regular",
        weight=400,
        google_font=True,
        filename="BebasNeue-Regular.ttf",
        preview_text="BEBAS NEUE",
        url="https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    ),
    FontInfo(
        id="oswald-bold",
        name="Oswald Bold",
        family="Oswald",
        script="latin",
        style="bold",
        weight=700,
        google_font=True,
        filename="Oswald-Bold.ttf",
        preview_text="OSWALD BOLD",
        url="https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf",
    ),
    FontInfo(
        id="baloo2-extrabold",
        name="Baloo 2 ExtraBold",
        family="Baloo 2",
        script="both",
        style="extrabold",
        weight=800,
        google_font=True,
        filename="Baloo2-ExtraBold.ttf",
        preview_text="Baloo बालू",
        url="https://github.com/google/fonts/raw/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf",
    ),
]

FONT_DIR = Path(__file__).resolve().parent.parent.parent / "assets" / "fonts"


def get_font_dir() -> Path:
    """Return the font directory, creating it if needed."""
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    return FONT_DIR


def get_font_path(font_id: str) -> Optional[Path]:
    """Get local path for a font by ID. Returns None if not downloaded."""
    for font in FONT_REGISTRY:
        if font.id == font_id:
            path = get_font_dir() / font.filename
            if path.exists():
                return path
            # Try variable font fallback
            return _find_best_local(font)
    return None


def get_font_by_id(font_id: str) -> Optional[FontInfo]:
    """Lookup font metadata."""
    for font in FONT_REGISTRY:
        if font.id == font_id:
            return font
    return None


def get_devanagari_font_path() -> Path:
    """Return path to best available Devanagari font."""
    for fid in ["noto-sans-devanagari-bold", "mukta-bold", "baloo2-extrabold",
                 "noto-sans-devanagari-regular", "tiro-devanagari-hindi"]:
        p = get_font_path(fid)
        if p and p.exists():
            return p
    # Fallback to settings path
    return Path(settings.HINDI_FONT_PATH)


def _find_best_local(font: FontInfo) -> Optional[Path]:
    """Search font dir for any file matching the family."""
    d = get_font_dir()
    if not d.exists():
        return None
    family_lower = font.family.lower().replace(" ", "")
    for f in d.iterdir():
        if family_lower in f.name.lower().replace(" ", ""):
            return f
    return None


def list_fonts(script_filter: Optional[str] = None) -> list[dict]:
    """
    List all fonts with availability status.
    
    Args:
        script_filter: "devanagari", "latin", "both" or None for all
    """
    result = []
    for font in FONT_REGISTRY:
        if script_filter and font.script != script_filter and font.script != "both":
            continue
        path = get_font_path(font.id)
        result.append({
            "id": font.id,
            "name": font.name,
            "family": font.family,
            "script": font.script,
            "style": font.style,
            "weight": font.weight,
            "preview_text": font.preview_text,
            "available": path is not None and path.exists(),
        })
    return result


async def download_font(font_id: str) -> Path:
    """
    Download a font from Google Fonts to local assets/fonts/.
    Returns the local Path.
    """
    font = get_font_by_id(font_id)
    if not font:
        raise ValueError(f"Unknown font: {font_id}")
    if not font.url:
        raise ValueError(f"No download URL for font: {font_id}")

    dest = get_font_dir() / font.filename
    if dest.exists():
        return dest

    async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
        resp = await client.get(font.url)
        resp.raise_for_status()
        dest.write_bytes(resp.content)

    return dest


async def ensure_core_fonts() -> list[str]:
    """
    Download the minimum set of fonts needed for Hindi + English thumbnails.
    Called on startup or first thumbnail generation.
    Returns list of successfully downloaded font IDs.
    """
    core_ids = [
        "noto-sans-devanagari-bold",
        "poppins-extrabold",
        "mukta-bold",
        "bebas-neue",
    ]
    downloaded = []
    for fid in core_ids:
        try:
            await download_font(fid)
            downloaded.append(fid)
        except Exception:
            pass  # non-fatal — will use fallback
    return downloaded
