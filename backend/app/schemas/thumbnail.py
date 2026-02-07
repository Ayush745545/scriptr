"""
Thumbnail Pydantic Schemas
Request/Response validation for thumbnail generation endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.models.thumbnail import ThumbnailStyle, ThumbnailStatus


class StickerItem(BaseModel):
    """A single sticker/emoji to overlay on the thumbnail."""
    emoji: Optional[str] = Field(None, description="Emoji character e.g. 🔥")
    image_url: Optional[str] = Field(None, description="Sticker image URL")
    x: float = Field(default=0.5, ge=0, le=1, description="Normalised x position (0-1)")
    y: float = Field(default=0.5, ge=0, le=1, description="Normalised y position (0-1)")
    size: int = Field(default=64, ge=16, le=256, description="Size in px")


class ThumbnailGenerateRequest(BaseModel):
    """Request schema for generating a thumbnail."""

    title: str = Field(
        ...,
        max_length=500,
        description="Thumbnail title / video topic",
    )
    primary_text: Optional[str] = Field(
        None,
        max_length=100,
        description="Main text on thumbnail - Hindi/English (मुख्य टेक्स्ट)",
        examples=["कैसे बनें SUCCESSFUL?", "5 SECRET TIPS"],
    )
    secondary_text: Optional[str] = Field(
        None,
        max_length=100,
        description="Secondary text line",
    )
    style: ThumbnailStyle = Field(
        default=ThumbnailStyle.YOUTUBE_STANDARD,
        description="Thumbnail style preset",
    )
    primary_color: str = Field(default="#FF0000", description="Primary color (hex)")
    secondary_color: str = Field(default="#FFFFFF", description="Secondary color (hex)")
    background_color: Optional[str] = Field(None, description="Background color (if no image)")
    font_family: str = Field(
        default="poppins-extrabold",
        description="Font ID from font registry",
    )
    font_size: int = Field(default=72, ge=24, le=200, description="Text font size")
    source_image_url: Optional[str] = Field(None, description="Uploaded background image URL")
    face_image_url: Optional[str] = Field(None, description="Face/person image to include")
    ai_background_prompt: Optional[str] = Field(
        None,
        max_length=300,
        description="Prompt for DALL-E 3 background generation",
    )
    generate_variants: int = Field(default=3, ge=1, le=5, description="Number of variations")
    output_sizes: List[str] = Field(
        default=["youtube", "instagram"],
        description="Output presets: youtube (1280x720), instagram (1080x1080), story (1080x1920)",
    )
    formula_id: Optional[str] = Field(
        None,
        description="Thumbnail formula ID (shocked_face_arrow, before_after_split, etc.)",
    )
    enhance: bool = Field(
        default=False,
        description="Apply one-click enhance (auto-contrast, face brightening)",
    )
    stickers: Optional[List[StickerItem]] = Field(
        None,
        description="Sticker/emoji overlays",
    )
    width: int = Field(default=1280, description="Output width (overridden by output_sizes)")
    height: int = Field(default=720, description="Output height (overridden by output_sizes)")
    project_id: Optional[UUID] = None

    @field_validator("primary_color", "secondary_color", "background_color")
    @classmethod
    def validate_hex_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.startswith("#") or len(v) not in [4, 7, 9]:
            raise ValueError("Color must be in hex format (#RGB, #RRGGBB, or #RRGGBBAA)")
        return v.upper()


class ThumbnailStyleSettings(BaseModel):
    """Custom thumbnail style settings."""
    
    text_position: str = Field(
        default="center",
        description="Text position: top-left, top-right, center, bottom-left, bottom-right",
    )
    text_shadow: bool = True
    text_stroke: bool = True
    text_stroke_color: str = "#000000"
    text_stroke_width: int = Field(default=2, ge=0, le=10)
    overlay_opacity: float = Field(default=0.3, ge=0, le=1)
    face_position: str = Field(
        default="right",
        description="Face image position: left, right, center",
    )
    face_scale: float = Field(default=1.0, ge=0.5, le=2.0)
    emoji_decorations: Optional[List[str]] = Field(
        None,
        description="Emojis to add: 🔥, 🚀, etc.",
    )
    border_style: Optional[str] = Field(
        None,
        description="Border style: none, solid, gradient",
    )


class ThumbnailResponse(BaseModel):
    """Response schema for generated thumbnail."""
    
    id: UUID
    title: str
    primary_text: Optional[str] = None
    secondary_text: Optional[str] = None
    style: ThumbnailStyle
    style_settings: Optional[dict] = None
    primary_color: str
    secondary_color: str
    background_color: Optional[str] = None
    font_family: str
    font_size: int
    source_image_url: Optional[str] = None
    face_image_url: Optional[str] = None
    ai_prompt: Optional[str] = None
    ai_generated_background: bool
    output_url: Optional[str] = None
    output_variants: Optional[List[dict]] = None
    width: int
    height: int
    status: ThumbnailStatus
    error_message: Optional[str] = None
    download_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ThumbnailListResponse(BaseModel):
    """Paginated list of thumbnails."""
    
    items: List[ThumbnailResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class ThumbnailUpdateRequest(BaseModel):
    """Request schema for updating thumbnail."""
    
    title: Optional[str] = Field(None, max_length=500)
    primary_text: Optional[str] = Field(None, max_length=100)
    secondary_text: Optional[str] = Field(None, max_length=100)
    style: Optional[ThumbnailStyle] = None
    style_settings: Optional[ThumbnailStyleSettings] = None
    regenerate: bool = Field(
        default=False,
        description="Regenerate thumbnail with new settings",
    )


class ThumbnailVariantRequest(BaseModel):
    """Request to generate A/B test variant."""

    parent_thumbnail_id: UUID
    variant_name: str = Field(..., max_length=50)
    changes: dict = Field(
        ...,
        description="Changes to apply: {field: new_value}",
    )


# ── New v2 schemas ──────────────────────────────────────────────────────────

class ThumbnailFormulaResponse(BaseModel):
    """A thumbnail formula (layout recipe)."""
    id: str
    name: str
    name_hi: str
    description: str
    niche: List[str]
    layout: dict
    suggested_emojis: List[str]
    example_text: str
    example_text_en: str


class FontInfoResponse(BaseModel):
    """Font metadata for the font picker."""
    id: str
    name: str
    family: str
    script: str
    style: str
    weight: int
    preview_text: str
    available: bool


class EditorRenderRequest(BaseModel):
    """
    Render request from the canvas editor.
    The frontend sends its layer stack as JSON.
    """
    canvas_json: dict = Field(
        ...,
        description="Canvas state with width, height, backgroundColor, layers[]",
    )
    output_sizes: List[str] = Field(
        default=["youtube", "instagram"],
        description="Size presets to render",
    )
    enhance: bool = Field(
        default=False,
        description="Apply one-click enhance after compositing",
    )


class EditorRenderResponse(BaseModel):
    """Response from editor render."""
    outputs: List[dict] = Field(
        ...,
        description="[{size, width, height, url}, ...]",
    )


class StickerSuggestionResponse(BaseModel):
    """Sticker/emoji suggestions for a niche."""
    niche: str
    emojis: List[str]
    sticker_packs: List[dict]
