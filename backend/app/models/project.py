"""
Project Model
Organizes user content into projects.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.core.database import Base


class Project(Base):
    """
    Project model to organize user's content.
    
    Groups scripts, captions, thumbnails, and templates
    into cohesive projects.
    """
    
    __tablename__ = "projects"
    
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
    
    # Project info
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Project name - supports Hindi",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Categorization
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(50)),
        nullable=True,
    )
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        comment="active, archived, deleted",
    )
    
    # Cover/thumbnail
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    
    # Settings
    settings: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="Project-specific settings",
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
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    scripts: Mapped[List["Script"]] = relationship(
        "Script",
        back_populates="project",
    )
    captions: Mapped[List["Caption"]] = relationship(
        "Caption",
        back_populates="project",
    )
    thumbnails: Mapped[List["Thumbnail"]] = relationship(
        "Thumbnail",
        back_populates="project",
    )
    
    def __repr__(self) -> str:
        return f"<Project {self.name}>"


class Hook(Base):
    """
    Hook suggestions model.

    Stores viral hook templates AND AI-generated hooks.
    Supports A/B test tracking so users can mark which hooks worked.
    """

    __tablename__ = "hooks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Owner (NULL for global templates)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Content
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Hook text - supports Hindi/Hinglish",
    )
    text_hindi: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Hindi translation",
    )
    text_english: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="English translation",
    )

    # Categorization
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Hook type (the 5 proven formulas)
    hook_type: Mapped[str] = mapped_column(
        String(50),
        default="curiosity_gap",
        comment="curiosity_gap, contrarian, relatable_struggle, numbers_list, direct_address",
    )

    # Platform
    platform: Mapped[str] = mapped_column(
        String(50),
        default="reel",
        comment="reel, short, both",
    )

    # Target audience
    target_audience: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="e.g. Delhi students, small business owners",
    )

    # ── Performance prediction & A/B tracking ─────────────────────
    predicted_score: Mapped[Optional[float]] = mapped_column(
        nullable=True,
        comment="AI-predicted hook strength 0-100",
    )
    predicted_reasoning: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Why AI thinks this hook will work",
    )

    # Crowd-sourced A/B results
    times_tested: Mapped[int] = mapped_column(default=0, comment="How many users tested this hook")
    times_worked: Mapped[int] = mapped_column(default=0, comment="How many users marked it as 'worked'")
    times_failed: Mapped[int] = mapped_column(default=0, comment="How many users marked it as 'did not work'")
    ab_score: Mapped[Optional[float]] = mapped_column(
        nullable=True,
        comment="Crowd win-rate (times_worked / times_tested * 100)",
    )

    # Metrics
    usage_count: Mapped[int] = mapped_column(default=0)
    effectiveness_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Generation context
    generation_topic: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Original topic used for generation",
    )
    generation_batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Groups hooks generated in the same request",
    )

    # Source
    is_ai_generated: Mapped[bool] = mapped_column(default=False)
    is_template: Mapped[bool] = mapped_column(default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<Hook {self.text[:50]}>"
