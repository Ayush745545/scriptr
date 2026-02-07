"""
Project API Endpoints
Project management for organizing content.
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project

router = APIRouter()


class ProjectCreate(BaseModel):
    """Create project request."""
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None


class ProjectUpdate(BaseModel):
    """Update project request."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None
    cover_image_url: Optional[str] = None


class ProjectResponse(BaseModel):
    """Project response."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    status: str
    cover_image_url: Optional[str] = None
    scripts_count: int = 0
    captions_count: int = 0
    thumbnails_count: int = 0
    
    class Config:
        from_attributes = True


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create project",
    description="Create a new project to organize content.",
)
async def create_project(
    request: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new project.
    
    Projects help organize related content:
    - Scripts
    - Captions
    - Thumbnails
    - Templates
    """
    project = Project(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        category=request.category,
        tags=request.tags,
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        category=project.category,
        tags=project.tags,
        status=project.status,
        cover_image_url=project.cover_image_url,
    )


@router.get(
    "",
    summary="List projects",
    description="Get paginated list of user's projects.",
)
async def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
):
    """List user's projects."""
    query = select(Project).where(Project.user_id == current_user.id)
    
    if status_filter:
        query = query.where(Project.status == status_filter)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.order_by(Project.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # Get counts for each project
    items = []
    for project in projects:
        items.append(ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            category=project.category,
            tags=project.tags,
            status=project.status,
            cover_image_url=project.cover_image_url,
            scripts_count=len(project.scripts) if project.scripts else 0,
            captions_count=len(project.captions) if project.captions else 0,
            thumbnails_count=len(project.thumbnails) if project.thumbnails else 0,
        ))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project",
    description="Get project details.",
)
async def get_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get project details."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        category=project.category,
        tags=project.tags,
        status=project.status,
        cover_image_url=project.cover_image_url,
        scripts_count=len(project.scripts) if project.scripts else 0,
        captions_count=len(project.captions) if project.captions else 0,
        thumbnails_count=len(project.thumbnails) if project.thumbnails else 0,
    )


@router.get(
    "/{project_id}/content",
    summary="Get project content",
    description="Get all content (scripts, captions, thumbnails) in a project.",
)
async def get_project_content(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all content in a project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    return {
        "project_id": project.id,
        "project_name": project.name,
        "scripts": project.scripts,
        "captions": project.captions,
        "thumbnails": project.thumbnails,
    }


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    description="Update project details.",
)
async def update_project(
    project_id: UUID,
    update_data: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        category=project.category,
        tags=project.tags,
        status=project.status,
        cover_image_url=project.cover_image_url,
    )


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete project",
    description="Delete project (content is preserved but unlinked).",
)
async def delete_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    await db.delete(project)
    await db.commit()
    
    return None
