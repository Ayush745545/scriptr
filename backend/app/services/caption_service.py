"""
Caption/Transcription Service
Auto-caption generation using OpenAI Whisper API.
"""

import os
import tempfile
import unicodedata
import subprocess
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
import openai
import httpx

from app.core.config import settings
from app.models.caption import Caption, CaptionFormat, CaptionStyle, TranscriptionStatus
from app.schemas.caption import CaptionGenerateRequest, CaptionExportResponse, CaptionStyleSettings
from app.services.storage_service import StorageService
from app.config.caption_styles import CAPTION_STYLES


class CaptionService:
    """Service for caption/transcription generation using Whisper."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.storage = StorageService()

    def _extract_audio(self, video_path: str, output_path: str) -> bool:
        """
        Extract audio from video using FFmpeg.
        Returns True if successful, False otherwise.
        """
        try:
            # Command: ffmpeg -i input -vn -acodec libmp3lame -q:a 4 -y output
            command = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "libmp3lame",  # MP3 codec
                "-q:a", "4",  # VBR quality
                "-y",  # Overwrite
                output_path
            ]
            
            subprocess.run(
                command, 
                check=True, 
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.PIPE
            )
            return True
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e}")
            return False
        except Exception as e:
            print(f"Audio extraction error: {e}")
            return False

    def _time_to_srt_format(self, time_seconds: float) -> str:
        """Convert seconds to SRT timestamp (HH:MM:SS,mmm)."""
        hours = int(time_seconds // 3600)
        minutes = int((time_seconds % 3600) // 60)
        seconds = int(time_seconds % 60)
        milliseconds = int((time_seconds * 1000) % 1000)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

    def generate_srt_content(self, caption: Caption) -> str:
        """Generate SRT format content from caption segments."""
        if not caption.segments:
            return ""
        
        output = []
        for i, segment in enumerate(caption.segments, 1):
             # Ensure segment matches our expected dict structure
             # It comes from JSONB, so it's a dict
             start = segment.get("start_time", 0)
             end = segment.get("end_time", 0)
             text = segment.get("text", "").strip()
             
             timestamp = f"{self._time_to_srt_format(start)} --> {self._time_to_srt_format(end)}"
             
             output.append(str(i))
             output.append(timestamp)
             output.append(text)
             output.append("")  # Empty line
             
        return "\n".join(output)

    def get_styles(self) -> Dict[str, Any]:
        """Get available caption styles."""
        return CAPTION_STYLES
    
    async def create_caption_job(
        self,
        user_id: UUID,
        request: CaptionGenerateRequest,
    ) -> Caption:
        """Create a caption job from URL."""
        # Get file info
        async with httpx.AsyncClient() as client:
            response = await client.head(request.source_file_url)
            content_length = int(response.headers.get("content-length", 0))
        
        filename = request.source_file_url.split("/")[-1].split("?")[0]
        
        caption = Caption(
            user_id=user_id,
            project_id=request.project_id,
            title=request.title,
            source_file_url=request.source_file_url,
            source_file_name=filename,
            caption_style=request.caption_style,
            status=TranscriptionStatus.PENDING,
        )
        
        self.db.add(caption)
        await self.db.commit()
        await self.db.refresh(caption)
        
        return caption
    
    async def upload_and_create_job(
        self,
        user_id: UUID,
        file: UploadFile,
        title: str,
        language_hint: str,
        style_preset_id: Optional[str] = None,
    ) -> Caption:
        """Upload file and create caption job."""
        # Upload to storage
        file_url = await self.storage.upload_file(
            file=file,
            folder=f"captions/{user_id}",
        )
        
        caption = Caption(
            user_id=user_id,
            title=title,
            source_file_url=file_url,
            source_file_name=file.filename,
            status=TranscriptionStatus.PENDING,
            style_settings={"preset_id": style_preset_id} if style_preset_id else {},
        )
        
        self.db.add(caption)
        await self.db.commit()
        await self.db.refresh(caption)
        
        return caption
    
    async def process_transcription(
        self,
        caption_id: UUID,
        word_timestamps: bool = False,
        translate: bool = False,
        language_hint: Optional[str] = None,
    ):
        """
        Process transcription using Whisper API.
        
        Runs in background task.
        """
        # Get caption record
        result = await self.db.execute(
            select(Caption).where(Caption.id == caption_id)
        )
        caption = result.scalar_one_or_none()
        
        if not caption:
            return
        
        try:
            # Update status
            caption.status = TranscriptionStatus.PROCESSING
            await self.db.commit()
            
            start_time = datetime.utcnow()
            
            # Download file temporarily
            async with httpx.AsyncClient() as client:
                response = await client.get(caption.source_file_url)
                
                # Determine extension
                ext = os.path.splitext(caption.source_file_name)[1]
                if not ext:
                    ext = ".mp4"  # Default to mp4 if unknown
                
                with tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=ext,
                ) as tmp:
                    tmp.write(response.content)
                    tmp_path = tmp.name
            
            audio_path = None
            
            try:
                # Extract audio for Whisper (smaller size, better format)
                # MP3 is universally supported by Whisper
                audio_path = tmp_path + ".mp3"
                extraction_success = self._extract_audio(tmp_path, audio_path)
                
                # Use extracted audio if successful, otherwise try original file
                file_to_transcribe = audio_path if extraction_success else tmp_path
                
                # Call Whisper API
                with open(file_to_transcribe, "rb") as audio_file:
                    response_format = "verbose_json" if word_timestamps else "json"

                    whisper_language = None
                    if language_hint and language_hint not in {"auto", "hinglish"}:
                        # Whisper expects ISO-639-1 like "hi", "en", "ta", "te", "mr"
                        whisper_language = language_hint
                    
                    transcription = await self.client.audio.transcriptions.create(
                        model=settings.WHISPER_MODEL,
                        file=audio_file,
                        response_format=response_format,
                        timestamp_granularities=["word", "segment"] if word_timestamps else ["segment"],
                        language=whisper_language,
                        prompt=(
                            "Audio from India with code-switching. "
                            "Primary languages: Hindi, English, Hinglish. "
                            "Sometimes: Marathi, Tamil, Telugu. "
                            "Keep proper nouns and brand names in Latin script."
                        ),
                    )
                
                # Process response
                if hasattr(transcription, "text"):
                    # Normalize Unicode for Hindi text
                    caption.transcription_text = unicodedata.normalize(
                        "NFC", transcription.text
                    )
                else:
                    caption.transcription_text = transcription.get("text", "")
                
                # Process segments
                segments = []
                if hasattr(transcription, "segments"):
                    for i, seg in enumerate(transcription.segments):
                        segment = {
                            "segment_index": i,
                            "start_time": seg.get("start", 0),
                            "end_time": seg.get("end", 0),
                            "text": unicodedata.normalize("NFC", seg.get("text", "")),
                            "confidence": seg.get("confidence"),
                        }
                        
                        # Add word timestamps if available
                        if word_timestamps and "words" in seg:
                            segment["words"] = [
                                {
                                    "word": unicodedata.normalize("NFC", w.get("word", "")),
                                    "start": w.get("start", 0),
                                    "end": w.get("end", 0),
                                }
                                for w in seg["words"]
                            ]
                        
                        segments.append(segment)
                
                caption.segments = segments
                
                # Get duration from last segment
                if segments:
                    caption.source_duration_seconds = segments[-1]["end_time"]
                
                # Language detection
                if hasattr(transcription, "language"):
                    caption.detected_language = transcription.language
                
                # Translation if requested
                if translate and caption.detected_language == "hi":
                    await self._add_translation(caption)
                
                # Calculate processing time
                caption.processing_time_seconds = (
                    datetime.utcnow() - start_time
                ).total_seconds()
                
                # Mark as completed
                caption.status = TranscriptionStatus.COMPLETED
                caption.completed_at = datetime.utcnow()
                
            finally:
                # Clean up temp files
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                if audio_path and os.path.exists(audio_path):
                    os.unlink(audio_path)
            
        except Exception as e:
            caption.status = TranscriptionStatus.FAILED
            caption.error_message = str(e)
        
        await self.db.commit()
    
    async def _add_translation(self, caption: Caption):
        """Add English translation for Hindi captions."""
        if not caption.segments:
            return
        
        # Translate each segment using GPT-4
        for segment in caption.segments:
            if segment.get("text"):
                response = await self.client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {
                            "role": "system",
                            "content": "Translate the following Hindi text to English. Only provide the translation, nothing else.",
                        },
                        {
                            "role": "user",
                            "content": segment["text"],
                        },
                    ],
                    max_tokens=200,
                )
                segment["text_english"] = response.choices[0].message.content.strip()
    
    async def export_captions(
        self,
        caption: Caption,
        format: CaptionFormat,
        include_translation: bool = False,
        style_settings: Optional[CaptionStyleSettings] = None,
    ) -> CaptionExportResponse:
        """Export captions to various formats."""
        if format == CaptionFormat.SRT:
            content = self._generate_srt(caption, include_translation)
            extension = ".srt"
        elif format == CaptionFormat.VTT:
            content = self._generate_vtt(caption, include_translation)
            extension = ".vtt"
        elif format == CaptionFormat.ASS:
            content = self._generate_ass(caption, style_settings)
            extension = ".ass"
        elif format == CaptionFormat.JSON:
            import json
            content = json.dumps(caption.segments, ensure_ascii=False, indent=2)
            extension = ".json"
        else:  # TXT
            content = caption.transcription_text
            extension = ".txt"
        
        # Upload to storage
        filename = f"{caption.title.replace(' ', '_')}{extension}"
        
        download_url = await self.storage.upload_text_file(
            content=content,
            filename=filename,
            folder=f"exports/{caption.user_id}",
            content_type="text/plain; charset=utf-8",
        )
        
        # Update exported formats
        if caption.exported_formats is None:
            caption.exported_formats = {}
        caption.exported_formats[format.value] = download_url
        await self.db.commit()
        
        return CaptionExportResponse(
            caption_id=caption.id,
            format=format,
            download_url=download_url,
            expires_at=datetime.utcnow() + timedelta(hours=24),
            file_size_bytes=len(content.encode("utf-8")),
        )
    
    def _generate_srt(self, caption: Caption, include_translation: bool) -> str:
        """Generate SRT format."""
        lines = []
        
        for i, segment in enumerate(caption.segments or [], 1):
            start = self._format_time_srt(segment["start_time"])
            end = self._format_time_srt(segment["end_time"])
            
            text = segment["text"]
            if include_translation and segment.get("text_english"):
                text = f"{text}\n{segment['text_english']}"
            
            lines.append(f"{i}")
            lines.append(f"{start} --> {end}")
            lines.append(text)
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_vtt(self, caption: Caption, include_translation: bool) -> str:
        """Generate WebVTT format."""
        lines = ["WEBVTT", ""]
        
        for i, segment in enumerate(caption.segments or [], 1):
            start = self._format_time_vtt(segment["start_time"])
            end = self._format_time_vtt(segment["end_time"])
            
            text = segment["text"]
            if include_translation and segment.get("text_english"):
                text = f"{text}\n{segment['text_english']}"
            
            lines.append(f"{i}")
            lines.append(f"{start} --> {end}")
            lines.append(text)
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_ass(
        self,
        caption: Caption,
        style_settings: Optional[CaptionStyleSettings],
    ) -> str:
        """Generate ASS format with styling.

        If a preset_id exists in caption.style_settings and no explicit style_settings were passed,
        it uses the Indian aesthetic presets from CAPTION_STYLES.
        """
        preset_id = None
        if (style_settings is None) and isinstance(caption.style_settings, dict):
            preset_id = caption.style_settings.get("preset_id")

        if preset_id and preset_id in CAPTION_STYLES:
            return self._generate_ass_from_preset(
                caption=caption,
                preset_id=preset_id,
                karaoke=bool(caption.segments and any(s.get("words") for s in (caption.segments or []))),
            )

        style = style_settings or CaptionStyleSettings()

        play_res_x = 1080
        play_res_y = 1920
        alignment = self._alignment_from_position(style.position)

        primary = self._hex_to_ass_color(style.font_color)
        secondary = self._hex_to_ass_color("#FFD700")
        outline = self._hex_to_ass_color("#000000")
        back = self._rgba_to_ass_back_color(style.background_color)

        header = f"""[Script Info]
