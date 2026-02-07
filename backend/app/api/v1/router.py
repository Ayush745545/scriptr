"""
API v1 Router
Aggregates all API routes.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    scripts,
    enhanced_scripts,
    captions,
    templates,
    thumbnails,
    hooks,
    projects,
    users,
)

api_router = APIRouter()

# Authentication routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# User management routes
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)

# Script generation routes
api_router.include_router(
    scripts.router,
    prefix="/scripts",
    tags=["Scripts"],
)

# Enhanced Script generation routes (with language toggle)
api_router.include_router(
    enhanced_scripts.router,
    prefix="/scripts",
    tags=["Enhanced Scripts"],
)

# Caption/transcription routes
api_router.include_router(
    captions.router,
    prefix="/captions",
    tags=["Captions"],
)

# Template routes
api_router.include_router(
    templates.router,
    prefix="/templates",
    tags=["Templates"],
)

# Thumbnail routes
api_router.include_router(
    thumbnails.router,
    prefix="/thumbnails",
    tags=["Thumbnails"],
)

# Hook suggestions routes
api_router.include_router(
    hooks.router,
    prefix="/hooks",
    tags=["Hooks"],
)

# Project management routes
api_router.include_router(
    projects.router,
    prefix="/projects",
    tags=["Projects"],
)
