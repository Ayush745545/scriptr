"""
Hooks API Endpoints v2
======================
Viral hook generator with:
- GPT-4 generation (5 hook types, performance prediction)
- 20 proven Indian-audience templates
- A/B test tracking (crowdsource what works)
- Community leaderboard
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Hook
from app.schemas.hook import (
    HookGenerateRequest,
    HookGenerateResponse,
    HookVariation,
    HookTemplateItem,
    HookTemplatesResponse,
    HookLeaderboardResponse,
    HookTypeInfo,
    ABTestVoteRequest,
    HOOK_TYPES,
    HOOK_TYPE_LABELS,
)
from app.services.hook_service import HookService

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  GENERATE HOOKS
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/generate",
    response_model=HookGenerateResponse,
    summary="Generate hook variations with performance prediction",
    description="Generate 5 scroll-stopping hook variations using GPT-4 with few-shot examples from top Indian creators.",
)
async def generate_hooks(
    request: HookGenerateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate AI-powered hook variations.

    Each hook includes:
    - Hook text in requested language (Hindi/English/Hinglish)
    - Hook type (curiosity_gap, contrarian, relatable_struggle, numbers_list, direct_address)
    - Performance prediction score (0-100)
    - Reasoning for the score

    The hooks are persisted to the database for A/B tracking.
    """
    hook_service = HookService(db)

    result = await hook_service.generate_hooks(
        topic=request.topic,
        target_audience=request.target_audience,
        platform=request.platform,
        language=request.language,
        category=request.category,
        count=request.count,
        user_id=current_user.id,
    )

    hook_variations = []
    for h in result["hooks"]:
        hook_type = h.get("hook_type", "curiosity_gap")
        label_info = HOOK_TYPE_LABELS.get(hook_type, {})
        hook_variations.append(
            HookVariation(
                id=h.get("id"),
                text=h["text"],
                text_hindi=h.get("text_hindi"),
                text_english=h.get("text_english"),
                hook_type=hook_type,
                hook_type_label=label_info.get("en", hook_type),
                predicted_score=h.get("predicted_score", 75),
                predicted_reasoning=h.get("predicted_reasoning", ""),
                platform=request.platform,
            )
        )

    return HookGenerateResponse(
        topic=request.topic,
        target_audience=request.target_audience,
        platform=request.platform,
        language=request.language,
        category=request.category,
        batch_id=result["batch_id"],
        hooks=hook_variations,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  A/B TEST TRACKING
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/{hook_id}/vote",
    summary="Record A/B test result for a hook",
    description="Mark whether a hook 'worked' or 'failed' when used in actual content.",
)
async def vote_hook(
    hook_id: UUID,
    request: ABTestVoteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    A/B test tracker — users mark which hooks actually worked.

    Crowdsources hook performance data across the community.
    """
    if request.result not in ("worked", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="result must be 'worked' or 'failed'",
        )

    hook_service = HookService(db)
    result = await hook_service.vote_ab(hook_id, request.result)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hook not found",
        )

    return result


# ══════════════════════════════════════════════════════════════════════════════
#  LEADERBOARD
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/leaderboard",
    response_model=HookLeaderboardResponse,
    summary="Community hook leaderboard",
    description="Top-performing hooks ranked by crowd-sourced A/B test scores.",
)
async def get_leaderboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=20, ge=1, le=100),
):
    """Leaderboard of hooks ranked by community votes."""
    hook_service = HookService(db)
    return await hook_service.get_leaderboard(limit)


# ══════════════════════════════════════════════════════════════════════════════
#  PROVEN TEMPLATES (20 templates)
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/templates",
    response_model=HookTemplatesResponse,
    summary="Get 20 proven hook templates for Indian audiences",
    description="Curated templates based on top 100 Indian creators' viral patterns.",
)
async def get_hook_templates(
    hook_type: Optional[str] = Query(
        None, description="Filter by hook type: curiosity_gap, contrarian, relatable_struggle, numbers_list, direct_address"
    ),
    category: Optional[str] = None,
    platform: Optional[str] = Query(None, description="reel, short, or both"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
):
    """Return the 20 proven Indian hook templates."""
    hook_service = HookService.__new__(HookService)
    templates = hook_service.get_proven_templates(hook_type, category, platform)

    total = len(templates)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = templates[start:end]

    return HookTemplatesResponse(
        items=[HookTemplateItem(**t) for t in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  HOOK TYPES
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/types",
    summary="Get the 5 hook types with examples",
    description="Returns the 5 proven hook formulas with descriptions and examples.",
)
async def get_hook_types():
    """
    The 5 hook types that work for Indian audiences:
    1. Curiosity Gap
    2. Contrarian
    3. Relatable Struggle
    4. Numbers / Lists
    5. Direct Address
    """
    types = []
    example_map = {
        "curiosity_gap": [
            "Maine ₹50,000 waste kiye taaki aapko na karne pade...",
            "Ye cheez 90% log galat karte hain aur unhe pata bhi nahi...",
            "I wasted 3 years learning this. You'll get it in 60 seconds.",
        ],
        "contrarian": [
            "Sab bol rahe hain mutual funds invest karo. Main bataunga kyun galat hai.",
            "Unpopular opinion: IIT is overrated. Here's why...",
            "Doctor ne bola roz doodh piyo? Science kehti hai galat.",
        ],
        "relatable_struggle": [
            "POV: Tu Delhi ka student hai aur metro mein jagah nahi mil rahi.",
            "Salary aayi, EMI gayi, credit card bill aaya... kuch bacha? Nahi.",
            "Mummy: 'Kuch khaaya?' Me: 'Haan' (khaaya nahi).",
        ],
        "numbers_list": [
            "3 jagah Delhi mein under ₹200 jo tourist nahi jaante.",
            "5 apps jo delete kar do — battery aur data dono bachega.",
            "Top 7 mistakes first-time investors karte hain.",
        ],
        "direct_address": [
            "Agar tu abhi 20s mein hai, toh STOP. Ye sun pehle.",
            "Small business owner ho? Ye reel save kar lo.",
            "Ye video unke liye hai jinhone last month gym chhod diya.",
        ],
    }

    for t_id in HOOK_TYPES:
        info = HOOK_TYPE_LABELS.get(t_id, {})
        types.append(
            HookTypeInfo(
                id=t_id,
                label_en=info.get("en", t_id),
                label_hi=info.get("hi", ""),
                description=info.get("desc", ""),
                examples=example_map.get(t_id, []),
            )
        )

    return {"types": types}


# ══════════════════════════════════════════════════════════════════════════════
#  TRENDING (most-used hooks)
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/trending",
    summary="Get trending hooks",
    description="Most-used hooks across the community.",
)
async def get_trending_hooks(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
):
    """Trending hooks by usage count."""
    query = (
        select(Hook)
        .order_by(Hook.usage_count.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    hooks = result.scalars().all()

    return {
        "trending": [
            {
                "id": str(h.id),
                "text": h.text,
                "text_hindi": h.text_hindi,
                "text_english": h.text_english,
                "hook_type": h.hook_type,
                "category": h.category,
                "platform": h.platform,
                "usage_count": h.usage_count,
                "ab_score": h.ab_score,
                "times_tested": h.times_tested,
            }
            for h in hooks
        ]
    }


# ══════════════════════════════════════════════════════════════════════════════
#  TRACK USAGE (legacy compat)
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/use/{hook_id}",
    summary="Track hook usage",
    description="Record when a hook is used (copy/use in content).",
)
async def track_hook_usage(
    hook_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Increment usage count when a hook is used."""
    result = await db.execute(select(Hook).where(Hook.id == hook_id))
    hook = result.scalar_one_or_none()

    if not hook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hook not found",
        )

    hook.usage_count += 1
    await db.commit()

    return {"success": True, "usage_count": hook.usage_count}


# ══════════════════════════════════════════════════════════════════════════════
#  USER'S HOOK HISTORY
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/history",
    summary="Get user's generated hook history",
    description="All hooks previously generated by the current user.",
)
async def get_hook_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List user's previously generated hooks with A/B results."""
    base_query = (
        select(Hook)
        .where(Hook.user_id == current_user.id)
        .where(Hook.is_ai_generated == True)
    )

    count_q = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = base_query.order_by(Hook.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    hooks = result.scalars().all()

    return {
        "items": [
            {
                "id": str(h.id),
                "text": h.text,
                "text_hindi": h.text_hindi,
                "text_english": h.text_english,
                "hook_type": h.hook_type,
                "category": h.category,
                "platform": h.platform,
                "target_audience": h.target_audience,
                "predicted_score": h.predicted_score,
                "predicted_reasoning": h.predicted_reasoning,
                "times_tested": h.times_tested,
                "times_worked": h.times_worked,
                "times_failed": h.times_failed,
                "ab_score": h.ab_score,
                "usage_count": h.usage_count,
                "generation_topic": h.generation_topic,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in hooks
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
