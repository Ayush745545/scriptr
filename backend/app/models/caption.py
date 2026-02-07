"""
Caption Model
Handles auto-generated video captions using Whisper API.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.core.database import Base


class CaptionFormat(str, enum.Enum):
    """Supported caption export formats."""
    SRT = "srt"
    VTT = "vtt"
    ASS = "ass"
    JSON = "json"
    TXT = "txt"


class CaptionStyle(str, enum.Enum):
    """Caption styling presets."""
    DEFAULT = "default"
    BOLD = "bold"
    OUTLINE = "outline"
    KARAOKE = "karaoke"
    WORD_BY_WORD = "word_by_word"
    HIGHLIGHT = "highlight"


class TranscriptionStatus(str, enum.Enum):
    """Status of transcription job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Caption(Base):
    """
    Caption model for auto-generated video subtitles.
    
    Uses Whisper API for transcription with support for
    Hindi, English, and Hinglish mixed content.
    """
    
    __tablename__ = "captions"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Source video/audio
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Caption job title",
    )
    source_file_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        comment="URL to source video/audio file",
    )
    source_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_duration_seconds: Mapped[float] = mapped_column(
        Float,
        default=0,
        comment="Duration of source media in seconds",
    )
    
    # Transcription result
    transcription_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Full transcription text with Hindi Unicode support",
    )
    segments: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Timestamped segments array",
    )
    word_timestamps: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Word-level timestamps for karaoke style",
    )
    
    # Language detection
    detected_language: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="Detected language from Whisper",
    )
    language_confidence: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Language detection confidence 0-1",
    )
    
    # Processing status
    status: Mapped[TranscriptionStatus] = mapped_column(
        SQLEnum(TranscriptionStatus),
        default=TranscriptionStatus.PENDING,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processing_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Time taken to process",
    )
    
    # Styling
    caption_style: Mapped[CaptionStyle] = mapped_column(
        SQLEnum(CaptionStyle),
        default=CaptionStyle.DEFAULT,
    )
    style_settings: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="Custom style settings: font, color, position, etc.",
    )
    
    # Export
    exported_formats: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="URLs to exported caption files by format",
    )
    
    # AI Enhancement
    is_edited: Mapped[bool] = mapped_column(default=False)
    ai_enhanced: Mapped[bool] = mapped_column(
        default=False,
        comment="Whether AI was used to enhance/correct captions",
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="captions")
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="captions",
    )
    
    def __repr__(self) -> str:
        return f"<Caption {self.title} - {self.status.value}>"


class CaptionSegment(Base):
    """
    Individual caption segment with timestamp.
    Stored separately for efficient editing.
    """
    
    __tablename__ = "caption_segments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    caption_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("captions.id", ondelete="CASCADE"),
        index=True,
    )
    
    # Timing
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Content
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Segment text - supports Hindi Unicode",
    )
    text_english: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="English translation if original is Hindi",
    )
    
    # Word-level data
    words: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Word-level timestamps",
    )
    
    # Confidence
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Editing
    is_edited: Mapped[bool] = mapped_column(default=False)
    original_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )
