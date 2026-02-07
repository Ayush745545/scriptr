"""
Script Generation API Endpoints
AI-powered script generation for Hindi/English/Hinglish content.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.script import Script, ContentLanguage, ScriptType, ContentCategory
from app.schemas.script import (
    ScriptGenerateRequest,
    ScriptResponse,
    ScriptListResponse,
    ScriptUpdateRequest,
)
from app.services.script_service import ScriptService

router = APIRouter()


@router.post(
    "/generate",
    response_model=ScriptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI script",
    description="Generate a script using AI in Hindi/English/Hinglish.",
)
async def generate_script(
    request: ScriptGenerateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate AI-powered script.
    
    - Supports Hindi (हिंदी), English, and Hinglish
    - Multiple content types: Reel, Short, YouTube, Podcast, Ad
    - Various categories: Festival, Food, Fitness, Business, etc.
    - Configurable tone and duration
    - Includes hook and hashtag suggestions
    
    Example topics:
    - "How to make butter chicken at home" (English)
    - "घर पर बटर चिकन कैसे बनाएं" (Hindi)
    - "Ghar pe butter chicken kaise banaye" (Hinglish)
    """
    # Check user credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please upgrade your plan.",
        )
    
    # Generate script using AI service
    script_service = ScriptService(db)
    script = await script_service.generate_script(
        user_id=current_user.id,
        request=request,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 1
    current_user.total_scripts_generated += 1
    await db.commit()
    
    return script


@router.get(
    "",
    response_model=ScriptListResponse,
    summary="List user scripts",
    description="Get paginated list of user's generated scripts.",
)
async def list_scripts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    language: Optional[ContentLanguage] = None,
    script_type: Optional[ScriptType] = None,
    category: Optional[ContentCategory] = None,
    is_favorite: Optional[bool] = None,
    search: Optional[str] = Query(
        None,
        description="Search in title and content (Hindi/English)",
    ),
):
    """
    List user's generated scripts with filtering.
    
    - Filter by language, type, category
    - Filter favorites
    - Search in title/content (supports Hindi Unicode)
    - Paginated results
    """
    query = select(Script).where(Script.user_id == current_user.id)
    
    # Apply filters
    if language:
        query = query.where(Script.language == language)
    if script_type:
        query = query.where(Script.script_type == script_type)
    if category:
        query = query.where(Script.category == category)
    if is_favorite is not None:
        query = query.where(Script.is_favorite == is_favorite)
    if search:
        query = query.where(
            Script.title.ilike(f"%{search}%") |
            Script.content.ilike(f"%{search}%")
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.order_by(Script.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    scripts = result.scalars().all()
    
    return ScriptListResponse(
        items=scripts,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get(
    "/{script_id}",
    response_model=ScriptResponse,
    summary="Get script by ID",
    description="Get a specific script by its ID.",
)
async def get_script(
    script_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific script."""
    result = await db.execute(
        select(Script).where(
            Script.id == script_id,
            Script.user_id == current_user.id,
        )
    )
    script = result.scalar_one_or_none()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )
    
    return script


@router.patch(
    "/{script_id}",
    response_model=ScriptResponse,
    summary="Update script",
    description="Update a script's title, content, or metadata.",
)
async def update_script(
    script_id: UUID,
    update_data: ScriptUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a script.
    
    - Edit title and content
    - Toggle favorite status
    - Add rating and feedback
    """
    result = await db.execute(
        select(Script).where(
            Script.id == script_id,
            Script.user_id == current_user.id,
        )
    )
    script = result.scalar_one_or_none()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(script, field, value)
    
    await db.commit()
    await db.refresh(script)
    
    return script


@router.delete(
    "/{script_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete script",
    description="Delete a script permanently.",
)
async def delete_script(
    script_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a script."""
    result = await db.execute(
        select(Script).where(
            Script.id == script_id,
            Script.user_id == current_user.id,
        )
    )
    script = result.scalar_one_or_none()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )
    
    await db.delete(script)
    await db.commit()
    
    return None


@router.post(
    "/{script_id}/regenerate",
    response_model=ScriptResponse,
    summary="Regenerate script",
    description="Generate a new version of the script with the same parameters.",
)
async def regenerate_script(
    script_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Regenerate a script.
    
    Uses the same parameters as the original script
    to generate a fresh version.
    """
    result = await db.execute(
        select(Script).where(
            Script.id == script_id,
            Script.user_id == current_user.id,
        )
    )
    original_script = result.scalar_one_or_none()
    
    if not original_script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )
    
    # Check credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )
    
    # Regenerate using same parameters
    script_service = ScriptService(db)
    new_script = await script_service.regenerate_script(
        user_id=current_user.id,
        original_script=original_script,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 1
    current_user.total_scripts_generated += 1
    await db.commit()
    
    return new_script
