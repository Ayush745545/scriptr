"""
Template Pydantic Schemas
Request/Response validation for template endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.template import TemplateCategory, TemplateType, AspectRatio


class TemplateCustomizationField(BaseModel):
    """Schema for customizable template field."""
    
    field_id: str
    field_type: str = Field(description="text, image, color, video")
    label: str
    label_hindi: Optional[str] = None
    default_value: Optional[str] = None
    placeholder: Optional[str] = None
    required: bool = False
    max_length: Optional[int] = None


class ColorScheme(BaseModel):
    """Template color scheme."""
    
    name: str
    primary: str
    secondary: str
    background: str
    text: str
    accent: Optional[str] = None


class TemplateResponse(BaseModel):
    """Response schema for template."""
    
    id: UUID
    name: str
    name_hindi: Optional[str] = None
    description: Optional[str] = None
    category: TemplateCategory
    template_type: TemplateType
    tags: Optional[List[str]] = None
    aspect_ratio: AspectRatio
    width: int
    height: int
    duration_seconds: int
    fps: int
    preview_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    customizable_fields: Optional[List[TemplateCustomizationField]] = None
    color_schemes: Optional[List[ColorScheme]] = None
    font_options: Optional[List[str]] = None
    festival_name: Optional[str] = None
    festival_date: Optional[datetime] = None
    is_premium: bool
    is_featured: bool
    usage_count: int
    rating: Optional[float] = None
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Paginated list of templates."""
    
    items: List[TemplateResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class TemplateFilterRequest(BaseModel):
    """Filter options for browsing templates."""
    
    category: Optional[TemplateCategory] = None
    template_type: Optional[TemplateType] = None
    aspect_ratio: Optional[AspectRatio] = None
    is_premium: Optional[bool] = None
    is_featured: Optional[bool] = None
    festival_name: Optional[str] = None
    search_query: Optional[str] = Field(
        None,
        description="Search in name, description, tags (Hindi/English)",
    )
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class UserTemplateCreateRequest(BaseModel):
    """Request to create user's customized template."""
    
    template_id: UUID
    title: str = Field(..., max_length=255)
    customizations: dict = Field(
        default={},
        description="Field customizations: {field_id: value}",
    )
    project_id: Optional[UUID] = None


class UserTemplateResponse(BaseModel):
    """Response for user's customized template."""
    
    id: UUID
    template_id: UUID
    title: str
    customizations: dict
    output_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str
    render_progress: int
    error_message: Optional[str] = None
    created_at: datetime
    rendered_at: Optional[datetime] = None
    
    # Include base template info
    template: Optional[TemplateResponse] = None
    
    class Config:
        from_attributes = True


class RenderTemplateRequest(BaseModel):
    """Request to render a customized template."""
    
    user_template_id: UUID
    output_format: str = Field(
        default="mp4",
        description="Output format: mp4, webm, gif",
    )
    quality: str = Field(
        default="high",
        description="Quality: low, medium, high, ultra",
    )
    watermark: bool = Field(
        default=False,
        description="Add ContentKaro watermark",
    )


class RenderStatusResponse(BaseModel):
    """Response for render job status."""
    
    user_template_id: UUID
    status: str
    progress: int = Field(ge=0, le=100)
    output_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    estimated_time_remaining: Optional[int] = Field(
        None,
        description="Estimated seconds remaining",
    )
    error_message: Optional[str] = None


class TemplateDefinitionResponse(BaseModel):
    """Template definition payload (JSON schema-based template_data)."""

    template_id: UUID
    template_data: dict


class TemplateAssetUploadResponse(BaseModel):
    """Response for uploaded template assets (video/logo/image)."""

    url: str
    content_type: Optional[str] = None
    filename: Optional[str] = None

