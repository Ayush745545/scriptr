"""
Template API Endpoints
Reel templates for Indian content creators.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.template import Template, UserTemplate, TemplateCategory, TemplateType, AspectRatio
from app.schemas.template import (
    TemplateResponse,
    TemplateListResponse,
    TemplateFilterRequest,
    UserTemplateCreateRequest,
    UserTemplateResponse,
    RenderTemplateRequest,
    RenderStatusResponse,
    TemplateDefinitionResponse,
    TemplateAssetUploadResponse,
)
from app.services.template_service import TemplateService
from app.services.storage_service import StorageService

router = APIRouter()


@router.post(
    "/assets/upload",
    response_model=TemplateAssetUploadResponse,
    summary="Upload template asset",
    description="Upload a video/image/logo for use in template placeholders.",
)
async def upload_template_asset(
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    # Basic validation
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Missing content type")

    allowed = {
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/mp4",
        "video/quicktime",
    }
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}",
        )

    storage = StorageService()
    url = await storage.upload_file(file=file, folder=f"template-assets/{current_user.id}")
    return TemplateAssetUploadResponse(
        url=url,
        content_type=file.content_type,
        filename=file.filename,
    )


@router.get(
    "",
    response_model=TemplateListResponse,
    summary="Browse templates",
    description="Browse available video/reel templates.",
)
async def list_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: Optional[TemplateCategory] = None,
    template_type: Optional[TemplateType] = None,
    aspect_ratio: Optional[AspectRatio] = None,
    is_premium: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    festival_name: Optional[str] = None,
    search: Optional[str] = Query(
        None,
        description="Search in name, description, tags (Hindi/English)",
    ),
):
    """
    Browse templates with filtering.
    
    Available categories:
    - festival: Diwali, Holi, Eid, Christmas (दिवाली, होली)
    - food: Indian cuisine, recipes
    - fitness: Workout, yoga
    - business: Startup, entrepreneur
    - travel: Indian destinations
    - education: Tutorials, learning
    - entertainment: Movies, music
    - fashion: Indian fashion
    - tech: Tech reviews
    - lifestyle: Daily life
    """
    query = select(Template).where(Template.is_active == True)
    
    # Apply filters
    if category:
        query = query.where(Template.category == category)
    if template_type:
        query = query.where(Template.template_type == template_type)
    if aspect_ratio:
        query = query.where(Template.aspect_ratio == aspect_ratio)
    if is_premium is not None:
        query = query.where(Template.is_premium == is_premium)
    if is_featured is not None:
        query = query.where(Template.is_featured == is_featured)
    if festival_name:
        query = query.where(Template.festival_name.ilike(f"%{festival_name}%"))
    if search:
        query = query.where(
            or_(
                Template.name.ilike(f"%{search}%"),
                Template.name_hindi.ilike(f"%{search}%"),
                Template.description.ilike(f"%{search}%"),
                Template.tags.any(search),
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination and ordering
    query = query.order_by(
        Template.is_featured.desc(),
        Template.usage_count.desc(),
    )
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return TemplateListResponse(
        items=templates,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get(
    "/categories",
    summary="Get template categories",
    description="Get list of template categories with counts.",
)
async def get_template_categories(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get template categories with template counts."""
    result = await db.execute(
        select(
            Template.category,
            func.count(Template.id).label("count"),
        )
        .where(Template.is_active == True)
        .group_by(Template.category)
    )
    
    categories = []
    for row in result:
        categories.append({
            "category": row.category.value,
            "count": row.count,
            "label": {
                "en": row.category.value.title(),
                "hi": get_hindi_category_name(row.category),
            },
        })
    
    return {"categories": categories}


