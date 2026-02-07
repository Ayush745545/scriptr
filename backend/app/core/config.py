"""
Application Configuration
Handles all environment variables and settings using Pydantic
"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Settings
    PROJECT_NAME: str = "ContentKaro"
    DEBUG: bool = False
    PORT: int = 8000
    WORKERS: int = 4
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://contentkaro.in",
    ]
    
    # Database Settings
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/contentkaro"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # OpenAI Settings
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 4096
    OPENAI_TEMPERATURE: float = 0.7
    
    # Whisper API Settings
    WHISPER_MODEL: str = "whisper-1"
    
    # AWS S3 Settings (if using S3)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-south-1"  # Mumbai region for Indian users
    AWS_S3_BUCKET: str = "contentkaro-media"
    
    # Cloudinary Settings (if using Cloudinary)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Storage Provider (s3 or cloudinary)
    STORAGE_PROVIDER: str = "cloudinary"
    
    # FFmpeg Settings
    FFMPEG_PATH: str = "/usr/bin/ffmpeg"
    FFPROBE_PATH: str = "/usr/bin/ffprobe"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # JWT Settings
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # File Upload Settings
    MAX_UPLOAD_SIZE_MB: int = 500  # 500MB for video files
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    ALLOWED_AUDIO_EXTENSIONS: List[str] = [".mp3", ".wav", ".m4a", ".aac"]
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp"]
    
    # Indian Language Settings
    DEFAULT_LANGUAGE: str = "hinglish"
    SUPPORTED_LANGUAGES: List[str] = ["hi", "en", "hinglish"]
    HINDI_FONT_PATH: str = "assets/fonts/NotoSansDevanagari-Regular.ttf"
    
    # Template Settings
    TEMPLATES_PER_CATEGORY: int = 10
    TEMPLATE_CATEGORIES: List[str] = [
        "festival",
        "food",
        "fitness",
        "business",
        "travel",
        "education",
        "entertainment",
        "fashion",
        "tech",
        "lifestyle",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
