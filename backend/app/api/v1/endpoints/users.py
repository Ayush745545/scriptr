"""
User API Endpoints
Handles user profile management.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get profile of currently authenticated user.",
)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user's profile."""
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user",
    description="Update profile of currently authenticated user.",
)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update current user's profile.
    
    - Supports Hindi names and bio (Unicode)
    - Partial updates allowed
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.get(
    "/me/usage",
    summary="Get usage statistics",
    description="Get current user's usage statistics and remaining credits.",
)
async def get_user_usage(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get user's usage statistics."""
    return {
        "subscription_tier": current_user.subscription_tier.value,
        "subscription_expires_at": current_user.subscription_expires_at,
        "credits_remaining": current_user.credits_remaining,
        "usage": {
            "scripts_generated": current_user.total_scripts_generated,
            "captions_generated": current_user.total_captions_generated,
            "thumbnails_created": current_user.total_thumbnails_created,
        },
        "limits": {
            "free": {
                "scripts_per_month": 10,
                "captions_per_month": 5,
                "thumbnails_per_month": 20,
            },
            "starter": {
                "scripts_per_month": 50,
                "captions_per_month": 25,
                "thumbnails_per_month": 100,
            },
            "pro": {
                "scripts_per_month": -1,  # Unlimited
                "captions_per_month": 100,
                "thumbnails_per_month": -1,
            },
        },
    }


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete account",
    description="Delete current user's account and all associated data.",
)
async def delete_current_user_account(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Delete user account.
    
    Warning: This action is irreversible.
    All user data including scripts, captions, and thumbnails will be deleted.
    """
    await db.delete(current_user)
    await db.commit()
    return None
