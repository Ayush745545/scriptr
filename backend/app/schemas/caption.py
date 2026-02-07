"""
Caption Pydantic Schemas
Request/Response validation for caption generation endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl

from app.models.caption import CaptionFormat, CaptionStyle, TranscriptionStatus


class CaptionSegmentSchema(BaseModel):
    """Schema for individual caption segment."""
    
    segment_index: int
    start_time: float = Field(description="Start time in seconds")
    end_time: float = Field(description="End time in seconds")
    text: str = Field(description="Segment text - supports Hindi Unicode")
    text_english: Optional[str] = Field(
        None,
        description="English translation if original is Hindi",
    )
    confidence: Optional[float] = Field(None, ge=0, le=1)
    words: Optional[List[dict]] = Field(
        None,
        description="Word-level timestamps for karaoke style",
    )


class CaptionGenerateRequest(BaseModel):
    """Request schema for generating captions from video/audio."""
    
    title: str = Field(
        ...,
        max_length=500,
        description="Caption job title",
    )
    source_file_url: str = Field(
        ...,
        description="URL to the video/audio file",
    )
    language_hint: Optional[str] = Field(
        default="auto",
        description="Language hint: auto, hi, en, or hinglish",
    )
    caption_style: CaptionStyle = Field(
        default=CaptionStyle.DEFAULT,
        description="Caption styling preset",
    )
    translate_to_english: bool = Field(
        default=False,
        description="Also generate English translation",
    )
    word_timestamps: bool = Field(
        default=False,
        description="Generate word-level timestamps (for karaoke style)",
    )
    project_id: Optional[UUID] = None


class CaptionStyleSettings(BaseModel):
    """Custom caption style settings."""
    
    font_family: str = Field(
        default="Noto Sans Devanagari",
        description="Font supporting Hindi text",
    )
    font_size: int = Field(default=24, ge=12, le=72)
    font_color: str = Field(default="#FFFFFF")
    background_color: Optional[str] = Field(default="rgba(0,0,0,0.7)")
    position: str = Field(
        default="bottom",
        description="Caption position: top, center, bottom",
    )
    max_chars_per_line: int = Field(default=42, ge=20, le=60)
    animation: Optional[str] = Field(
        None,
        description="Animation style: fade, pop, typewriter, highlight",
    )


class CaptionResponse(BaseModel):
    """Response schema for caption job."""
    
    id: UUID
    title: str
    source_file_url: str
    source_file_name: str
    source_duration_seconds: float
    transcription_text: Optional[str] = None
    segments: Optional[List[CaptionSegmentSchema]] = None
    detected_language: Optional[str] = None
    language_confidence: Optional[float] = None
    status: TranscriptionStatus
    error_message: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    caption_style: CaptionStyle
    style_settings: Optional[dict] = None
    exported_formats: Optional[dict] = None
    is_edited: bool
    ai_enhanced: bool
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CaptionListResponse(BaseModel):
    """Paginated list of captions."""
    
    items: List[CaptionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class CaptionUpdateRequest(BaseModel):
    """Request schema for updating captions."""
    
    title: Optional[str] = Field(None, max_length=500)
    segments: Optional[List[CaptionSegmentSchema]] = None
    caption_style: Optional[CaptionStyle] = None
    style_settings: Optional[CaptionStyleSettings] = None


class CaptionExportRequest(BaseModel):
    """Request schema for exporting captions."""
    
    format: CaptionFormat
    include_translation: bool = Field(
        default=False,
        description="Include English translation (if available)",
    )
    burn_into_video: bool = Field(
        default=False,
        description="Burn captions directly into video",
    )
    style_settings: Optional[CaptionStyleSettings] = None


class CaptionExportResponse(BaseModel):
    """Response with exported caption file."""
    
    caption_id: UUID
    format: CaptionFormat
    download_url: str
    expires_at: datetime
    file_size_bytes: int
