"""
Thumbnail API Endpoints
AI-powered thumbnail generation.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.thumbnail import Thumbnail, ThumbnailStatus, ThumbnailStyle
from app.schemas.thumbnail import (
    ThumbnailGenerateRequest,
    ThumbnailResponse,
    ThumbnailListResponse,
    ThumbnailUpdateRequest,
    ThumbnailVariantRequest,
    ThumbnailFormulaResponse,
    FontInfoResponse,
    EditorRenderRequest,
    EditorRenderResponse,
    StickerSuggestionResponse,
)
from app.services.thumbnail_service import ThumbnailService, THUMBNAIL_FORMULAS
from app.services.font_service import list_fonts, ensure_core_fonts

router = APIRouter()


@router.post(
    "/generate",
    response_model=ThumbnailResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate thumbnail",
    description="Generate AI-powered video thumbnail.",
)
async def generate_thumbnail(
    request: ThumbnailGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate AI-powered thumbnail.
    
    Features:
    - Hindi text overlay support (हिंदी टेक्स्ट)
    - Multiple style presets
    - AI-generated backgrounds
    - Face/person integration
    - Multiple variant generation
    
    Example primary_text:
    - "5 SECRET TIPS 🔥"
    - "कैसे बनें SUCCESSFUL?"
    - "ये MISTAKE मत करना!"
    """
    # Check credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )
    
    thumbnail_service = ThumbnailService(db)
    
    # Create thumbnail job
    thumbnail = await thumbnail_service.create_thumbnail(
        user_id=current_user.id,
        request=request,
    )
    
    # Start generation in background
    background_tasks.add_task(
        thumbnail_service.generate_thumbnail,
        thumbnail_id=thumbnail.id,
        generate_variants=request.generate_variants,
        output_sizes=request.output_sizes,
        formula_id=request.formula_id,
        enhance=request.enhance,
        stickers=[s.model_dump() for s in request.stickers] if request.stickers else None,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 1
    current_user.total_thumbnails_created += 1
    await db.commit()
    
    return thumbnail


@router.post(
    "/upload-face",
    summary="Upload face image",
    description="Upload a face/person image for thumbnail.",
)
async def upload_face_image(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(..., description="Face/person image"),
):
    """
    Upload a face image for use in thumbnails.
    
    - Supports: .jpg, .jpeg, .png, .webp
    - Automatic face detection
    - Background removal
    """
    thumbnail_service = ThumbnailService(db)
    
    result = await thumbnail_service.upload_face_image(
        user_id=current_user.id,
        file=file,
    )
    
    return {
        "face_image_url": result["url"],
        "face_detected": result["face_detected"],
        "background_removed": result["background_removed"],
    }


@router.get(
    "",
    response_model=ThumbnailListResponse,
    summary="List thumbnails",
    description="Get paginated list of user's thumbnails.",
)
async def list_thumbnails(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[ThumbnailStatus] = Query(None, alias="status"),
    style: Optional[ThumbnailStyle] = None,
):
    """List user's thumbnails."""
    query = select(Thumbnail).where(Thumbnail.user_id == current_user.id)
    
    if status_filter:
        query = query.where(Thumbnail.status == status_filter)
    if style:
        query = query.where(Thumbnail.style == style)
    
    # Exclude variants from main list
    query = query.where(Thumbnail.parent_thumbnail_id.is_(None))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.order_by(Thumbnail.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    thumbnails = result.scalars().all()
    
    return ThumbnailListResponse(
        items=thumbnails,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get(
    "/{thumbnail_id}",
    response_model=ThumbnailResponse,
    summary="Get thumbnail",
    description="Get thumbnail details.",
)
async def get_thumbnail(
    thumbnail_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get thumbnail details."""
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    thumbnail = result.scalar_one_or_none()
    
    if not thumbnail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )
    
    return thumbnail


@router.patch(
    "/{thumbnail_id}",
    response_model=ThumbnailResponse,
    summary="Update thumbnail",
    description="Update thumbnail settings.",
)
async def update_thumbnail(
    thumbnail_id: UUID,
    update_data: ThumbnailUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update thumbnail.
    
    If regenerate=true, a new thumbnail will be generated
    with the updated settings.
    """
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    thumbnail = result.scalar_one_or_none()
    
    if not thumbnail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    regenerate = update_dict.pop("regenerate", False)
    
    for field, value in update_dict.items():
        setattr(thumbnail, field, value)
    
    if regenerate:
        # Check credits
        if current_user.credits_remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits for regeneration",
            )
        
        thumbnail.status = ThumbnailStatus.PENDING
        
        # Start regeneration in background
        thumbnail_service = ThumbnailService(db)
        background_tasks.add_task(
            thumbnail_service.generate_thumbnail,
            thumbnail_id=thumbnail.id,
        )
        
        current_user.credits_remaining -= 1
    
    await db.commit()
    await db.refresh(thumbnail)
    
    return thumbnail


@router.post(
    "/{thumbnail_id}/variant",
    response_model=ThumbnailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create A/B variant",
    description="Create a thumbnail variant for A/B testing.",
)
async def create_thumbnail_variant(
    thumbnail_id: UUID,
    request: ThumbnailVariantRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create A/B test variant of a thumbnail.
    
    Useful for testing different:
    - Text variations
    - Color schemes
    - Layouts
    """
    # Get original thumbnail
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )
    
    # Check credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )
    
    thumbnail_service = ThumbnailService(db)
    variant = await thumbnail_service.create_variant(
        original=original,
        variant_name=request.variant_name,
        changes=request.changes,
    )
    
    # Start generation in background
    background_tasks.add_task(
        thumbnail_service.generate_thumbnail,
        thumbnail_id=variant.id,
    )
    
    current_user.credits_remaining -= 1
    current_user.total_thumbnails_created += 1
    await db.commit()
    
    return variant


@router.get(
    "/{thumbnail_id}/variants",
    summary="Get thumbnail variants",
    description="Get all A/B test variants of a thumbnail.",
)
async def get_thumbnail_variants(
    thumbnail_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all variants of a thumbnail."""
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.parent_thumbnail_id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    variants = result.scalars().all()
    
    return {"variants": variants}


@router.post(
    "/{thumbnail_id}/download",
    summary="Download thumbnail",
    description="Get download URL for thumbnail.",
)
async def download_thumbnail(
    thumbnail_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get thumbnail download URL."""
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    thumbnail = result.scalar_one_or_none()
    
    if not thumbnail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )
    
    if thumbnail.status != ThumbnailStatus.COMPLETED or not thumbnail.output_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thumbnail not ready for download",
        )
    
    # Increment download count
    thumbnail.download_count += 1
    await db.commit()
    
    return {
        "download_url": thumbnail.output_url,
        "filename": f"{thumbnail.title.replace(' ', '_')}.png",
    }


@router.delete(
    "/{thumbnail_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete thumbnail",
    description="Delete thumbnail and all variants.",
)
async def delete_thumbnail(
    thumbnail_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete thumbnail and its variants."""
    result = await db.execute(
        select(Thumbnail).where(
            Thumbnail.id == thumbnail_id,
            Thumbnail.user_id == current_user.id,
        )
    )
    thumbnail = result.scalar_one_or_none()
    
    if not thumbnail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )
    
    # Delete variants first
    await db.execute(
        select(Thumbnail).where(Thumbnail.parent_thumbnail_id == thumbnail_id)
    )
    
    await db.delete(thumbnail)
    await db.commit()
    
    return None


# ── New v2 endpoints ────────────────────────────────────────────────────────


@router.get(
    "/meta/formulas",
    response_model=list[ThumbnailFormulaResponse],
    summary="List thumbnail formulas",
    description="Get the 5 Indian-niche thumbnail formulas with layout hints.",
)
async def list_formulas():
    """
    Returns 5 battle-tested thumbnail formulas for Indian niches:
    1. Shocked Face + Arrow + Text
    2. Before / After Split Screen
    3. Text-Heavy Listicle / Numbered
    4. Minimal Gradient + Centered Text
    5. Food Close-Up + Badge / Price Tag
    """
    return THUMBNAIL_FORMULAS


@router.get(
    "/meta/fonts",
    response_model=list[FontInfoResponse],
    summary="List available fonts",
    description="Get all 10 fonts in the font registry with availability status.",
)
async def list_available_fonts(
    script: Optional[str] = Query(
        None,
        description="Filter by script: devanagari, latin, both",
    ),
):
    """
    Returns the 10 Indian-popular fonts:
    - 4 Devanagari/bilingual fonts (Noto Sans Devanagari, Tiro, Mukta, Baloo 2)
    - 6 Latin display fonts (Poppins, Montserrat, Bebas Neue, Oswald, etc.)
    """
    return list_fonts(script_filter=script)


@router.post(
    "/meta/fonts/download",
    summary="Download core fonts",
    description="Download the minimum set of fonts (Noto Devanagari + Poppins + Mukta + Bebas Neue).",
)
async def download_core_fonts():
    """Download core fonts to the server's asset directory."""
    downloaded = await ensure_core_fonts()
    return {"downloaded": downloaded, "count": len(downloaded)}


@router.get(
    "/meta/sticker-suggestions",
    response_model=StickerSuggestionResponse,
    summary="Get sticker/emoji suggestions",
    description="Suggest emojis and stickers for a given niche.",
)
async def sticker_suggestions(
    niche: str = Query(
        "general",
        description="Content niche: tech, food, fitness, education, motivation, etc.",
    ),
):
    """Return sticker/emoji suggestions based on niche."""
    niche_emojis = {
        "tech": ["📱", "💻", "🔥", "⚡", "🚀", "🎮", "🤖", "👆"],
        "food": ["🍛", "🍕", "🔥", "⭐", "🤤", "👨‍🍳", "😋", "₹"],
        "fitness": ["💪", "🏋️", "🔥", "⭐", "🏃", "💯", "🥇", "✅"],
        "education": ["📚", "🎯", "💡", "📌", "✅", "🧠", "📊", "🏆"],
        "motivation": ["🙏", "💫", "🌟", "🔥", "💪", "✨", "🎯", "👑"],
        "beauty": ["✨", "💄", "🌸", "💅", "🪞", "⭐", "🔥", "💕"],
        "finance": ["💰", "📈", "🏦", "💎", "📊", "🤑", "₹", "💸"],
        "vlog": ["📸", "🎬", "🔥", "😱", "👆", "⚡", "🤩", "🎉"],
        "gaming": ["🎮", "🔥", "⚡", "👾", "🏆", "💀", "🎯", "👆"],
        "reaction": ["😱", "🤯", "😲", "🔥", "⚡", "👀", "❓", "💯"],
    }

    emojis = niche_emojis.get(niche, ["🔥", "⭐", "💯", "👆", "😱", "🚀", "✅", "💡"])

    sticker_packs = [
        {"name": "Arrows & Pointers", "items": ["👆", "👇", "👈", "👉", "↗️", "⬆️"]},
        {"name": "Reactions", "items": ["😱", "🤯", "😲", "🤩", "😮", "🥺"]},
        {"name": "Badges", "items": ["🔥", "⭐", "💯", "✅", "🏆", "🥇"]},
        {"name": "Indian Symbols", "items": ["🙏", "🪔", "🇮🇳", "₹", "🕉️", "🎪"]},
    ]

    return StickerSuggestionResponse(
        niche=niche,
        emojis=emojis,
        sticker_packs=sticker_packs,
    )


@router.post(
    "/editor/render",
    response_model=EditorRenderResponse,
    summary="Render from canvas editor",
    description="Render final PNG(s) from the canvas editor's layer stack.",
)
async def render_from_editor(
    request: EditorRenderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Accepts a canvas_json with layers (image/text/emoji) and
    renders them server-side at each requested output size.
    Returns download URLs.
    """
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )

    thumbnail_service = ThumbnailService(db)

    outputs = await thumbnail_service.render_from_editor(
        user_id=current_user.id,
        canvas_json=request.canvas_json,
        output_sizes=request.output_sizes,
        enhance=request.enhance,
    )

    current_user.credits_remaining -= 1
    await db.commit()

    return EditorRenderResponse(outputs=outputs)


@router.post(
    "/upload-background",
    summary="Upload background image",
    description="Upload a background image for thumbnail (auto-detected face crop).",
)
async def upload_background(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(..., description="Background image (jpg/png/webp)"),
):
    """
    Upload a background image.
    Returns the URL and face-detection metadata.
    """
    from app.services.storage_service import StorageService

    content = await file.read()
    storage = StorageService()
    url = await storage.upload_file_content(
        content=content,
        filename=f"bg_{current_user.id}_{file.filename}",
        folder=f"thumbnails/{current_user.id}/backgrounds",
        content_type=file.content_type,
    )

    # Detect face for smart crop hint
    from PIL import Image as PILImage
    import io
    img = PILImage.open(io.BytesIO(content))
    svc = ThumbnailService(db)
    face_region = svc._detect_face_region(img)

    return {
        "url": url,
        "width": img.width,
        "height": img.height,
        "face_detected": face_region is not None,
        "face_region": face_region,
    }
