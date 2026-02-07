"""
Script Model
Handles AI-generated scripts in Hindi/English/Hinglish.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.core.database import Base


class ContentLanguage(str, enum.Enum):
    """Supported content languages."""
    HINDI = "hi"
    ENGLISH = "en"
    HINGLISH = "hinglish"


class ScriptType(str, enum.Enum):
    """Types of scripts that can be generated."""
    REEL = "reel"
    SHORT = "short"
    YOUTUBE = "youtube"
    PODCAST = "podcast"
    AD = "ad"
    STORY = "story"


class ContentCategory(str, enum.Enum):
    """Content categories for Indian creators."""
    FESTIVAL = "festival"
    FOOD = "food"
    FITNESS = "fitness"
    BUSINESS = "business"
    TRAVEL = "travel"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    FASHION = "fashion"
    TECH = "tech"
    LIFESTYLE = "lifestyle"
    MOTIVATION = "motivation"
    COMEDY = "comedy"


class Script(Base):
    """
    Script model for AI-generated content scripts.
    
    Stores scripts with proper Unicode support for Hindi text.
    """
    
    __tablename__ = "scripts"
    
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
    
    # Script metadata
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Script title - supports Hindi Unicode",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Script description",
    )
    
    # Content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Full script content with Hindi/English text",
    )
    
    # Script properties
    language: Mapped[ContentLanguage] = mapped_column(
        SQLEnum(ContentLanguage),
        default=ContentLanguage.HINGLISH,
    )
    script_type: Mapped[ScriptType] = mapped_column(
        SQLEnum(ScriptType),
        default=ScriptType.REEL,
    )
    category: Mapped[ContentCategory] = mapped_column(
        SQLEnum(ContentCategory),
        default=ContentCategory.LIFESTYLE,
    )
    
    # Generation settings
    tone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Content tone: funny, serious, motivational, etc.",
    )
    target_duration_seconds: Mapped[int] = mapped_column(
        Integer,
        default=60,
        comment="Target duration in seconds",
    )
    word_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Actual word count of generated script",
    )
    
    # AI Generation metadata
    prompt_used: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Original prompt used for generation",
    )
    model_used: Mapped[str] = mapped_column(
        String(100),
        default="gpt-4-turbo-preview",
    )
    generation_params: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="Parameters used for AI generation",
    )
    
    # Generated hooks and suggestions
    hooks: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(Text),
        nullable=True,
        comment="Generated hook suggestions",
    )
    hashtags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(100)),
        nullable=True,
        comment="Suggested hashtags",
    )
    
    # Usage tracking
    is_favorite: Mapped[bool] = mapped_column(default=False)
    times_used: Mapped[int] = mapped_column(default=0)
    
    # Rating and feedback
    user_rating: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="User rating 1-5",
    )
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
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
    user: Mapped["User"] = relationship("User", back_populates="scripts")
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="scripts",
    )
    
    def __repr__(self) -> str:
        return f"<Script {self.title[:50]}>"
