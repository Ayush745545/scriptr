"""
Script Generation Service
AI-powered script generation using OpenAI GPT-4.
"""

import unicodedata
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
import openai

from app.core.config import settings
from app.models.script import Script, ContentLanguage, ScriptType, ContentCategory
from app.schemas.script import ScriptGenerateRequest


class ScriptService:
    """Service for AI script generation."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_script(
        self,
        user_id: UUID,
        request: ScriptGenerateRequest,
    ) -> Script:
        """
        Generate a script using GPT-4.
        
        Supports Hindi/English/Hinglish with proper Unicode handling.
        """
        # Build the prompt
        prompt = self._build_prompt(request)
        
        # Call OpenAI API
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": self._get_system_prompt(request.language),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE,
        )
        
        content = response.choices[0].message.content
        
        # Parse the response
        parsed = self._parse_response(content, request)
        
        # Normalize Unicode for proper storage
        normalized_content = unicodedata.normalize("NFC", parsed["content"])
        
        # Create script record
        script = Script(
            user_id=user_id,
            title=parsed["title"],
            description=f"Generated script for: {request.topic}",
            content=normalized_content,
            language=request.language,
            script_type=request.script_type,
            category=request.category,
            tone=request.tone,
            target_duration_seconds=request.target_duration_seconds,
            word_count=len(normalized_content.split()),
            prompt_used=prompt,
            model_used=settings.OPENAI_MODEL,
            generation_params={
                "temperature": settings.OPENAI_TEMPERATURE,
                "max_tokens": settings.OPENAI_MAX_TOKENS,
                "topic": request.topic,
                "target_audience": request.target_audience,
            },
            hooks=parsed.get("hooks", []),
            hashtags=parsed.get("hashtags", []),
        )
        
        self.db.add(script)
        await self.db.commit()
        await self.db.refresh(script)
        
        return script
    
    async def regenerate_script(
        self,
        user_id: UUID,
        original_script: Script,
    ) -> Script:
        """Regenerate script with same parameters."""
        request = ScriptGenerateRequest(
            topic=original_script.generation_params.get("topic", ""),
            language=original_script.language,
            script_type=original_script.script_type,
            category=original_script.category,
            tone=original_script.tone,
            target_duration_seconds=original_script.target_duration_seconds,
            target_audience=original_script.generation_params.get("target_audience", "general"),
        )
        
        return await self.generate_script(user_id, request)
    
    def _get_system_prompt(self, language: ContentLanguage) -> str:
        """Get system prompt based on language."""
        base_prompt = """You are an expert content creator specializing in creating viral social media content for Indian audiences.

Your scripts should be:
- Engaging and attention-grabbing
- Culturally relevant to Indian audiences
- Optimized for the target platform
- Natural sounding when spoken

"""
        
        if language == ContentLanguage.HINDI:
            return base_prompt + """
आप हिंदी में स्क्रिप्ट लिखेंगे। शुद्ध हिंदी का उपयोग करें।
Use Devanagari script (देवनागरी) for all Hindi text.
Ensure proper Unicode encoding for Hindi characters.
"""
        elif language == ContentLanguage.HINGLISH:
            return base_prompt + """
Write in Hinglish - a natural mix of Hindi and English commonly used by urban Indians.
Use Roman script for Hindi words mixed with English.
Example: "Aaj main aapko bataunga ek amazing trick jo change kar degi aapki life!"
This should feel natural and conversational.
"""
        else:
            return base_prompt + """
Write in English, but keep in mind the Indian audience.
Use references and examples relevant to Indian context.
"""
    
    def _build_prompt(self, request: ScriptGenerateRequest) -> str:
        """Build the generation prompt."""
        duration_words = request.target_duration_seconds * 2.5  # ~150 words per minute
        
        prompt = f"""Create a {request.script_type.value} script about: {request.topic}

Requirements:
- Duration: {request.target_duration_seconds} seconds (~{int(duration_words)} words)
- Tone: {request.tone}
- Category: {request.category.value}
- Target audience: {request.target_audience}

Structure your response as:

TITLE: [Catchy title for the content]

SCRIPT:
[The full script with natural pauses marked with ...]

"""
        
        if request.include_hooks:
            prompt += """
HOOKS: [List 5 alternative opening hooks, one per line]
"""
        
        if request.include_hashtags:
            prompt += """
HASHTAGS: [List 10 relevant hashtags including trending Indian hashtags]
"""
        
        if request.additional_instructions:
            prompt += f"""
Additional instructions: {request.additional_instructions}
"""
        
        return prompt
    
    def _parse_response(self, content: str, request: ScriptGenerateRequest) -> dict:
        """Parse the AI response into structured data."""
        result = {
            "title": "",
            "content": "",
            "hooks": [],
            "hashtags": [],
        }
        
        lines = content.strip().split("\n")
        current_section = None
        script_lines = []
        
        for line in lines:
            line = line.strip()
            
            if line.startswith("TITLE:"):
                result["title"] = line.replace("TITLE:", "").strip()
            elif line.startswith("SCRIPT:"):
                current_section = "script"
            elif line.startswith("HOOKS:"):
                current_section = "hooks"
            elif line.startswith("HASHTAGS:"):
                current_section = "hashtags"
            elif line:
                if current_section == "script":
                    script_lines.append(line)
                elif current_section == "hooks":
                    # Remove numbering if present
                    hook = line.lstrip("0123456789.-) ")
                    if hook:
                        result["hooks"].append(hook)
                elif current_section == "hashtags":
                    # Extract hashtags
                    hashtags = [
                        tag.strip()
                        for tag in line.replace(",", " ").split()
                        if tag.startswith("#") or tag.strip()
                    ]
                    for tag in hashtags:
                        if not tag.startswith("#"):
                            tag = f"#{tag}"
                        result["hashtags"].append(tag)
        
        result["content"] = "\n".join(script_lines)
        
        # Generate title if not found
        if not result["title"]:
            result["title"] = f"Script: {request.topic[:50]}"
        
        return result
