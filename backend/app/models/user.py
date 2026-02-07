"""
User Model
Handles user authentication and profile data.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.core.database import Base


class SubscriptionTier(str, enum.Enum):
    """User subscription tiers."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    """
    User model for authentication and profile.
    
    Supports Indian names with proper Unicode handling.
    """
    
    __tablename__ = "users"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Profile - supports Hindi/Indian names (Unicode)
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="User's full name - supports Hindi Unicode characters",
    )
    display_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Display name for the platform",
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(15),
        nullable=True,
        comment="Indian phone number with country code",
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="User bio - supports Hindi text",
    )
    
    # Preferences
    preferred_language: Mapped[str] = mapped_column(
        String(20),
        default="hinglish",
        comment="Preferred content language: hi, en, hinglish",
    )
    preferences: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={},
        comment="User preferences as JSON",
    )
    
    # Subscription
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SQLEnum(SubscriptionTier),
        default=SubscriptionTier.FREE,
    )
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Usage tracking
    credits_remaining: Mapped[int] = mapped_column(default=100)
    total_scripts_generated: Mapped[int] = mapped_column(default=0)
    total_captions_generated: Mapped[int] = mapped_column(default=0)
    total_thumbnails_created: Mapped[int] = mapped_column(default=0)
    
    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
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
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    scripts: Mapped[List["Script"]] = relationship(
        "Script",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    captions: Mapped[List["Caption"]] = relationship(
        "Caption",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    thumbnails: Mapped[List["Thumbnail"]] = relationship(
        "Thumbnail",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<User {self.email}>"
