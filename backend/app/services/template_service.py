"""
Template Rendering Service
Video template rendering using FFmpeg.
"""

import os
import json
import tempfile
import subprocess
from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.template import Template, UserTemplate
from app.services.storage_service import StorageService


class TemplateService:
    """Service for template rendering."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage = StorageService()
    
    async def render_template(
        self,
        user_template_id: UUID,
        output_format: str = "mp4",
        quality: str = "high",
        watermark: bool = False,
    ):
        """
        Render a customized template to video.
        
        Uses FFmpeg for video processing.
        """
        # Get user template and base template
        result = await self.db.execute(
            select(UserTemplate).where(UserTemplate.id == user_template_id)
        )
        user_template = result.scalar_one_or_none()
        
        if not user_template:
            return
        
        result = await self.db.execute(
            select(Template).where(Template.id == user_template.template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            user_template.status = "failed"
            user_template.error_message = "Base template not found"
            await self.db.commit()
            return
        
        try:
            # Update progress
            user_template.render_progress = 10
            await self.db.commit()
            
            # Create temp directory for rendering
            with tempfile.TemporaryDirectory() as tmp_dir:
                # Generate frames or video components
                asset_paths = await self._prepare_assets(
                    template, user_template, tmp_dir
                )
                
                user_template.render_progress = 40
                await self.db.commit()
                
                # Render video using FFmpeg
                output_path = os.path.join(tmp_dir, f"output.{output_format}")
                
                await self._render_video(
                    template=template,
                    user_template=user_template,
                    tmp_dir=tmp_dir,
                    output_path=output_path,
                    quality=quality,
                    watermark=watermark,
                    asset_paths=asset_paths,
                )
                
                user_template.render_progress = 80
                await self.db.commit()
                
                # Upload rendered video
                with open(output_path, "rb") as f:
                    video_url = await self.storage.upload_file_content(
                        content=f.read(),
                        filename=f"{user_template.title}.{output_format}",
                        folder=f"renders/{user_template.user_id}",
                        content_type=f"video/{output_format}",
                    )
                
                # Generate thumbnail
                thumbnail_path = os.path.join(tmp_dir, "thumbnail.jpg")
                await self._generate_thumbnail(output_path, thumbnail_path)
                
                with open(thumbnail_path, "rb") as f:
                    thumbnail_url = await self.storage.upload_file_content(
                        content=f.read(),
                        filename=f"{user_template.title}_thumb.jpg",
                        folder=f"renders/{user_template.user_id}",
                        content_type="image/jpeg",
                    )
                
                # Update user template
                user_template.output_url = video_url
                user_template.thumbnail_url = thumbnail_url
                user_template.status = "completed"
                user_template.render_progress = 100
                user_template.rendered_at = datetime.utcnow()
                
        except Exception as e:
            user_template.status = "failed"
            user_template.error_message = str(e)
        
        await self.db.commit()
    
    async def _prepare_assets(
        self,
        template: Template,
        user_template: UserTemplate,
        tmp_dir: str,
    ):
        """Prepare assets for rendering."""
        customizations = user_template.customizations or {}
        asset_paths: dict[str, str] = {}
        
        # Download any required images
        for field_id, value in customizations.items():
            if not (isinstance(value, str) and value.startswith("http")):
                continue

            import httpx
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(value)
                response.raise_for_status()

            url_path = value.split("?", 1)[0]
            ext = (url_path.rsplit(".", 1)[-1] if "." in url_path else "bin").lower()

            # Basic normalization for common content types when URL has no extension
            content_type = (response.headers.get("content-type") or "").lower()
            if ext == "bin":
                if "image/png" in content_type:
                    ext = "png"
                elif "image/jpeg" in content_type or "image/jpg" in content_type:
                    ext = "jpg"
                elif "video/mp4" in content_type:
                    ext = "mp4"
                elif "video/quicktime" in content_type:
                    ext = "mov"

            path = os.path.join(tmp_dir, f"{field_id}.{ext}")
            with open(path, "wb") as f:
                f.write(response.content)
            asset_paths[field_id] = path

        return asset_paths
    
    async def _render_video(
        self,
        template: Template,
        user_template: UserTemplate,
        tmp_dir: str,
        output_path: str,
        quality: str,
        watermark: bool,
        asset_paths: dict[str, str],
    ):
        """
        Render video using FFmpeg.
        
        This is a simplified implementation.
        Production would use more sophisticated compositing.
        """
        # Quality settings
        quality_settings = {
            "low": {"crf": 28, "preset": "fast"},
            "medium": {"crf": 23, "preset": "medium"},
            "high": {"crf": 18, "preset": "slow"},
            "ultra": {"crf": 15, "preset": "slower"},
        }
        
        quality_opts = quality_settings.get(quality, quality_settings["high"])

        definition: dict[str, Any] = template.template_data or {}
        customizations: dict[str, Any] = user_template.customizations or {}

        # --- helpers ---
        def resolve_duration_seconds() -> int:
            dur = customizations.get("duration_seconds")
            if isinstance(dur, int) and dur > 0:
                return dur
            return int(template.duration_seconds)

        def resolve_theme_id() -> Optional[str]:
            theme_id = customizations.get("theme_id")
            if isinstance(theme_id, str) and theme_id:
                return theme_id
            themes = definition.get("themes") or {}
            if isinstance(themes, dict) and themes:
                return next(iter(themes.keys()))
            return None

        duration_seconds = resolve_duration_seconds()
        fps = int(definition.get("fps") or template.fps or 30)
        width = int(definition.get("width") or template.width or 1080)
        height = int(definition.get("height") or template.height or 1920)
        theme_id = resolve_theme_id()
        theme = ((definition.get("themes") or {}).get(theme_id) if theme_id else None) or {}

        def resolve_token(value: Any) -> Any:
            if not isinstance(value, str):
                return value
            if value == "$duration":
                return duration_seconds
            if value.startswith("$theme.colors."):
                key = value.split("$theme.colors.", 1)[1]
                return (theme.get("colors") or {}).get(key, "#000000")
            if value.startswith("$placeholder."):
                key = value.split("$placeholder.", 1)[1]
                return customizations.get(key) or ((definition.get("placeholders") or {}).get(key) or {}).get("default")
            return value

        def resolve_obj(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {k: resolve_obj(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [resolve_obj(v) for v in obj]
            return resolve_token(obj)

        layers = definition.get("layers") or []
        if not isinstance(layers, list):
            layers = []

        # Determine background color if defined
        bg_color = "black"
        for layer in layers:
            if isinstance(layer, dict) and layer.get("type") == "solid":
                style = resolve_obj(layer.get("style") or {})
                bg_color = style.get("color") or bg_color
                break

        # Inputs: [0] lavfi background, then external assets as needed
        ffmpeg_inputs: list[str] = []
        filter_lines: list[str] = []
        input_index_by_layer_id: dict[str, int] = {}

        # Build inputs for video/image layers
        for layer in layers:
            if not isinstance(layer, dict):
                continue
            ltype = layer.get("type")
            if ltype not in ("video", "image"):
                continue
            source = resolve_token(layer.get("source"))
            if not isinstance(source, str) or not source:
                continue
            # source is placeholder value (likely URL) OR already resolved to string
            # We expect customizations to contain URLs for assets; prepare_assets downloads them.
            placeholder_key = None
            raw_source = layer.get("source")
            if isinstance(raw_source, str) and raw_source.startswith("$placeholder."):
                placeholder_key = raw_source.split("$placeholder.", 1)[1]
            local_path = asset_paths.get(placeholder_key or "")
            if not local_path and isinstance(source, str) and source.startswith(tmp_dir):
                local_path = source
            if not local_path:
                # If the user provided a URL but it wasn't downloaded for some reason, skip.
                continue

            if ltype == "video":
                # Loop video to cover duration
                ffmpeg_inputs.extend(["-stream_loop", "-1", "-i", local_path])
            else:
                # Loop image
                ffmpeg_inputs.extend(["-loop", "1", "-i", local_path])

            input_index_by_layer_id[layer.get("id") or f"layer_{len(input_index_by_layer_id)+1}"] = 1 + len(input_index_by_layer_id)

        # Base background
        cmd: list[str] = [
            settings.FFMPEG_PATH,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c={bg_color}:s={width}x{height}:r={fps}:d={duration_seconds}",
            *ffmpeg_inputs,
        ]

        current_label = "[base]"
        filter_lines.append(f"[0:v]format=rgba{current_label}")

        # Apply overlays in z order (low to high)
        sorted_layers = sorted(
            [l for l in layers if isinstance(l, dict)],
            key=lambda l: int(l.get("z") or 0),
        )

        draw_index = 0
        overlay_index = 0

        def between_expr(start: Any, end: Any) -> str:
            s = float(resolve_token(start) or 0)
            e = float(resolve_token(end) or duration_seconds)
            if e == duration_seconds and (end == "$duration"):
                e = float(duration_seconds)
            return f"between(t\,{s}\,{e})"

        def write_textfile(text: str) -> str:
            nonlocal draw_index
            draw_index += 1
            path = os.path.join(tmp_dir, f"text_{draw_index}.txt")
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            return path

        for layer in sorted_layers:
            ltype = layer.get("type")
            if ltype in ("video", "image"):
                layer_id = layer.get("id")
                input_idx = input_index_by_layer_id.get(layer_id)
                if not input_idx:
                    continue
                transform = resolve_obj(layer.get("transform") or {})
                fit = transform.get("fit") or "cover"
                opacity = float(transform.get("opacity") or 1.0)

                if ltype == "video":
                    # scale/crop to cover
                    if fit == "contain":
                        scale_expr = f"scale=w={width}:h={height}:force_original_aspect_ratio=decrease"
                        pad_expr = f"pad=w={width}:h={height}:x=(ow-iw)/2:y=(oh-ih)/2:color=0x00000000"
                        filter_lines.append(f"[{input_idx}:v]{scale_expr},{pad_expr},setsar=1,format=rgba[ov{overlay_index}]")
                    else:
                        scale_expr = f"scale=w={width}:h={height}:force_original_aspect_ratio=increase"
                        crop_expr = f"crop=w={width}:h={height}"
                        filter_lines.append(f"[{input_idx}:v]{scale_expr},{crop_expr},setsar=1,format=rgba[ov{overlay_index}]")
                else:
                    w = int(transform.get("w") or 0)
                    h = int(transform.get("h") or 0)
                    if w > 0 and h > 0:
                        filter_lines.append(f"[{input_idx}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,format=rgba[ov{overlay_index}]")
                    else:
                        filter_lines.append(f"[{input_idx}:v]format=rgba[ov{overlay_index}]")

                x = int(transform.get("x") or 0)
                y = int(transform.get("y") or 0)
                enable = between_expr(layer.get("start"), layer.get("end"))

                out_label = f"[v{overlay_index}]"
                # opacity via alpha merge
                if opacity < 1.0:
                    filter_lines.append(f"[ov{overlay_index}]colorchannelmixer=aa={opacity}[ova{overlay_index}]")
                    ov_in = f"[ova{overlay_index}]"
                else:
                    ov_in = f"[ov{overlay_index}]"

                filter_lines.append(
                    f"{current_label}{ov_in}overlay=x={x}:y={y}:enable='{enable}'{out_label}"
                )
                current_label = out_label
                overlay_index += 1

            elif ltype == "text":
                text_val = resolve_token(layer.get("text"))
                if not isinstance(text_val, str) or not text_val.strip():
                    continue
                style = resolve_obj(layer.get("style") or {})
                transform = resolve_obj(layer.get("transform") or {})

                font_size = int(style.get("fontSize") or 48)
                color = style.get("color") or "white"
                font_family = style.get("fontFamily") or "Inter"

                bg = style.get("background") or None
                box = 1 if isinstance(bg, dict) and bg.get("color") else 0
                boxcolor = (bg.get("color") if isinstance(bg, dict) else None) or "black@0.0"
                boxborderw = int(((bg.get("paddingX") or 0) if isinstance(bg, dict) else 0) / 2)

                x = int(transform.get("x") or 0)
                y = int(transform.get("y") or 0)
                enable = between_expr(layer.get("start"), layer.get("end"))

                textfile = write_textfile(text_val)
                # Use fontconfig font if available; otherwise rely on ffmpeg default.
                draw = (
                    f"drawtext=textfile='{textfile}':font='{font_family}':"
                    f"fontsize={font_size}:fontcolor={color}:x={x}:y={y}:"
                    f"box={box}:boxcolor={boxcolor}:boxborderw={boxborderw}:"
                    f"enable='{enable}'"
                )

                out_label = f"[t{draw_index}]"
                filter_lines.append(f"{current_label}{draw}{out_label}")
                current_label = out_label

        # Finalize filter graph
        filter_complex = ";".join(filter_lines)

        cmd.extend(
            [
                "-filter_complex",
                filter_complex,
                "-map",
                current_label,
                "-t",
                str(duration_seconds),
                "-r",
                str(fps),
                "-c:v",
                "libx264",
                "-crf",
                str(quality_opts["crf"]),
                "-preset",
                quality_opts["preset"],
                "-pix_fmt",
                "yuv420p",
                output_path,
            ]
        )
        
        # Run FFmpeg
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )
        
        if process.returncode != 0:
            raise Exception(f"FFmpeg error: {process.stderr}")
    
    async def _generate_thumbnail(self, video_path: str, output_path: str):
        """Generate thumbnail from video."""
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", video_path,
            "-ss", "00:00:01",
            "-vframes", "1",
            "-q:v", "2",
            output_path,
        ]
        
        subprocess.run(cmd, capture_output=True)
