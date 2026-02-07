"""
Seed builtin templates into the database.

Run:  python -m app.template_system.seed_templates
"""

import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.template import Template, TemplateCategory, TemplateType, AspectRatio


TEMPLATES_DIR = Path(__file__).parent / "builtin_templates"

# Map JSON category strings → enum
CATEGORY_MAP = {
    "festival": TemplateCategory.FESTIVAL,
    "food": TemplateCategory.FOOD,
    "fitness": TemplateCategory.FITNESS,
    "business": TemplateCategory.BUSINESS,
    "education": TemplateCategory.EDUCATION,
}

ASPECT_MAP = {
    "9:16": AspectRatio.PORTRAIT_9_16,
    "1:1": AspectRatio.SQUARE_1_1,
    "16:9": AspectRatio.LANDSCAPE_16_9,
}


async def seed_templates():
    """Load all .json files from builtin_templates/ into the templates table."""

    json_files = sorted(TEMPLATES_DIR.glob("*.json"))
    if not json_files:
        print("⚠️  No template JSON files found in", TEMPLATES_DIR)
        return

    async with AsyncSessionLocal() as db:
        for path in json_files:
            with open(path, "r", encoding="utf-8") as f:
                data: dict = json.load(f)

            template_id = data.get("id", path.stem)
            name_obj = data.get("name") or {}
            name_en = name_obj.get("en", template_id) if isinstance(name_obj, dict) else str(name_obj)
            name_hi = name_obj.get("hi") if isinstance(name_obj, dict) else None

            category_str = data.get("category", "lifestyle")
            category = CATEGORY_MAP.get(category_str, TemplateCategory.LIFESTYLE)

            aspect_str = data.get("aspectRatio", "9:16")
            aspect = ASPECT_MAP.get(aspect_str, AspectRatio.PORTRAIT_9_16)

            duration_presets = data.get("durationPresets") or [15]
            default_duration = duration_presets[0] if duration_presets else 15

            tags = data.get("tags") or []

            # Check if already seeded (by name)
            existing = (
                await db.execute(
                    select(Template).where(Template.name == name_en)
                )
            ).scalar_one_or_none()

            if existing:
                # Update in place
                existing.template_data = data
                existing.name_hindi = name_hi
                existing.tags = tags
                existing.category = category
                existing.aspect_ratio = aspect
                existing.width = data.get("width", 1080)
                existing.height = data.get("height", 1920)
                existing.fps = data.get("fps", 30)
                existing.duration_seconds = default_duration
                existing.is_featured = True
                print(f"  ✏️  Updated: {name_en}")
            else:
                # Build customizable_fields from placeholders
                placeholders = data.get("placeholders") or {}
                custom_fields = []
                for pid, ph in placeholders.items():
                    ptype = ph.get("type", "text")
                    field_type_map = {
                        "text": "text",
                        "video": "video",
                        "logo": "image",
                        "image": "image",
                        "audio_marker": "text",
                    }
                    custom_fields.append({
                        "field_id": pid,
                        "field_type": field_type_map.get(ptype, "text"),
                        "label": ph.get("label", pid),
                        "label_hindi": ph.get("labelHi"),
                        "default_value": ph.get("default"),
                        "required": ph.get("required", False),
                        "max_length": ph.get("maxLength"),
                    })

                # Build color_schemes from themes
                themes = data.get("themes") or {}
                color_schemes = []
                for tid, th in themes.items():
                    colors = th.get("colors") or {}
                    color_schemes.append({
                        "name": th.get("name", tid),
                        "primary": colors.get("primary", "#000000"),
                        "secondary": colors.get("secondary", "#666666"),
                        "background": colors.get("background", "#FFFFFF"),
                        "text": colors.get("text", "#000000"),
                        "accent": colors.get("accent"),
                    })

                # Font options from all themes
                font_options = set()
                for th in themes.values():
                    fonts = th.get("fonts") or {}
                    font_options.update(fonts.values())

                template = Template(
                    name=name_en,
                    name_hindi=name_hi,
                    description=f"Instagram-native {category_str} reel template for Indian creators.",
                    category=category,
                    template_type=TemplateType.REEL,
                    tags=tags,
                    aspect_ratio=aspect,
                    width=data.get("width", 1080),
                    height=data.get("height", 1920),
                    duration_seconds=default_duration,
                    fps=data.get("fps", 30),
                    template_data=data,
                    customizable_fields=custom_fields,
                    color_schemes=color_schemes,
                    font_options=list(font_options) if font_options else None,
                    festival_name=data.get("festival_name"),
                    is_active=True,
                    is_premium=False,
                    is_featured=True,
                )
                db.add(template)
                print(f"  ✅ Created: {name_en}")

        await db.commit()
        print(f"\n🎉 Seeded {len(json_files)} template(s) from {TEMPLATES_DIR}")


if __name__ == "__main__":
    asyncio.run(seed_templates())
