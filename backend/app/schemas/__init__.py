"""
Schemas module - exports all Pydantic schemas.
"""

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserBriefResponse,
    TokenResponse,
    LoginRequest,
    RefreshTokenRequest,
)
from app.schemas.script import (
    ScriptGenerateRequest,
    ScriptResponse,
    ScriptListResponse,
    ScriptUpdateRequest,
    HookSuggestionsRequest,
    HookSuggestionsResponse,
)
from app.schemas.caption import (
    CaptionSegmentSchema,
    CaptionGenerateRequest,
    CaptionStyleSettings,
    CaptionResponse,
    CaptionListResponse,
    CaptionUpdateRequest,
    CaptionExportRequest,
    CaptionExportResponse,
)
from app.schemas.template import (
    TemplateCustomizationField,
    ColorScheme,
    TemplateResponse,
    TemplateListResponse,
    TemplateFilterRequest,
    UserTemplateCreateRequest,
    UserTemplateResponse,
    RenderTemplateRequest,
    RenderStatusResponse,
)
from app.schemas.thumbnail import (
    ThumbnailGenerateRequest,
    ThumbnailStyleSettings,
    ThumbnailResponse,
    ThumbnailListResponse,
    ThumbnailUpdateRequest,
    ThumbnailVariantRequest,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserBriefResponse",
    "TokenResponse",
    "LoginRequest",
    "RefreshTokenRequest",
    # Script
    "ScriptGenerateRequest",
    "ScriptResponse",
    "ScriptListResponse",
    "ScriptUpdateRequest",
    "HookSuggestionsRequest",
    "HookSuggestionsResponse",
    # Caption
    "CaptionSegmentSchema",
    "CaptionGenerateRequest",
    "CaptionStyleSettings",
    "CaptionResponse",
    "CaptionListResponse",
    "CaptionUpdateRequest",
    "CaptionExportRequest",
    "CaptionExportResponse",
    # Template
    "TemplateCustomizationField",
    "ColorScheme",
    "TemplateResponse",
    "TemplateListResponse",
    "TemplateFilterRequest",
    "UserTemplateCreateRequest",
    "UserTemplateResponse",
    "RenderTemplateRequest",
    "RenderStatusResponse",
    # Thumbnail
    "ThumbnailGenerateRequest",
    "ThumbnailStyleSettings",
    "ThumbnailResponse",
    "ThumbnailListResponse",
    "ThumbnailUpdateRequest",
    "ThumbnailVariantRequest",
]