Title: {caption.title}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {play_res_x}
PlayResY: {play_res_y}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{style.font_family},{style.font_size},{primary},{secondary},{outline},{back},-1,0,0,0,100,100,0,0,1,3,1,2,{alignment},30,30,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events: List[str] = []
        for segment in caption.segments or []:
            start = self._format_time_ass(segment["start_time"])
            end = self._format_time_ass(segment["end_time"])
            text = (segment.get("text") or "").replace("\n", "\\N")
            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

        return header + "\n".join(events)

    def _alignment_from_position(self, position: str) -> int:
        """Map logical position to ASS Alignment."""
        pos = (position or "bottom").lower()
        if pos == "top":
            return 8
        if pos == "center":
            return 5
        # bottom_third is still bottom aligned with higher margin
        return 2

    def _hex_to_ass_color(self, hex_color: str, alpha: int = 0) -> str:
        """Convert #RRGGBB to ASS color &HAABBGGRR (AA=alpha)."""
        c = (hex_color or "#FFFFFF").lstrip("#")
        if len(c) != 6:
            c = "FFFFFF"
        r = int(c[0:2], 16)
        g = int(c[2:4], 16)
        b = int(c[4:6], 16)
        return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"

    def _rgba_to_ass_back_color(self, rgba: Optional[str]) -> str:
        """Convert rgba(r,g,b,a) or hex to ASS BackColour with alpha."""
        if not rgba:
            return self._hex_to_ass_color("#000000", alpha=0x80)
        s = rgba.strip()
        if s.startswith("#"):
            return self._hex_to_ass_color(s, alpha=0x80)
        if s.startswith("rgba"):
            try:
                inner = s[s.find("(") + 1 : s.find(")")]
                parts = [p.strip() for p in inner.split(",")]
                r = int(float(parts[0]))
                g = int(float(parts[1]))
                b = int(float(parts[2]))
                a = float(parts[3])
                alpha = int(max(0.0, min(1.0, 1.0 - a)) * 255)
                return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"
            except Exception:
                return self._hex_to_ass_color("#000000", alpha=0x80)
        if s.startswith("rgb"):
            return self._hex_to_ass_color("#000000", alpha=0x80)
        return self._hex_to_ass_color("#000000", alpha=0x80)

    def _generate_ass_from_preset(self, caption: Caption, preset_id: str, karaoke: bool) -> str:
        preset = CAPTION_STYLES.get(preset_id) or CAPTION_STYLES["minimal_chic"]

        play_res_x = 1080
        play_res_y = 1920

        alignment = self._alignment_from_position(preset.get("position", "bottom"))
        margin_v = 260 if preset.get("position") == "bottom_third" else 110

        primary = self._hex_to_ass_color(preset.get("color", "#FFFFFF"), alpha=0x00)
        secondary = self._hex_to_ass_color(preset.get("highlight_color", "#FFD700"), alpha=0x00)
        outline = self._hex_to_ass_color("#000000", alpha=0x00)
        back = self._rgba_to_ass_back_color(preset.get("background_color"))

        font_name = preset.get("font_family", "Inter")
        # ASS font name should be a single font; take first before comma
        font_name = font_name.split(",")[0].strip()
        font_size = 68 if preset.get("name") in {"Bollywood Drama", "Desi Vlog"} else 58

        bold = -1 if str(preset.get("font_weight", "600")) in {"700", "800", "900"} else 0

        header = f"""[Script Info]
Title: {caption.title}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {play_res_x}
PlayResY: {play_res_y}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary},{secondary},{outline},{back},{bold},0,0,0,100,100,0,0,1,4,1,2,{alignment},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events: List[str] = []
        for segment in caption.segments or []:
            start = self._format_time_ass(segment.get("start_time", 0))
            end = self._format_time_ass(segment.get("end_time", 0))

            if karaoke and segment.get("words"):
                events.append(
                    f"Dialogue: 0,{start},{end},Default,,0,0,0,,{self._karaoke_text(segment['words'])}"
                )
            else:
                text = (segment.get("text") or "").replace("\n", "\\N").strip()
                events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

        return header + "\n".join(events)

    def _karaoke_text(self, words: List[dict]) -> str:
        """Build ASS karaoke (\k) sequence from word timestamps."""
        parts: List[str] = []
        for idx, w in enumerate(words):
            word = (w.get("word") or "").strip()
            if not word:
                continue
            start = float(w.get("start", 0))
            end = float(w.get("end", start))
            dur_cs = max(1, int(round((end - start) * 100)))
            prefix = "" if idx == 0 else " "
            parts.append(f"{{\\k{dur_cs}}}{prefix}{word}")
        return "".join(parts)

    async def burn_captions_to_video(self, caption: Caption, style_preset_id: str, karaoke: bool = True) -> str:
        """Download source video, render ASS subtitles, burn them into the video, upload, and return URL."""
        if not caption.source_file_url:
            raise ValueError("Missing source_file_url")

        async with httpx.AsyncClient() as client:
            response = await client.get(caption.source_file_url)
            response.raise_for_status()
            video_bytes = response.content

        ext = os.path.splitext(caption.source_file_name or "video.mp4")[1] or ".mp4"

        tmp_video = None
        tmp_ass = None
        tmp_out = None

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
                f.write(video_bytes)
                tmp_video = f.name

            ass_content = self._generate_ass_from_preset(caption=caption, preset_id=style_preset_id, karaoke=karaoke)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".ass", mode="w", encoding="utf-8") as f:
                f.write(ass_content)
                tmp_ass = f.name

            tmp_out = tmp_video + ".burned.mp4"

            command = [
                "ffmpeg",
                "-y",
                "-i",
                tmp_video,
                "-vf",
                f"subtitles={tmp_ass}",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "20",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                tmp_out,
            ]

            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

            with open(tmp_out, "rb") as f:
                out_bytes = f.read()

            filename = f"{caption.title.replace(' ', '_')}_{caption.id}_burned.mp4"
            url = await self.storage.upload_file_content(
                content=out_bytes,
                filename=filename,
                folder=f"exports/{caption.user_id}",
                content_type="video/mp4",
            )

            if caption.exported_formats is None:
                caption.exported_formats = {}
            caption.exported_formats["burned_mp4"] = url
            await self.db.commit()

            return url
        finally:
            for path in [tmp_video, tmp_ass, tmp_out]:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except Exception:
                        pass
    
    def _format_time_srt(self, seconds: float) -> str:
        """Format time for SRT (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def _format_time_vtt(self, seconds: float) -> str:
        """Format time for VTT (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
    
    def _format_time_ass(self, seconds: float) -> str:
        """Format time for ASS (H:MM:SS.cc)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centis = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"
