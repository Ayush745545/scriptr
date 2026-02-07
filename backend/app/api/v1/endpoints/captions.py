"""
Caption/Transcription API Endpoints
Auto-caption generation using Whisper API.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.caption import Caption, TranscriptionStatus, CaptionFormat
from app.schemas.caption import (
    CaptionGenerateRequest,
    CaptionResponse,
    CaptionListResponse,
    CaptionUpdateRequest,
    CaptionExportRequest,
    CaptionExportResponse,
)
from app.services.caption_service import CaptionService

router = APIRouter()


@router.post(
    "/generate",
    response_model=CaptionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate captions from video/audio",
    description="Start caption generation job using Whisper API.",
)
async def generate_captions(
    request: CaptionGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate auto-captions for video/audio.
    
    - Supports Hindi, English, and Hinglish audio
    - Uses OpenAI Whisper for accurate transcription
    - Word-level timestamps for karaoke style captions
    - Optional English translation for Hindi content
    
    Note: This is an async operation. The job status can be
    polled using GET /captions/{caption_id}
    """
    # Check user credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please upgrade your plan.",
        )
    
    caption_service = CaptionService(db)
    
    # Create caption job
    caption = await caption_service.create_caption_job(
        user_id=current_user.id,
        request=request,
    )
    
    # Start processing in background
    background_tasks.add_task(
        caption_service.process_transcription,
        caption_id=caption.id,
        word_timestamps=request.word_timestamps,
        translate=request.translate_to_english,
        language_hint=request.language_hint,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 2  # Captions cost 2 credits
    current_user.total_captions_generated += 1
    await db.commit()
    
    return caption


@router.post(
    "/upload",
    response_model=CaptionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and generate captions",
    description="Upload video/audio file and generate captions.",
)
async def upload_and_generate_captions(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(..., description="Video or audio file"),
    title: str = Form(..., max_length=500),
    language_hint: str = Form(default="auto"),
    word_timestamps: bool = Form(default=False),
    style_preset_id: Optional[str] = Form(default=None),
):
    """
    Upload media file and generate captions.
    
    - Accepts video: .mp4, .mov
    - Max file size: 100MB
    """
    # Validate file extension
    ext = f".{file.filename.split('.')[-1].lower()}"
    allowed_extensions = [".mp4", ".mov"]
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}",
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset
    
    max_size_mb = 100
    if file_size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {max_size_mb}MB",
        )
    
    # Upload to cloud storage and create caption job
    caption_service = CaptionService(db)
    caption = await caption_service.upload_and_create_job(
        user_id=current_user.id,
        file=file,
        title=title,
        language_hint=language_hint,
        style_preset_id=style_preset_id,
    )
    
    # Start processing in background
    background_tasks.add_task(
        caption_service.process_transcription,
        caption_id=caption.id,
        word_timestamps=word_timestamps,
        language_hint=language_hint,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 2
    current_user.total_captions_generated += 1
    await db.commit()
    
    return caption


@router.get(
    "",
    response_model=CaptionListResponse,
    summary="List user captions",
    description="Get paginated list of user's caption jobs.",
)
async def list_captions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[TranscriptionStatus] = Query(None, alias="status"),
):
    """List user's caption jobs."""
    query = select(Caption).where(Caption.user_id == current_user.id)
    
    if status_filter:
        query = query.where(Caption.status == status_filter)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.order_by(Caption.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    captions = result.scalars().all()
    
    return CaptionListResponse(
        items=captions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get(
    "/{caption_id}",
    response_model=CaptionResponse,
    summary="Get caption by ID",
    description="Get caption job details including transcription.",
)
async def get_caption(
    caption_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get caption job details."""
    result = await db.execute(
        select(Caption).where(
            Caption.id == caption_id,
            Caption.user_id == current_user.id,
        )
    )
    caption = result.scalar_one_or_none()
    
    if not caption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caption not found",
        )
    
    return caption


@router.patch(
    "/{caption_id}",
    response_model=CaptionResponse,
    summary="Update captions",
    description="Edit caption segments or styling.",
)
async def update_caption(
    caption_id: UUID,
    update_data: CaptionUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update caption content or styling.
    
    - Edit individual segment text
    - Adjust timing
    - Change caption style
    """
    result = await db.execute(
        select(Caption).where(
            Caption.id == caption_id,
            Caption.user_id == current_user.id,
        )
    )
    caption = result.scalar_one_or_none()
    
    if not caption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caption not found",
        )
    
    if caption.status != TranscriptionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit completed captions",
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "segments" and value:
            caption.segments = [s.model_dump() for s in value]
            caption.is_edited = True
        else:
            setattr(caption, field, value)
    
    await db.commit()
    await db.refresh(caption)
    
    return caption


@router.get(
    "/styles",
    summary="Get caption styles",
    description="Get presets for Indian aesthetic captions.",
)
async def get_caption_styles():
    """Get available caption styling presets."""
    from app.config.caption_styles import CAPTION_STYLES
    return {"styles": CAPTION_STYLES}


@router.post(
    "/{caption_id}/export",
    response_model=CaptionExportResponse,
    summary="Export captions",
    description="Export captions in various formats (SRT, VTT, ASS).",
)
async def export_caption(
    caption_id: UUID,
    export_request: CaptionExportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Export captions to file format.
    
    Supported formats:
    - SRT: Standard subtitle format
    - VTT: WebVTT for web players
    - ASS: Advanced SubStation Alpha (styled)
    - JSON: Raw segment data
    - TXT: Plain text transcription
    """
    result = await db.execute(
        select(Caption).where(
            Caption.id == caption_id,
            Caption.user_id == current_user.id,
        )
    )
    caption = result.scalar_one_or_none()

    if not caption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caption not found",
        )
    
    if caption.status != TranscriptionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caption transcription not completed",
        )
    
    caption_service = CaptionService(db)
    export_result = await caption_service.export_captions(
        caption=caption,
        format=export_request.format,
        include_translation=export_request.include_translation,
        style_settings=export_request.style_settings,
    )
    
    return export_result


@router.post(
    "/{caption_id}/burn",
    summary="Burn captions into video",
    description="Hardcode captions into the source video using FFmpeg + ASS styles (supports karaoke word highlighting).",
)
async def burn_captions_into_video(
    caption_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    style_preset_id: str = Query(default="minimal_chic"),
    karaoke: bool = Query(default=True),
):
    result = await db.execute(
        select(Caption).where(
            Caption.id == caption_id,
            Caption.user_id == current_user.id,
        )
    )
    caption = result.scalar_one_or_none()

    if not caption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caption not found",
        )

    if caption.status != TranscriptionStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caption transcription not completed",
        )

    caption_service = CaptionService(db)
    try:
        url = await caption_service.burn_captions_to_video(
            caption=caption,
            style_preset_id=style_preset_id,
            karaoke=karaoke,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to burn captions: {str(e)}",
        )

    return {
        "caption_id": str(caption.id),
        "download_url": url,
        "style_preset_id": style_preset_id,
        "karaoke": karaoke,
    }


@router.delete(
    "/{caption_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete caption",
    description="Delete caption job and associated files.",
)
async def delete_caption(
    caption_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete caption job."""
    result = await db.execute(
        select(Caption).where(
            Caption.id == caption_id,
            Caption.user_id == current_user.id,
        )
    )
    caption = result.scalar_one_or_none()
    
    if not caption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caption not found",
        )
    
    await db.delete(caption)
    await db.commit()
    
    return None
