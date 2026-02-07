"""
Cloud Storage Service
Handles file uploads to AWS S3 or Cloudinary.
"""

import io
from typing import Optional
from fastapi import UploadFile
import cloudinary
import cloudinary.uploader
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    """Service for cloud storage operations."""
    
    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        
        if self.provider == "cloudinary":
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
            )
        elif self.provider == "s3":
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
    
    async def upload_file(
        self,
        file: UploadFile,
        folder: str,
    ) -> str:
        """Upload a file and return its URL."""
        content = await file.read()
        
        return await self.upload_file_content(
            content=content,
            filename=file.filename,
            folder=folder,
            content_type=file.content_type,
        )
    
    async def upload_file_content(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Upload file content and return URL."""
        if self.provider == "cloudinary":
            return await self._upload_cloudinary(content, filename, folder)
        else:
            return await self._upload_s3(content, filename, folder, content_type)
    
    async def upload_text_file(
        self,
        content: str,
        filename: str,
        folder: str,
        content_type: str = "text/plain",
    ) -> str:
        """Upload text content as file."""
        return await self.upload_file_content(
            content=content.encode("utf-8"),
            filename=filename,
            folder=folder,
            content_type=content_type,
        )
    
    async def _upload_cloudinary(
        self,
        content: bytes,
        filename: str,
        folder: str,
    ) -> str:
        """Upload to Cloudinary."""
        # Determine resource type
        extension = filename.split(".")[-1].lower()
        if extension in ["mp4", "mov", "avi", "mkv", "webm"]:
            resource_type = "video"
        elif extension in ["mp3", "wav", "m4a", "aac"]:
            resource_type = "video"  # Cloudinary uses video for audio
        else:
            resource_type = "auto"
        
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            folder=f"contentkaro/{folder}",
            resource_type=resource_type,
            public_id=filename.rsplit(".", 1)[0],
        )
        
        return result["secure_url"]
    
    async def _upload_s3(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: Optional[str],
    ) -> str:
        """Upload to AWS S3."""
        key = f"{folder}/{filename}"
        
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        
        self.s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            **extra_args,
        )
        
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    
    async def delete_file(self, url: str):
        """Delete a file by URL."""
        if self.provider == "cloudinary":
            # Extract public_id from URL
            # URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
            parts = url.split("/")
            public_id = parts[-1].rsplit(".", 1)[0]
            folder = "/".join(parts[-3:-1]) if len(parts) > 3 else ""
            full_id = f"{folder}/{public_id}" if folder else public_id
            
            cloudinary.uploader.destroy(full_id)
        else:
            # Extract key from S3 URL
            key = url.split(f"{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/")[-1]
            self.s3_client.delete_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key,
            )
    
    async def get_signed_url(
        self,
        url: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """Get a signed URL for private files (S3 only)."""
        if self.provider != "s3":
            return url
        
        key = url.split(f"{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/")[-1]
        
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_S3_BUCKET,
                "Key": key,
            },
            ExpiresIn=expiry_seconds,
        )
