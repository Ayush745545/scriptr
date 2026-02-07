"""
Thumbnail Model
Handles AI-generated video thumbnails.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.core.database import Base


class ThumbnailStyle(str, enum.Enum):
    """Thumbnail style presets."""
    YOUTUBE_STANDARD = "youtube_standard"
    YOUTUBE_MINIMAL = "youtube_minimal"
    INSTAGRAM_REEL = "instagram_reel"
    CLICKBAIT = "clickbait"
    PROFESSIONAL = "professional"
    EDUCATIONAL = "educational"
    ENTERTAINMENT = "entertainment"
    CUSTOM = "custom"


class ThumbnailStatus(str, enum.Enum):
    """Thumbnail generation status."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Thumbnail(Base):
    """
    Thumbnail model for AI-generated video thumbnails.
    
    Supports Hindi text overlay with proper Unicode rendering.
    """
    
    __tablename__ = "thumbnails"
    
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
    
    # Basic info
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Thumbnail title for reference",
    )
    
    # Text content (supports Hindi Unicode)
    primary_text: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="Main text on thumbnail - Hindi/English",
    )
    secondary_text: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="Secondary text line",
    )
    
    # Style settings
    style: Mapped[ThumbnailStyle] = mapped_column(
        SQLEnum(ThumbnailStyle),
        default=ThumbnailStyle.YOUTUBE_STANDARD,
    )
    style_settings: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="Custom style settings",
    )
    
    # Colors
    primary_color: Mapped[str] = mapped_column(String(20), default="#FF0000")
    secondary_color: Mapped[str] = mapped_column(String(20), default="#FFFFFF")
    background_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Typography
    font_family: Mapped[str] = mapped_column(
        String(100),
        default="Noto Sans Devanagari",
        comment="Font supporting Hindi Unicode",
    )
    font_size: Mapped[int] = mapped_column(Integer, default=72)
    
    # Source images
    source_image_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="User uploaded image",
    )
    face_image_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="Face/person image for thumbnail",
    )
    background_image_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    
    # AI Generation
    ai_prompt: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Prompt used for AI background generation",
    )
    ai_generated_background: Mapped[bool] = mapped_column(default=False)
    
    # Output
    output_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="Final generated thumbnail URL",
    )
    output_variants: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Multiple variants generated",
    )
    
    # Dimensions
    width: Mapped[int] = mapped_column(Integer, default=1280)
    height: Mapped[int] = mapped_column(Integer, default=720)
    
    # Status
    status: Mapped[ThumbnailStatus] = mapped_column(
        SQLEnum(ThumbnailStatus),
        default=ThumbnailStatus.PENDING,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # A/B Testing support
    variant_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    parent_thumbnail_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Original thumbnail if this is a variant",
    )
    
    # Usage tracking
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    
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
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="thumbnails")
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="thumbnails",
    )
    
    def __repr__(self) -> str:
        return f"<Thumbnail {self.title}>"
