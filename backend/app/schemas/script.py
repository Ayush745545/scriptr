"""
Script Pydantic Schemas
Request/Response validation for script generation endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.models.script import ContentLanguage, ScriptType, ContentCategory


class ScriptGenerateRequest(BaseModel):
    """Request schema for generating a script."""
    
    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Topic for the script - supports Hindi (विषय)",
        examples=["How to make perfect chai", "घर पर गुलाब जामुन कैसे बनाएं"],
    )
    language: ContentLanguage = Field(
        default=ContentLanguage.HINGLISH,
        description="Output language: hi (Hindi), en (English), hinglish (Mixed)",
    )
    script_type: ScriptType = Field(
        default=ScriptType.REEL,
        description="Type of script to generate",
    )
    category: ContentCategory = Field(
        default=ContentCategory.LIFESTYLE,
        description="Content category",
    )
    tone: Optional[str] = Field(
        default="engaging",
        description="Content tone: funny, serious, motivational, educational, casual",
    )
    target_duration_seconds: int = Field(
        default=60,
        ge=15,
        le=600,
        description="Target duration in seconds (15-600)",
    )
    target_audience: Optional[str] = Field(
        default="general",
        description="Target audience: gen-z, millennials, professionals, homemakers, etc.",
    )
    include_hooks: bool = Field(
        default=True,
        description="Generate hook suggestions",
    )
    include_hashtags: bool = Field(
        default=True,
        description="Generate hashtag suggestions",
    )
    additional_instructions: Optional[str] = Field(
        None,
        max_length=500,
        description="Additional instructions for AI",
    )
    
    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: Optional[str]) -> Optional[str]:
        """Validate content tone."""
        if v is None:
            return "engaging"
        allowed = [
            "funny", "serious", "motivational", "educational", 
            "casual", "professional", "dramatic", "friendly",
            "inspiring", "entertaining", "engaging",
        ]
        if v.lower() not in allowed:
            raise ValueError(f"Tone must be one of: {', '.join(allowed)}")
        return v.lower()


class ScriptResponse(BaseModel):
    """Response schema for generated script."""
    
    id: UUID
    title: str
    description: Optional[str] = None
    content: str
    language: ContentLanguage
    script_type: ScriptType
    category: ContentCategory
    tone: Optional[str] = None
    target_duration_seconds: int
    word_count: int
    hooks: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    model_used: str
    is_favorite: bool
    times_used: int
    user_rating: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ScriptListResponse(BaseModel):
    """Paginated list of scripts."""
    
    items: List[ScriptResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class ScriptUpdateRequest(BaseModel):
    """Request schema for updating a script."""
    
    title: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = None
    is_favorite: Optional[bool] = None
    user_rating: Optional[float] = Field(None, ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=1000)


class HookSuggestionsRequest(BaseModel):
    """Request schema for generating hook suggestions."""
    
    topic: str = Field(
        ...,
        min_length=3,
        max_length=300,
        description="Topic for hooks",
    )
    category: ContentCategory
    language: ContentLanguage = ContentLanguage.HINGLISH
    count: int = Field(default=5, ge=1, le=10)
    platform: str = Field(
        default="instagram",
        description="Target platform: instagram, youtube, twitter",
    )


class HookSuggestionsResponse(BaseModel):
    """Response with hook suggestions."""
    
    topic: str
    hooks: List[dict]  # {text, text_hindi, text_english, hook_type}
    category: str
    language: str