@router.get(
    "/featured",
    response_model=TemplateListResponse,
    summary="Get featured templates",
    description="Get featured/trending templates.",
)
async def get_featured_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=50),
):
    """Get featured and trending templates."""
    query = (
        select(Template)
        .where(Template.is_active == True, Template.is_featured == True)
        .order_by(Template.usage_count.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return TemplateListResponse(
        items=templates,
        total=len(templates),
        page=1,
        page_size=limit,
        has_more=False,
    )


@router.get(
    "/festivals",
    summary="Get festival templates",
    description="Get templates for upcoming Indian festivals.",
)
async def get_festival_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get templates for Indian festivals.
    
    Includes templates for:
    - Diwali (दिवाली)
    - Holi (होली)
    - Eid (ईद)
    - Dussehra (दशहरा)
    - Christmas (क्रिसमस)
    - Navratri (नवरात्रि)
    - Ganesh Chaturthi (गणेश चतुर्थी)
    - And more...
    """
    from datetime import datetime, timedelta
    
    # Get upcoming festivals (next 60 days)
    now = datetime.utcnow()
    upcoming = now + timedelta(days=60)
    
    query = (
        select(Template)
        .where(
            Template.is_active == True,
            Template.category == TemplateCategory.FESTIVAL,
            Template.festival_date >= now,
            Template.festival_date <= upcoming,
        )
        .order_by(Template.festival_date)
    )
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    # Group by festival
    festivals = {}
    for template in templates:
        if template.festival_name not in festivals:
            festivals[template.festival_name] = {
                "name": template.festival_name,
                "date": template.festival_date,
                "templates": [],
            }
        festivals[template.festival_name]["templates"].append(template)
    
    return {"festivals": list(festivals.values())}


@router.get(
    "/{template_id}",
    response_model=TemplateResponse,
    summary="Get template details",
    description="Get detailed information about a specific template.",
)
async def get_template(
    template_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get template details."""
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    return template


@router.get(
    "/{template_id}/definition",
    response_model=TemplateDefinitionResponse,
    summary="Get template definition",
    description="Get the JSON template definition (template_data) for rendering/preview.",
)
async def get_template_definition(
    template_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    return TemplateDefinitionResponse(template_id=template.id, template_data=template.template_data)


@router.post(
    "/{template_id}/use",
    response_model=UserTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Use template",
    description="Create a customized version of a template.",
)
async def use_template(
    template_id: UUID,
    request: UserTemplateCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Use a template with customizations.
    
    Customize:
    - Text fields (Hindi/English)
    - Colors
    - Images
    - Duration
    """
    # Verify template exists
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Check premium access
    if template.is_premium and current_user.subscription_tier.value == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium template requires paid subscription",
        )
    
    # Create user template
    user_template = UserTemplate(
        user_id=current_user.id,
        template_id=template_id,
        project_id=request.project_id,
        title=request.title,
        customizations=request.customizations,
        status="draft",
    )
    
    db.add(user_template)
    
    # Increment usage count
    template.usage_count += 1
    
    await db.commit()
    await db.refresh(user_template)
    
    return user_template


@router.post(
    "/render",
    response_model=RenderStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Render template",
    description="Start rendering a customized template to video.",
)
async def render_template(
    request: RenderTemplateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Start rendering a customized template.
    
    This is an async operation. Poll the status using
    GET /templates/render/{user_template_id}/status
    """
    # Verify user template exists
    result = await db.execute(
        select(UserTemplate).where(
            UserTemplate.id == request.user_template_id,
            UserTemplate.user_id == current_user.id,
        )
    )
    user_template = result.scalar_one_or_none()
    
    if not user_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Check credits
    if current_user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )
    
    # Update status
    user_template.status = "rendering"
    await db.commit()
    
    # Start rendering in background
    template_service = TemplateService(db)
    background_tasks.add_task(
        template_service.render_template,
        user_template_id=user_template.id,
        output_format=request.output_format,
        quality=request.quality,
        watermark=request.watermark,
    )
    
    # Deduct credits
    current_user.credits_remaining -= 1
    await db.commit()
    
    return RenderStatusResponse(
        user_template_id=user_template.id,
        status="rendering",
        progress=0,
        estimated_time_remaining=60,  # Estimate
    )


@router.get(
    "/render/{user_template_id}/status",
    response_model=RenderStatusResponse,
    summary="Get render status",
    description="Check the status of a template rendering job.",
)
async def get_render_status(
    user_template_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get rendering job status."""
    result = await db.execute(
        select(UserTemplate).where(
            UserTemplate.id == user_template_id,
            UserTemplate.user_id == current_user.id,
        )
    )
    user_template = result.scalar_one_or_none()
    
    if not user_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    return RenderStatusResponse(
        user_template_id=user_template.id,
        status=user_template.status,
        progress=user_template.render_progress,
        output_url=user_template.output_url,
        thumbnail_url=user_template.thumbnail_url,
        error_message=user_template.error_message,
    )


def get_hindi_category_name(category: TemplateCategory) -> str:
    """Get Hindi name for category."""
    names = {
        TemplateCategory.FESTIVAL: "त्योहार",
        TemplateCategory.FOOD: "खाना",
        TemplateCategory.FITNESS: "फिटनेस",
        TemplateCategory.BUSINESS: "व्यापार",
        TemplateCategory.TRAVEL: "यात्रा",
        TemplateCategory.EDUCATION: "शिक्षा",
        TemplateCategory.ENTERTAINMENT: "मनोरंजन",
        TemplateCategory.FASHION: "फैशन",
        TemplateCategory.TECH: "टेक्नोलॉजी",
        TemplateCategory.LIFESTYLE: "जीवनशैली",
    }
    return names.get(category, category.value)
