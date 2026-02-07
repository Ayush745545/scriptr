"""
Thumbnail Generation Service — v2
AI-powered thumbnail creation with:
  • 3 variations per generation (Instagram 1080×1080 + YouTube 1280×720)
  • Face detection / auto-crop
  • One-click enhance (auto-contrast, face brightening)
  • Hindi/English text overlay with 10 Indian fonts
  • DALL-E 3 background generation
  • Sticker/emoji overlay
"""

import io
import json
import math
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID

from PIL import (
    Image,
    ImageDraw,
    ImageEnhance,
    ImageFilter,
    ImageFont,
    ImageOps,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
import httpx
import openai

from app.core.config import settings
from app.models.thumbnail import Thumbnail, ThumbnailStatus, ThumbnailStyle
from app.schemas.thumbnail import ThumbnailGenerateRequest
from app.services.storage_service import StorageService
from app.services.font_service import (
    get_font_path,
    get_font_by_id,
    get_devanagari_font_path,
    ensure_core_fonts,
    FONT_REGISTRY,
)

# ── Thumbnail output presets ────────────────────────────────────────────────
SIZE_PRESETS = {
    "youtube":   (1280, 720),
    "instagram": (1080, 1080),
    "story":     (1080, 1920),
}

# ── 5 Indian-niche thumbnail formulas ───────────────────────────────────────
THUMBNAIL_FORMULAS: list[dict] = [
    {
        "id": "shocked_face_arrow",
        "name": "Shocked Face + Arrow + Text",
        "name_hi": "हैरान चेहरा + तीर + टेक्स्ट",
        "description": "Classic Indian YouTube formula — shocked/open-mouth face on right, big bold text on left, a red/yellow arrow pointing at the subject. Works for tech unboxings, reveal videos, reaction content.",
        "niche": ["tech", "reaction", "unboxing", "vlog"],
        "layout": {
            "face_position": "right",
            "face_scale": 0.85,
            "text_position": "left",
            "arrow": True,
            "arrow_color": "#FF0000",
            "background": "gradient",
            "gradient_colors": ["#1a1a2e", "#16213e"],
        },
        "suggested_emojis": ["😱", "🔥", "👆", "⚡"],
        "example_text": "₹999 में iPhone?!",
        "example_text_en": "iPhone at ₹999?!",
    },
    {
        "id": "before_after_split",
        "name": "Before / After Split Screen",
        "name_hi": "पहले / बाद में स्प्लिट स्क्रीन",
        "description": "Vertical split — 'Before' on left, 'After' on right with a diagonal or straight divider. Great for fitness, skincare, makeover, home renovation content popular with Indian audiences.",
        "niche": ["fitness", "beauty", "home", "transformation"],
        "layout": {
            "split": "vertical",
            "divider_angle": 10,
            "divider_color": "#FFD700",
            "divider_width": 8,
            "left_label": "BEFORE",
            "right_label": "AFTER",
            "label_bg": "#000000CC",
        },
        "suggested_emojis": ["💪", "✨", "🏋️", "🔄"],
        "example_text": "30 दिन में बदलाव",
        "example_text_en": "30-Day Transformation",
    },
    {
        "id": "text_heavy_listicle",
        "name": "Text-Heavy Listicle / Numbered",
        "name_hi": "टेक्स्ट-हैवी लिस्ट / नंबर वाला",
        "description": "Big number (e.g. '5' or '10') in a circle or bold block, with short title text. Minimal face. Used heavily by Indian edu-YouTubers and finance channels.",
        "niche": ["education", "finance", "business", "tips"],
        "layout": {
            "number_circle": True,
            "number_bg": "#FF0000",
            "number_color": "#FFFFFF",
            "number_size_ratio": 0.35,
            "text_position": "center-right",
            "face_position": "bottom-right",
            "face_scale": 0.5,
        },
        "suggested_emojis": ["📌", "🎯", "💡", "📊"],
        "example_text": "5 गलतियाँ जो सब करते हैं",
        "example_text_en": "5 Mistakes Everyone Makes",
    },
    {
        "id": "minimal_gradient",
        "name": "Minimal Gradient + Centered Text",
        "name_hi": "मिनिमल ग्रेडिएंट + सेंटर टेक्स्ट",
        "description": "Clean gradient background with large centered text — no face. Works for motivational, poetry, quotes, and topic-based channels. Very Instagram-native for carousels.",
        "niche": ["motivation", "poetry", "quotes", "podcast"],
        "layout": {
            "background": "gradient",
            "gradient_colors": ["#667eea", "#764ba2"],
            "text_position": "center",
            "text_align": "center",
            "face_position": "none",
            "subtitle_bar": True,
            "subtitle_bar_color": "#00000066",
        },
        "suggested_emojis": ["🙏", "💫", "🌟", "🎙️"],
        "example_text": "सफलता का रहस्य",
        "example_text_en": "The Secret to Success",
    },
    {
        "id": "food_closeup_badge",
        "name": "Food Close-Up + Badge / Price Tag",
        "name_hi": "फ़ूड क्लोज़-अप + बैज / प्राइस टैग",
        "description": "Large food photo filling the frame, with a coloured badge/sticker in corner showing the price (₹49!!) or rating (⭐ 4.8). Popular with Indian food vloggers and street food channels.",
        "niche": ["food", "street_food", "restaurant", "recipe"],
        "layout": {
            "background": "image",
            "image_fill": "cover",
            "badge_position": "top-right",
            "badge_shape": "circle",
            "badge_bg": "#FF6B35",
            "badge_text_color": "#FFFFFF",
            "face_position": "bottom-left",
            "face_scale": 0.35,
            "vignette": True,
        },
        "suggested_emojis": ["🍛", "🔥", "⭐", "₹"],
        "example_text": "₹49 में UNLIMITED थाली!",
        "example_text_en": "UNLIMITED Thali at ₹49!",
    },
]


class ThumbnailService:
    """Service for AI-powered thumbnail generation."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage = StorageService()
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # ── CRUD ────────────────────────────────────────────────────────────────

    async def create_thumbnail(
        self,
        user_id: UUID,
        request: ThumbnailGenerateRequest,
    ) -> Thumbnail:
        """Create thumbnail record and kick off generation."""
        thumbnail = Thumbnail(
            user_id=user_id,
            project_id=request.project_id,
            title=request.title,
            primary_text=request.primary_text,
            secondary_text=request.secondary_text,
            style=request.style,
            primary_color=request.primary_color,
            secondary_color=request.secondary_color,
            background_color=request.background_color,
            font_family=request.font_family,
            font_size=request.font_size,
            source_image_url=request.source_image_url,
            face_image_url=request.face_image_url,
            ai_prompt=request.ai_background_prompt,
            ai_generated_background=bool(request.ai_background_prompt),
            width=request.width,
            height=request.height,
            status=ThumbnailStatus.PENDING,
        )
        self.db.add(thumbnail)
        await self.db.commit()
        await self.db.refresh(thumbnail)
        return thumbnail

    # ── Main generation pipeline ────────────────────────────────────────────

    async def generate_thumbnail(
        self,
        thumbnail_id: UUID,
        generate_variants: int = 3,
        output_sizes: Optional[list[str]] = None,
        formula_id: Optional[str] = None,
        enhance: bool = False,
        stickers: Optional[list[dict]] = None,
    ):
        """
        Generate thumbnail images.

        Each variant is rendered at every requested output_size
        (default: youtube + instagram).
        """
        result = await self.db.execute(
            select(Thumbnail).where(Thumbnail.id == thumbnail_id)
        )
        thumbnail = result.scalar_one_or_none()
        if not thumbnail:
            return

        try:
            thumbnail.status = ThumbnailStatus.GENERATING
            await self.db.commit()

            # Make sure we have fonts
            await ensure_core_fonts()

            if output_sizes is None:
                output_sizes = ["youtube", "instagram"]

            # Look up formula layout hints
            formula = None
            if formula_id:
                formula = next((f for f in THUMBNAIL_FORMULAS if f["id"] == formula_id), None)

            all_variants: list[dict] = []

            for vi in range(generate_variants):
                size_outputs: dict[str, str] = {}

                for size_key in output_sizes:
                    w, h = SIZE_PRESETS.get(size_key, (thumbnail.width, thumbnail.height))

                    # 1. Base image
                    base = await self._make_base_image(thumbnail, w, h, formula)

                    # 2. Face overlay
                    if thumbnail.face_image_url:
                        face_img = await self._download_image(thumbnail.face_image_url)
                        base = self._add_face_to_thumbnail(
                            base, face_img, thumbnail.style, formula
                        )

                    # 3. Text overlay
                    base = self._add_text_overlay(
                        image=base,
                        primary_text=thumbnail.primary_text,
                        secondary_text=thumbnail.secondary_text,
                        font_family=thumbnail.font_family,
                        font_size=thumbnail.font_size,
                        primary_color=thumbnail.primary_color,
                        secondary_color=thumbnail.secondary_color,
                        style=thumbnail.style,
                        formula=formula,
                    )

                    # 4. Sticker/emoji overlay
                    if stickers:
                        base = self._add_stickers(base, stickers)

                    # 5. One-click enhance
                    if enhance:
                        base = self._one_click_enhance(base)

                    # 6. Upload
                    buf = io.BytesIO()
                    base.save(buf, format="PNG", quality=95)
                    buf.seek(0)

                    fname = f"{thumbnail.title}_v{vi+1}_{size_key}.png"
                    url = await self.storage.upload_file_content(
                        content=buf.read(),
                        filename=fname,
                        folder=f"thumbnails/{thumbnail.user_id}",
                        content_type="image/png",
                    )
                    size_outputs[size_key] = url

                all_variants.append({
                    "variant_index": vi,
                    "sizes": size_outputs,
                    "url": size_outputs.get("youtube") or list(size_outputs.values())[0],
                })

            thumbnail.output_url = all_variants[0]["url"]
            thumbnail.output_variants = all_variants
            thumbnail.status = ThumbnailStatus.COMPLETED

        except Exception as e:
            thumbnail.status = ThumbnailStatus.FAILED
            thumbnail.error_message = str(e)

        await self.db.commit()

    # ── Base image creation ─────────────────────────────────────────────────

    async def _make_base_image(
        self,
        thumbnail: Thumbnail,
        w: int,
        h: int,
        formula: Optional[dict],
    ) -> Image.Image:
        """Create the background layer."""
        if thumbnail.ai_prompt:
            return await self._generate_ai_background(thumbnail.ai_prompt, w, h)

        if thumbnail.source_image_url:
            img = await self._download_image(thumbnail.source_image_url)
            return ImageOps.fit(img, (w, h), method=Image.Resampling.LANCZOS)

        # Solid / gradient
        if formula and formula.get("layout", {}).get("background") == "gradient":
            colors = formula["layout"].get("gradient_colors", ["#1a1a2e", "#16213e"])
            return self._make_gradient(w, h, colors)

        bg_color = thumbnail.background_color or "#1a1a2e"
        return Image.new("RGB", (w, h), bg_color)

    def _make_gradient(self, w: int, h: int, colors: list[str]) -> Image.Image:
        """Linear gradient between two hex colours."""
        img = Image.new("RGB", (w, h))
        c1 = self._hex_to_rgb(colors[0])
        c2 = self._hex_to_rgb(colors[1]) if len(colors) > 1 else c1
        for y in range(h):
            ratio = y / max(h - 1, 1)
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            for x in range(w):
                img.putpixel((x, y), (r, g, b))
        return img

    # ── AI background (DALL-E 3) ────────────────────────────────────────────

    async def _generate_ai_background(
        self,
        prompt: str,
        width: int,
        height: int,
    ) -> Image.Image:
        """Generate background using DALL-E 3."""
        aspect = width / height
        if aspect > 1.3:
            size = "1792x1024"
        elif aspect < 0.8:
            size = "1024x1792"
        else:
            size = "1024x1024"

        response = await self.client.images.generate(
            model="dall-e-3",
            prompt=(
                f"YouTube/Instagram thumbnail background: {prompt}. "
                "Vibrant, eye-catching, leave space for text overlay. "
                "No text in image. High contrast. Indian audience aesthetic."
            ),
            size=size,
            quality="hd",
            n=1,
        )
        url = response.data[0].url
        img = await self._download_image(url)
        return ImageOps.fit(img, (width, height), method=Image.Resampling.LANCZOS)

    # ── Face handling ───────────────────────────────────────────────────────

    def _detect_face_region(self, image: Image.Image) -> Optional[tuple[int, int, int, int]]:
        """
        Simple face-region heuristic using skin-tone detection.
        Returns (left, top, right, bottom) of the dominant skin-tone cluster.
        For production, swap with dlib / mediapipe.
        """
        small = image.copy()
        small.thumbnail((200, 200))
        pixels = list(small.getdata())
        w_s, h_s = small.size

        skin_pixels = []
        for i, (r, g, b, *_rest) in enumerate(pixels):
            # Rough skin-tone detection (works for most Indian skin tones)
            if (r > 80 and g > 50 and b > 30 and
                r > g and r > b and
                abs(r - g) > 10 and
                r - b > 20):
                x = i % w_s
                y = i // w_s
                skin_pixels.append((x, y))

        if len(skin_pixels) < 20:
            return None

        xs = [p[0] for p in skin_pixels]
        ys = [p[1] for p in skin_pixels]

        scale_x = image.width / w_s
        scale_y = image.height / h_s

        left = int(min(xs) * scale_x)
        top = int(min(ys) * scale_y)
        right = int(max(xs) * scale_x)
        bottom = int(max(ys) * scale_y)

        # Expand region by 30%
        pad_x = int((right - left) * 0.3)
        pad_y = int((bottom - top) * 0.3)
        left = max(0, left - pad_x)
        top = max(0, top - pad_y)
        right = min(image.width, right + pad_x)
        bottom = min(image.height, bottom + pad_y)

        return (left, top, right, bottom)

    def _auto_crop_face(self, image: Image.Image, target_w: int, target_h: int) -> Image.Image:
        """Crop image to centre on detected face area."""
        region = self._detect_face_region(image)
        if not region:
            return ImageOps.fit(image, (target_w, target_h), method=Image.Resampling.LANCZOS)

        fl, ft, fr, fb = region
        face_cx = (fl + fr) // 2
        face_cy = (ft + fb) // 2

        # Calculate crop box centred on face
        aspect = target_w / target_h
        if image.width / image.height > aspect:
            crop_h = image.height
            crop_w = int(crop_h * aspect)
        else:
            crop_w = image.width
            crop_h = int(crop_w / aspect)

        cx = max(crop_w // 2, min(face_cx, image.width - crop_w // 2))
        cy = max(crop_h // 2, min(face_cy, image.height - crop_h // 2))

        box = (
            cx - crop_w // 2,
            cy - crop_h // 2,
            cx + crop_w // 2,
            cy + crop_h // 2,
        )
        cropped = image.crop(box)
        return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    def _add_face_to_thumbnail(
        self,
        base_image: Image.Image,
        face_image: Image.Image,
        style: ThumbnailStyle,
        formula: Optional[dict] = None,
    ) -> Image.Image:
        """Composite face image onto thumbnail."""
        base = base_image.convert("RGBA")
        face = face_image.convert("RGBA")

        layout = (formula or {}).get("layout", {})
        face_scale = layout.get("face_scale", 0.8)
        face_pos = layout.get("face_position", "right")

        face_height = int(base.height * face_scale)
        aspect = face.width / face.height
        face_width = int(face_height * aspect)
        face = face.resize((face_width, face_height), Image.Resampling.LANCZOS)

        if face_pos == "left":
            x, y = 20, base.height - face_height
        elif face_pos == "bottom-left":
            x, y = 10, base.height - face_height
        elif face_pos == "bottom-right":
            x, y = base.width - face_width - 10, base.height - face_height
        elif face_pos == "center":
            x = (base.width - face_width) // 2
            y = base.height - face_height
        elif face_pos == "none":
            return base.convert("RGB")
        else:  # right (default)
            x = base.width - face_width - 20
            y = base.height - face_height

        base.paste(face, (x, y), face)
        return base.convert("RGB")

    # ── Text overlay ────────────────────────────────────────────────────────

    def _load_font(self, family_or_id: str, size: int) -> ImageFont.FreeTypeFont:
        """Load font by font_id or family name, with fallback chain."""
        # Try font_id first
        path = get_font_path(family_or_id)
        if path and path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                pass

        # Try by family name match
        for font in FONT_REGISTRY:
            if font.family.lower() == family_or_id.lower():
                p = get_font_path(font.id)
                if p and p.exists():
                    try:
                        return ImageFont.truetype(str(p), size)
                    except Exception:
                        pass

        # Devanagari fallback
        deva = get_devanagari_font_path()
        if deva.exists():
            try:
                return ImageFont.truetype(str(deva), size)
            except Exception:
                pass

        # System font fallback
        try:
            return ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size
            )
        except Exception:
            return ImageFont.load_default()

    def _has_devanagari(self, text: str) -> bool:
        return any("\u0900" <= c <= "\u097F" for c in text)

    def _add_text_overlay(
        self,
        image: Image.Image,
        primary_text: Optional[str],
        secondary_text: Optional[str],
        font_family: str,
        font_size: int,
        primary_color: str,
        secondary_color: str,
        style: ThumbnailStyle,
        formula: Optional[dict] = None,
    ) -> Image.Image:
        """Add text with shadow + stroke. Handles Hindi Unicode."""
        draw = ImageDraw.Draw(image)
        width, height = image.size

        # Choose font
        if primary_text and self._has_devanagari(primary_text):
            font_id = "noto-sans-devanagari-bold"
        else:
            font_id = font_family

        primary_font = self._load_font(font_id, font_size)
        secondary_font = self._load_font(font_id, int(font_size * 0.55))

        # Normalize Unicode
        if primary_text:
            primary_text = unicodedata.normalize("NFC", primary_text)
        if secondary_text:
            secondary_text = unicodedata.normalize("NFC", secondary_text)

        layout = (formula or {}).get("layout", {})
        text_pos = layout.get("text_position", None)

        # ── Primary text ─────────────────────────────────────────────
        y_cursor = 40
        if primary_text:
            # Word-wrap
            lines = self._wrap_text(primary_text, primary_font, int(width * 0.65), draw)

            # Position
            if text_pos == "center" or style == ThumbnailStyle.CLICKBAIT:
                # Centred
                total_h = sum(self._line_height(l, primary_font, draw) for l in lines)
                total_h += (len(lines) - 1) * 8
                y_cursor = (height - total_h) // 2
                for line in lines:
                    bbox = draw.textbbox((0, 0), line, font=primary_font)
                    tw = bbox[2] - bbox[0]
                    x = (width - tw) // 2
                    self._draw_text_with_effects(draw, x, y_cursor, line, primary_font, primary_color)
                    y_cursor += self._line_height(line, primary_font, draw) + 8
            elif text_pos == "left" or style == ThumbnailStyle.YOUTUBE_STANDARD:
                y_cursor = height // 2 - 60
                for line in lines:
                    self._draw_text_with_effects(draw, 40, y_cursor, line, primary_font, primary_color)
                    y_cursor += self._line_height(line, primary_font, draw) + 8
            else:
                for line in lines:
                    self._draw_text_with_effects(draw, 40, y_cursor, line, primary_font, primary_color)
                    y_cursor += self._line_height(line, primary_font, draw) + 8

        # ── Secondary text ───────────────────────────────────────────
        if secondary_text:
            lines = self._wrap_text(secondary_text, secondary_font, int(width * 0.7), draw)
            y_cursor += 12
            for line in lines:
                if text_pos == "center" or style == ThumbnailStyle.CLICKBAIT:
                    bbox = draw.textbbox((0, 0), line, font=secondary_font)
                    tw = bbox[2] - bbox[0]
                    x = (width - tw) // 2
                else:
                    x = 40
                self._draw_text_with_effects(
                    draw, x, y_cursor, line, secondary_font, secondary_color, stroke_w=1
                )
                y_cursor += self._line_height(line, secondary_font, draw) + 6

        return image

    def _wrap_text(
        self, text: str, font: ImageFont.FreeTypeFont, max_w: int, draw: ImageDraw.Draw
    ) -> list[str]:
        """Word-wrap text to fit within max_w pixels."""
        words = text.split()
        lines: list[str] = []
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_w:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines or [text]

    def _line_height(self, text: str, font: ImageFont.FreeTypeFont, draw: ImageDraw.Draw) -> int:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[3] - bbox[1]

    def _draw_text_with_effects(
        self,
        draw: ImageDraw.Draw,
        x: int,
        y: int,
        text: str,
        font: ImageFont.FreeTypeFont,
        color: str,
        stroke_w: int = 3,
    ):
        """Draw text with shadow + outline stroke."""
        # Shadow
        draw.text((x + 3, y + 3), text, font=font, fill="#000000")
        # Main text with stroke
        draw.text(
            (x, y), text, font=font, fill=color,
            stroke_width=stroke_w, stroke_fill="#000000",
        )

    # ── Stickers / Emojis ──────────────────────────────────────────────────

    def _add_stickers(self, image: Image.Image, stickers: list[dict]) -> Image.Image:
        """
        Overlay sticker/emoji images onto the thumbnail.

        Each sticker dict:
          { "emoji": "🔥", "x": 0.8, "y": 0.1, "size": 80 }
          x, y are 0–1 normalised coords.
        """
        draw = ImageDraw.Draw(image)
        w, h = image.size

        for s in stickers:
            sx = int(s.get("x", 0.5) * w)
            sy = int(s.get("y", 0.5) * h)
            size = s.get("size", 64)
            emoji = s.get("emoji", "")
            img_url = s.get("image_url")

            if img_url:
                pass  # handled externally via async download
            elif emoji:
                try:
                    efont = ImageFont.truetype(
                        "/System/Library/Fonts/Apple Color Emoji.ttc", size
                    )
                except Exception:
                    try:
                        efont = ImageFont.truetype(
                            "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", size
                        )
                    except Exception:
                        efont = self._load_font("poppins-extrabold", size)
                draw.text((sx, sy), emoji, font=efont, embedded_color=True)

        return image

    # ── One-click enhance ───────────────────────────────────────────────────

    def _one_click_enhance(self, image: Image.Image) -> Image.Image:
        """
        Auto-enhance thumbnail:
        1. Auto-contrast
        2. Slight saturation boost (Indian thumbnails are saturated)
        3. Sharpen
        4. Face-area brightening
        """
        # 1. Auto-contrast
        image = ImageOps.autocontrast(image, cutoff=1)

        # 2. Saturation + 20%
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.2)

        # 3. Sharpen
        image = image.filter(ImageFilter.SHARPEN)

        # 4. Brighten face region
        region = self._detect_face_region(image)
        if region:
            fl, ft, fr, fb = region
            face_crop = image.crop(region)
            bright = ImageEnhance.Brightness(face_crop)
            face_crop = bright.enhance(1.15)
            image.paste(face_crop, (fl, ft))

        return image

    # ── Upload helpers ──────────────────────────────────────────────────────

    async def _download_image(self, url: str) -> Image.Image:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url)
            return Image.open(io.BytesIO(resp.content))

    async def upload_face_image(self, user_id: UUID, file: UploadFile) -> dict:
        """Upload face image, detect face, return metadata."""
        content = await file.read()
        image = Image.open(io.BytesIO(content))

        face_region = self._detect_face_region(image)
        face_detected = face_region is not None

        url = await self.storage.upload_file_content(
            content=content,
            filename=f"face_{user_id}_{file.filename}",
            folder=f"faces/{user_id}",
            content_type=file.content_type,
        )

        return {
            "url": url,
            "face_detected": face_detected,
            "face_region": face_region,
            "background_removed": False,
        }

    async def create_variant(
        self,
        original: Thumbnail,
        variant_name: str,
        changes: dict,
    ) -> Thumbnail:
        """Create A/B test variant."""
        variant = Thumbnail(
            user_id=original.user_id,
            project_id=original.project_id,
            title=f"{original.title} - {variant_name}",
            primary_text=changes.get("primary_text", original.primary_text),
            secondary_text=changes.get("secondary_text", original.secondary_text),
            style=changes.get("style", original.style),
            primary_color=changes.get("primary_color", original.primary_color),
            secondary_color=changes.get("secondary_color", original.secondary_color),
            background_color=changes.get("background_color", original.background_color),
            font_family=changes.get("font_family", original.font_family),
            font_size=changes.get("font_size", original.font_size),
            source_image_url=original.source_image_url,
            face_image_url=original.face_image_url,
            ai_prompt=original.ai_prompt,
            ai_generated_background=original.ai_generated_background,
            width=original.width,
            height=original.height,
            variant_name=variant_name,
            parent_thumbnail_id=original.id,
            status=ThumbnailStatus.PENDING,
        )
        self.db.add(variant)
        await self.db.commit()
        await self.db.refresh(variant)
        return variant

    # ── Render from editor JSON (canvas state) ──────────────────────────────

    async def render_from_editor(
        self,
        user_id: UUID,
        canvas_json: dict,
        output_sizes: list[str],
        enhance: bool = False,
    ) -> list[dict]:
        """
        Render final thumbnails from the frontend canvas-editor state.

        canvas_json = {
            "width": 1280, "height": 720,
            "backgroundColor": "#1a1a2e",
            "layers": [
                { "type": "image", "src": "...", "x": 0, "y": 0, "width": 1280, "height": 720, "opacity": 1 },
                { "type": "text", "text": "...", "x": 100, "y": 200, "fontFamily": "...", "fontSize": 72, "fill": "#FFF", "stroke": "#000", "strokeWidth": 3 },
                { "type": "emoji", "emoji": "🔥", "x": 900, "y": 50, "size": 80 },
            ]
        }
        """
        cw = canvas_json.get("width", 1280)
        ch = canvas_json.get("height", 720)
        bg = canvas_json.get("backgroundColor", "#1a1a2e")
        layers = canvas_json.get("layers", [])

        results = []

        for size_key in output_sizes:
            tw, th = SIZE_PRESETS.get(size_key, (cw, ch))
            sx = tw / cw
            sy = th / ch

            img = Image.new("RGB", (tw, th), bg)

            for layer in layers:
                lt = layer.get("type", "")

                if lt == "image" and layer.get("src"):
                    try:
                        src_img = await self._download_image(layer["src"])
                        lw = int(layer.get("width", src_img.width) * sx)
                        lh = int(layer.get("height", src_img.height) * sy)
                        src_img = src_img.resize((lw, lh), Image.Resampling.LANCZOS)
                        lx = int(layer.get("x", 0) * sx)
                        ly = int(layer.get("y", 0) * sy)
                        if src_img.mode == "RGBA":
                            img.paste(src_img, (lx, ly), src_img)
                        else:
                            img.paste(src_img, (lx, ly))
                    except Exception:
                        pass

                elif lt == "text" and layer.get("text"):
                    draw = ImageDraw.Draw(img)
                    fs = int(layer.get("fontSize", 48) * min(sx, sy))
                    font_id = layer.get("fontFamily", "poppins-extrabold")
                    font = self._load_font(font_id, fs)
                    lx = int(layer.get("x", 0) * sx)
                    ly = int(layer.get("y", 0) * sy)
                    fill = layer.get("fill", "#FFFFFF")
                    stroke = layer.get("stroke", "#000000")
                    sw = layer.get("strokeWidth", 3)
                    self._draw_text_with_effects(
                        draw, lx, ly, layer["text"], font, fill, stroke_w=sw
                    )

                elif lt == "emoji" and layer.get("emoji"):
                    self._add_stickers(img, [{
                        "emoji": layer["emoji"],
                        "x": layer.get("x", 0) / tw,
                        "y": layer.get("y", 0) / th,
                        "size": int(layer.get("size", 64) * min(sx, sy)),
                    }])

            if enhance:
                img = self._one_click_enhance(img)

            buf = io.BytesIO()
            img.save(buf, format="PNG", quality=95)
            buf.seek(0)

            url = await self.storage.upload_file_content(
                content=buf.read(),
                filename=f"editor_{size_key}.png",
                folder=f"thumbnails/{user_id}",
                content_type="image/png",
            )
            results.append({"size": size_key, "width": tw, "height": th, "url": url})

        return results

    # ── Utility ─────────────────────────────────────────────────────────────

    @staticmethod
    def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i: i + 2], 16) for i in (0, 2, 4))  # type: ignore
