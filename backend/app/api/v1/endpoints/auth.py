"""
Authentication API Endpoints
Handles user registration, login, and token management.
"""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    TokenResponse,
    LoginRequest,
    RefreshTokenRequest,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with email and password.",
)
async def register(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Register a new user.
    
    - Validates email uniqueness
    - Hashes password securely
    - Creates user with default free tier subscription
    - Supports Hindi names (Unicode)
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    user = User(
        email=user_data.email.lower(),
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        display_name=user_data.display_name,
        phone=user_data.phone,
        preferred_language=user_data.preferred_language,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login",
    description="Authenticate user and return JWT tokens.",
)
async def login(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Authenticate user and return access/refresh tokens.
    
    - Validates email and password
    - Returns JWT access token (30 min expiry)
    - Returns refresh token (7 days expiry)
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == login_data.email.lower())
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    
    # Create tokens
    access_token = create_access_token(
        subject=str(user.id),
        additional_claims={
            "email": user.email,
            "tier": user.subscription_tier.value,
        },
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Update last login
    from datetime import datetime
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Get new access token using refresh token.",
)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Returns new access token
    - Extends session
    """
    payload = decode_token(token_data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_id = payload.get("sub")
    
    # Verify user exists and is active
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Create new access token
    access_token = create_access_token(
        subject=str(user.id),
        additional_claims={
            "email": user.email,
            "tier": user.subscription_tier.value,
        },
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=token_data.refresh_token,  # Keep same refresh token
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="User logout",
    description="Invalidate user session (client should discard tokens).",
)
async def logout():
    """
    Logout user.
    
    Note: JWT tokens are stateless. Client should discard tokens.
    For production, implement token blacklisting with Redis.
    """
    # In production, add token to blacklist in Redis
    return None
