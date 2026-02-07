"""
Hook Generator Pydantic Schemas
Request/Response validation for hook generation & A/B tracking.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# ── Hook types ────────────────────────────────────────────────────────────────

HOOK_TYPES = [
    "curiosity_gap",
    "contrarian",
    "relatable_struggle",
    "numbers_list",
    "direct_address",
]

HOOK_TYPE_LABELS = {
    "curiosity_gap": {
        "en": "Curiosity Gap",
        "hi": "जिज्ञासा",
        "desc": '"I wasted ₹50,000 so you don\'t have to..."',
    },
    "contrarian": {
        "en": "Contrarian",
        "hi": "विपरीत",
        "desc": '"Everyone is doing X, but..."',
    },
    "relatable_struggle": {
        "en": "Relatable Struggle",
        "hi": "अपनापन",
        "desc": '"POV: You\'re a Delhi student during exams..."',
    },
    "numbers_list": {
        "en": "Numbers / Lists",
        "hi": "संख्या",
        "desc": '"3 cafes in Mumbai that..."',
    },
    "direct_address": {
        "en": "Direct Address",
        "hi": "सीधी बात",
        "desc": '"If you\'re a small business owner, stop scrolling..."',
    },
}


# ── Request schemas ───────────────────────────────────────────────────────────

class HookGenerateRequest(BaseModel):
    """Generate 5 hook variations with performance predictions."""

    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Video topic / idea",
        examples=["Best street food in Delhi under ₹100", "Exam tips for UPSC aspirants"],
    )
    target_audience: str = Field(
        default="general Indian audience",
        max_length=200,
        description="Who the hook is for",
        examples=["Delhi college students", "small business owners", "homemakers 30-45"],
    )
    platform: str = Field(
        default="reel",
        description="reel (Instagram/YouTube Shorts) or short (YouTube Shorts only)",
    )
    language: str = Field(
        default="hinglish",
        description="hi, en, or hinglish",
    )
    category: str = Field(
        default="lifestyle",
        description="Content niche",
    )
    count: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Number of hook variations to generate",
    )


class ABTestVoteRequest(BaseModel):
    """User marks whether a hook 'worked' or not."""

    result: str = Field(
        ...,
        description="'worked' or 'failed'",
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional user notes about performance",
    )


# ── Response schemas ──────────────────────────────────────────────────────────

class HookVariation(BaseModel):
    """A single hook variation with performance prediction."""

    id: Optional[str] = None
    text: str
    text_hindi: Optional[str] = None
    text_english: Optional[str] = None
    hook_type: str
    hook_type_label: Optional[str] = None
    predicted_score: float = Field(
        description="AI-predicted strength 0-100",
    )
    predicted_reasoning: str = Field(
        description="Why this hook should work",
    )
    platform: str = "reel"

    # A/B tracking (populated when retrieving existing hooks)
    times_tested: int = 0
    times_worked: int = 0
    times_failed: int = 0
    ab_score: Optional[float] = None


class HookGenerateResponse(BaseModel):
    """Response containing 5 hook variations."""

    topic: str
    target_audience: str
    platform: str
    language: str
    category: str
    batch_id: str
    hooks: List[HookVariation]


class HookTemplateItem(BaseModel):
    """A proven hook template."""

    id: str
    text: str
    text_hindi: Optional[str] = None
    text_english: Optional[str] = None
    hook_type: str
    hook_type_label: str
    category: str
    platform: str
    usage_count: int = 0
    ab_score: Optional[float] = None
    times_tested: int = 0
    times_worked: int = 0


class HookTemplatesResponse(BaseModel):
    """List of proven hook templates."""

    items: List[HookTemplateItem]
    total: int
    page: int
    page_size: int


class HookLeaderboardEntry(BaseModel):
    """A hook ranked by crowd-sourced A/B performance."""

    id: str
    text: str
    hook_type: str
    category: str
    platform: str
    ab_score: float
    times_tested: int
    times_worked: int
    times_failed: int
    usage_count: int


class HookLeaderboardResponse(BaseModel):
    """Top-performing hooks ranked by community."""

    entries: List[HookLeaderboardEntry]
    total_votes: int


class HookTypeInfo(BaseModel):
    """Info about a hook type with examples."""

    id: str
    label_en: str
    label_hi: str
    description: str
    examples: List[str]
