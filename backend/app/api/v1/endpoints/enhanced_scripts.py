"""
Enhanced Script Generation API Endpoint
Advanced script generation with structured output and cultural awareness.
"""

from typing import Annotated, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.script import ContentLanguage, ScriptType, ContentCategory
from app.services.enhanced_script_service import EnhancedScriptService, EXAMPLE_OUTPUTS

router = APIRouter()


# ============================================
# SCHEMAS
# ============================================

class EnhancedScriptRequest(BaseModel):
    """Enhanced script generation request with all options."""
    
    topic: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Topic for the script",
        examples=[
            "Cafe promotion for new coffee shop in Mumbai",
            "Fitness tips for busy professionals",
            "Diwali sale announcement"
        ],
    )
    language: ContentLanguage = Field(
        default=ContentLanguage.HINGLISH,
        description="Output language: hi (Hindi with Devanagari), en (English), hinglish (Roman script mix)",
    )
    content_type: str = Field(
        default="reel",
        description="Content type: reel, short, ad/promo, educational",
    )
    tone: str = Field(
        default="trendy",
        description="Content tone: funny, professional, trendy",
    )
    duration_seconds: int = Field(
        default=30,
        ge=15,
        le=120,
        description="Target duration in seconds (15-120)",
    )
    target_audience: Optional[str] = Field(
        default="general",
        description="Target audience description",
    )
    include_cultural_refs: bool = Field(
        default=True,
        description="Include Indian cultural references when relevant",
    )
    additional_instructions: Optional[str] = Field(
        None,
        max_length=500,
        description="Additional instructions for script generation",
    )


class ScriptSection(BaseModel):
    """Individual section of a script."""
    
    type: str  # hook, main, cta
    content: str
    duration_hint: str
    notes: Optional[str] = None


class EnhancedScriptResponse(BaseModel):
    """Enhanced script response with structured output."""
    
    id: str
    title: str
    language: str
    tone: str
    duration_seconds: int
    
    # Structured script sections
    hook: str = Field(description="Opening hook for first 3 seconds")
    main_script: str = Field(description="Main body of the script")
    cta: str = Field(description="Call-to-action at the end")
    full_script: str = Field(description="Complete combined script")
    
    # Extras
    alternative_hooks: List[str] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    audio_suggestions: List[str] = Field(default_factory=list)
    timing_breakdown: dict = Field(default_factory=dict)
    visual_suggestions: List[str] = Field(default_factory=list)
    
    # Metadata
    word_count: int
    estimated_read_time_seconds: int
    cultural_context: Optional[str] = None
    
    class Config:
        from_attributes = True


class ExampleOutputResponse(BaseModel):
    """Example outputs for documentation."""
    
    examples: dict


# ============================================
# ENDPOINTS
# ============================================

