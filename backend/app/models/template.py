"""
Template Model
Handles reel/video templates for different content categories.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Integer, Float, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.core.database import Base


class TemplateCategory(str, enum.Enum):
    """Template categories for Indian content."""
    FESTIVAL = "festival"  # Diwali, Holi, Eid, Christmas, etc.
    FOOD = "food"  # Indian cuisine, recipes, street food
    FITNESS = "fitness"  # Workout, yoga, health tips
    BUSINESS = "business"  # Startup, entrepreneur, finance
    TRAVEL = "travel"  # Indian destinations, travel vlogs
    EDUCATION = "education"  # Learning, tutorials
    ENTERTAINMENT = "entertainment"  # Movies, music, dance
    FASHION = "fashion"  # Indian fashion, styling
    TECH = "tech"  # Tech reviews, coding
    LIFESTYLE = "lifestyle"  # Daily life, productivity


class TemplateType(str, enum.Enum):
    """Types of video templates."""
    REEL = "reel"  # Instagram/YouTube Shorts style
    STORY = "story"  # Stories format
    POST = "post"  # Static post with animation
    CAROUSEL = "carousel"  # Multiple slides
    THUMBNAIL = "thumbnail"  # YouTube thumbnail


class AspectRatio(str, enum.Enum):
    """Supported aspect ratios."""
    PORTRAIT_9_16 = "9:16"  # Reels, Stories
    SQUARE_1_1 = "1:1"  # Instagram posts
    LANDSCAPE_16_9 = "16:9"  # YouTube
    LANDSCAPE_4_3 = "4:3"  # Traditional


class Template(Base):
    """
    Video/Reel template model.
    
    Stores template definitions with Indian cultural themes.
    """
    
    __tablename__ = "templates"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Template info
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Template name - supports Hindi",
    )
    name_hindi: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Hindi name: टेम्पलेट नाम",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Categorization
    category: Mapped[TemplateCategory] = mapped_column(
        SQLEnum(TemplateCategory),
        index=True,
    )
    template_type: Mapped[TemplateType] = mapped_column(
        SQLEnum(TemplateType),
        default=TemplateType.REEL,
    )
    tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(50)),
        nullable=True,
        comment="Search tags in English and Hindi",
    )
    
    # Visual properties
    aspect_ratio: Mapped[AspectRatio] = mapped_column(
        SQLEnum(AspectRatio),
        default=AspectRatio.PORTRAIT_9_16,
    )
    width: Mapped[int] = mapped_column(Integer, default=1080)
    height: Mapped[int] = mapped_column(Integer, default=1920)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=15)
    fps: Mapped[int] = mapped_column(Integer, default=30)
    
    # Template assets
    preview_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="Preview video URL",
    )
    
    # Template definition
    template_data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="Template definition JSON with layers, animations, etc.",
    )
    
    # Customization options
    customizable_fields: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Fields that users can customize",
    )
    color_schemes: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default=[],
        comment="Predefined color schemes",
    )
    font_options: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(100)),
        nullable=True,
        comment="Available fonts including Indian language fonts",
    )
    
    # Festival-specific
    festival_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="If category is festival, which festival",
    )
    festival_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Festival date if applicable",
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Usage stats
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
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
    
    def __repr__(self) -> str:
        return f"<Template {self.name} - {self.category.value}>"


class UserTemplate(Base):
    """
    User's customized template instance.
    
    Stores user-specific template customizations.
    """
    
    __tablename__ = "user_templates"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Customizations
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    customizations: Mapped[dict] = mapped_column(
        JSONB,
        default={},
        comment="User's customizations to the template",
    )
    
    # Generated output
    output_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        comment="draft, rendering, completed, failed",
    )
    render_progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
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
    rendered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    template: Mapped["Template"] = relationship("Template")
