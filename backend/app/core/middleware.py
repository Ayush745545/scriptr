"""
Custom Middleware for the application.
"""

import time
import uuid
from typing import Callable
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging all requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Log request
        logger.info(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            # Log response
            logger.info(
                "request_completed",
                request_id=request_id,
                status_code=response.status_code,
                process_time=process_time,
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "request_failed",
                request_id=request_id,
                error=str(e),
            )
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.
    For production, use Redis-based rate limiting.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limit_data = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier (IP address or user ID if authenticated)
        client_id = request.client.host if request.client else "unknown"
        
        # Check rate limit
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)
        
        # Clean old entries
        self.rate_limit_data[client_id] = [
            timestamp for timestamp in self.rate_limit_data[client_id]
            if timestamp > minute_ago
        ]
        
        # Check if rate limit exceeded
        if len(self.rate_limit_data[client_id]) >= settings.RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"},
            )
        
        # Record this request
        self.rate_limit_data[client_id].append(now)
        
        return await call_next(request)


class UnicodeMiddleware(BaseHTTPMiddleware):
    """
    Middleware to ensure proper Unicode handling for Indian languages.
    Sets appropriate content-type headers and normalizes Unicode.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Ensure UTF-8 encoding for JSON responses
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type and "charset" not in content_type:
            response.headers["content-type"] = "application/json; charset=utf-8"
        
        return response