@router.post(
    "/enhanced/generate",
    response_model=EnhancedScriptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate enhanced AI script",
    description="""
    Generate a viral script with advanced features:
    
    **Languages:**
    - `hi` - Pure Hindi in Devanagari script (शुद्ध हिंदी)
    - `en` - English with Indian context
    - `hinglish` - Natural mix of Hindi (Roman) + English
    
    **Content Types:**
    - `reel` - Instagram Reel (15-90 sec)
    - `short` - YouTube Short (up to 60 sec)
    - `ad` - Product promotion/advertisement
    - `educational` - Educational/informative content
    
    **Tones:**
    - `funny` - Humorous with Indian humor references
    - `professional` - Business/career focused
    - `trendy` - Current trends, Gen-Z appeal
    
    **Output Includes:**
    - Hook (first 3 seconds to stop the scroll)
    - Main script body
    - Call-to-action
    - Alternative hooks (5 options)
    - Hashtag suggestions (10-15)
    - Trending audio suggestions
    - Timing breakdown
    """,
)
async def generate_enhanced_script(
    request: EnhancedScriptRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnhancedScriptResponse:
    """
    Generate an enhanced AI script with structured output.
    
    Example request for cafe promotion (Hinglish):
    ```json
    {
        "topic": "New cafe promotion with Instagram-worthy ambience in Koramangala",
        "language": "hinglish",
        "content_type": "reel",
        "tone": "trendy",
        "duration_seconds": 30
    }
    ```
    """
    # Check user credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please upgrade your plan.",
        )
    
    # Map content_type to ScriptType
    type_mapping = {
        "reel": ScriptType.REEL,
        "short": ScriptType.SHORT,
        "ad": ScriptType.AD,
        "promo": ScriptType.AD,
        "educational": ScriptType.YOUTUBE,
    }
    script_type = type_mapping.get(request.content_type, ScriptType.REEL)
    
    # Create internal request
    from app.schemas.script import ScriptGenerateRequest
    internal_request = ScriptGenerateRequest(
        topic=request.topic,
        language=request.language,
        script_type=script_type,
        category=ContentCategory.LIFESTYLE,  # Will be detected from topic
        tone=request.tone,
        target_duration_seconds=request.duration_seconds,
        target_audience=request.target_audience,
        include_hooks=True,
        include_hashtags=True,
        additional_instructions=request.additional_instructions,
    )
    
    # Generate using enhanced service
    script_service = EnhancedScriptService(db)
    script = await script_service.generate_script(
        user_id=current_user.id,
        request=internal_request,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 1
    current_user.total_scripts_generated += 1
    await db.commit()
    
    # Build response
    metadata = script.metadata or {}
    
    return EnhancedScriptResponse(
        id=str(script.id),
        title=script.title,
        language=script.language.value,
        tone=script.tone or "trendy",
        duration_seconds=script.target_duration_seconds,
        
        hook=metadata.get("hook", script.hooks[0] if script.hooks else ""),
        main_script=metadata.get("main_script", script.content),
        cta=metadata.get("cta", ""),
        full_script=script.content,
        
        alternative_hooks=script.hooks or [],
        hashtags=script.hashtags or [],
        audio_suggestions=metadata.get("audio_suggestions", []),
        timing_breakdown=metadata.get("timing_breakdown", {}),
        visual_suggestions=metadata.get("visual_suggestions", []),
        
        word_count=script.word_count,
        estimated_read_time_seconds=int(script.word_count / 2.5),
        cultural_context=script.generation_params.get("cultural_context") if script.generation_params else None,
    )


@router.get(
    "/enhanced/examples",
    response_model=ExampleOutputResponse,
    summary="Get example script outputs",
    description="Get example outputs for cafe promotion, fitness tips, and Diwali sale.",
)
async def get_example_outputs() -> ExampleOutputResponse:
    """
    Returns example outputs for documentation and testing.
    
    Examples included:
    1. Cafe Promotion (Hinglish)
    2. Fitness Tips (Hindi)
    3. Diwali Sale (English)
    """
    return ExampleOutputResponse(examples=EXAMPLE_OUTPUTS)


@router.get(
    "/enhanced/languages",
    summary="Get available languages",
    description="Get list of supported languages with examples.",
)
async def get_languages():
    """Get available languages with usage examples."""
    return {
        "languages": [
            {
                "code": "hi",
                "name": "Hindi",
                "native_name": "हिंदी",
                "script": "Devanagari",
                "example": "नमस्ते दोस्तों! आज हम बात करेंगे एक ऐसे टॉपिक पर...",
                "use_case": "Pure Hindi content, regional audience",
            },
            {
                "code": "en",
                "name": "English",
                "native_name": "English",
                "script": "Latin",
                "example": "Hey everyone! Today we're diving into something exciting...",
                "use_case": "Professional content, global reach",
            },
            {
                "code": "hinglish",
                "name": "Hinglish",
                "native_name": "हिंग्लिश",
                "script": "Latin (Roman Hindi)",
                "example": "Aaj main aapko bataunga ek amazing trick jo seriously change kar degi aapki life!",
                "use_case": "Most popular for Indian social media, urban audience",
            },
        ]
    }


@router.get(
    "/enhanced/tones",
    summary="Get available tones",
    description="Get list of supported content tones.",
)
async def get_tones():
    """Get available content tones with descriptions."""
    return {
        "tones": [
            {
                "code": "funny",
                "name": "Funny",
                "hindi": "मज़ाकिया",
                "description": "Humorous content with Indian humor references",
                "best_for": ["Entertainment", "Comedy", "Relatability"],
            },
            {
                "code": "professional",
                "name": "Professional",
                "hindi": "पेशेवर",
                "description": "Business-appropriate, trustworthy content",
                "best_for": ["Business", "Career", "Education"],
            },
            {
                "code": "trendy",
                "name": "Trendy",
                "hindi": "ट्रेंडी",
                "description": "Current trends, modern language, Gen-Z appeal",
                "best_for": ["Lifestyle", "Fashion", "Entertainment"],
            },
        ]
    }


@router.get(
    "/enhanced/content-types",
    summary="Get available content types",
    description="Get list of supported content types with specifications.",
)
async def get_content_types():
    """Get available content types with format specifications."""
    return {
        "content_types": [
            {
                "code": "reel",
                "name": "Instagram Reel",
                "platform": "Instagram",
                "duration_range": "15-90 seconds",
                "aspect_ratio": "9:16 (vertical)",
                "best_practices": [
                    "Hook in first 3 seconds",
                    "Use trending audio",
                    "Include text overlays",
                ],
            },
            {
                "code": "short",
                "name": "YouTube Short",
                "platform": "YouTube",
                "duration_range": "Up to 60 seconds",
                "aspect_ratio": "9:16 (vertical)",
                "best_practices": [
                    "Strong opening",
                    "Value-packed content",
                    "Clear CTA",
                ],
            },
            {
                "code": "ad",
                "name": "Product Promo",
                "platform": "Multi-platform",
                "duration_range": "15-60 seconds",
                "aspect_ratio": "Various",
                "best_practices": [
                    "Problem-solution format",
                    "Social proof",
                    "Limited time offers",
                ],
            },
            {
                "code": "educational",
                "name": "Educational",
                "platform": "Multi-platform",
                "duration_range": "30-120 seconds",
                "aspect_ratio": "Various",
                "best_practices": [
                    "Clear structure",
                    "Practical examples",
                    "Actionable takeaways",
                ],
            },
        ]
    }
