"""
User Pydantic Schemas
Request/Response validation for user endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserBase(BaseModel):
    """Base user schema."""
    
    email: EmailStr
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Full name - supports Hindi Unicode (हिंदी नाम)",
    )
    display_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Display name for the platform",
    )
    phone: Optional[str] = Field(
        None,
        description="Indian phone number with country code (+91)",
    )
    preferred_language: str = Field(
        default="hinglish",
        description="Preferred content language: hi, en, hinglish",
    )
    
    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        """Allow Hindi Unicode characters in names."""
        # Allow letters (including Devanagari), spaces, and common punctuation
        if not re.match(r'^[\w\s\u0900-\u097F\.-]+$', v, re.UNICODE):
            raise ValueError("Name contains invalid characters")
        return v.strip()
    
    @field_validator("phone")
    @classmethod
    def validate_indian_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate Indian phone number format."""
        if v is None:
            return v
        # Remove spaces and dashes
        cleaned = re.sub(r'[\s-]', '', v)
        # Check for Indian phone format
        if not re.match(r'^(\+91)?[6-9]\d{9}$', cleaned):
            raise ValueError("Invalid Indian phone number. Use format: +91XXXXXXXXXX")
        return cleaned
    
    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate supported language."""
        allowed = ["hi", "en", "hinglish"]
        if v not in allowed:
            raise ValueError(f"Language must be one of: {', '.join(allowed)}")
        return v


class UserCreate(UserBase):
    """Schema for user registration."""
    
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password (minimum 8 characters)",
    )
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    
    full_name: Optional[str] = Field(None, max_length=255)
    display_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = None
    preferences: Optional[dict] = None


class UserResponse(UserBase):
    """Schema for user response."""
    
    id: UUID
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    subscription_tier: str
    credits_remaining: int
    total_scripts_generated: int
    total_captions_generated: int
    total_thumbnails_created: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserBriefResponse(BaseModel):
    """Brief user info for lists."""
    
    id: UUID
    email: EmailStr
    full_name: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    subscription_tier: str
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response."""
    
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token expiry in seconds")


class LoginRequest(BaseModel):
    """Login request schema."""
    
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    
    refresh_token: str
