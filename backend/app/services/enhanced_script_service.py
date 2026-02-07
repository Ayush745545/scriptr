"""
Enhanced Script Generation Service
AI-powered script generation with advanced prompt engineering for Indian creators.
Supports Hindi, English, and Hinglish with cultural awareness.
"""

import unicodedata
import json
import re
from typing import Optional, Dict, List, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
import openai

from app.core.config import settings
from app.models.script import Script, ContentLanguage, ScriptType, ContentCategory
from app.schemas.script import ScriptGenerateRequest


# Trending audio suggestions by category
TRENDING_AUDIO_SUGGESTIONS = {
    "reel": {
        "funny": ["Bachpan Ka Pyaar remix", "Pawri Ho Rahi Hai", "Rasode Mein Kaun Tha"],
        "professional": ["Corporate upbeat music", "Inspiring piano", "Motivational beats"],
        "trendy": ["Latest Bollywood remix", "Trending Instagram sounds", "Viral Reels audio"],
    },
    "short": {
        "funny": ["Comedy timing sound", "Sitcom laugh track", "Meme sounds"],
        "professional": ["Clean corporate", "Tech startup vibes", "Business motivation"],
        "trendy": ["YouTube trending music", "Viral sounds", "Popular BGM"],
    },
    "promo": {
        "funny": ["Quirky advertisement music", "Catchy jingles", "Fun brand sounds"],
        "professional": ["Premium brand music", "Luxury vibes", "Trust-building tones"],
        "trendy": ["Festival special music", "Sale announcement beats", "Excitement builds"],
    },
    "educational": {
        "funny": ["Fun learning music", "Quiz show sounds", "Engaging background"],
        "professional": ["Documentary style", "TED talk vibes", "Informative tones"],
        "trendy": ["Study with me lo-fi", "Focus music", "Productivity beats"],
    },
}

# Indian cultural references by occasion/season
CULTURAL_REFERENCES = {
    "diwali": {
        "greetings": ["शुभ दीपावली", "Happy Diwali", "Diwali ki dher saari shubhkamnayein"],
        "themes": ["lights", "sweets", "family", "shopping", "rangoli", "diyas", "lakshmi puja"],
        "hashtags": ["#Diwali2026", "#DiwaliVibes", "#FestivalOfLights", "#DiwaliSale", "#IndianFestival"],
    },
    "holi": {
        "greetings": ["Happy Holi", "होली मुबारक", "Rang barse"],
        "themes": ["colors", "sweets", "thandai", "family", "forgiveness", "spring"],
        "hashtags": ["#Holi2026", "#FestivalOfColors", "#HoliHai", "#RangBarse"],
    },
    "general": {
        "themes": ["chai", "cricket", "family", "jugaad", "desi style", "apna time aayega"],
        "hashtags": ["#IndianCreator", "#DesiVibes", "#MadeInIndia", "#IndianContent"],
    },
}


class EnhancedScriptService:
    """
    Enhanced service for AI script generation with:
    - Advanced prompt engineering
    - Cultural awareness for Indian audiences
    - Structured output with hooks, CTA, and hashtags
    - Trending audio suggestions
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_script(
        self,
        user_id: UUID,
        request: ScriptGenerateRequest,
    ) -> Script:
        """
        Generate a culturally-aware script using GPT-4.
        
        Returns structured output with:
        - Opening hook (first 3 seconds)
        - Main script body
        - Call-to-action
        - Suggested hashtags
        - Trending audio suggestions
        """
        # Build enhanced prompt
        system_prompt = self._build_system_prompt(request.language, request.tone)
        user_prompt = self._build_user_prompt(request)
        
        # Call OpenAI API with JSON mode for structured output
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
            temperature=0.8,
            response_format={"type": "json_object"},
        )
        
        content = response.choices[0].message.content
        
        # Parse JSON response
        parsed = self._parse_json_response(content, request)
        
        # Get audio suggestions
        audio_suggestions = self._get_audio_suggestions(
            request.script_type.value, 
            request.tone
        )
        
        # Add audio suggestions to generation params
        generation_params = {
            "temperature": 0.8,
            "max_tokens": 2000,
            "topic": request.topic,
            "target_audience": request.target_audience,
            "audio_suggestions": audio_suggestions,
            "cultural_context": self._detect_cultural_context(request.topic),
        }
        
        # Normalize Unicode for proper storage
        normalized_content = unicodedata.normalize("NFC", parsed["full_script"])
        
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
            prompt_used=user_prompt,
            model_used=settings.OPENAI_MODEL or "gpt-4-turbo-preview",
            generation_params=generation_params,
            hooks=parsed.get("hooks", []),
            hashtags=parsed.get("hashtags", []),
            # Store structured sections in metadata
            metadata={
                "hook": parsed.get("hook", ""),
                "main_script": parsed.get("main_script", ""),
                "cta": parsed.get("cta", ""),
                "audio_suggestions": audio_suggestions,
                "timing_breakdown": parsed.get("timing_breakdown", {}),
            },
        )
        
        self.db.add(script)
        await self.db.commit()
        await self.db.refresh(script)
        
        return script
    
    def _build_system_prompt(self, language: ContentLanguage, tone: str) -> str:
        """Build comprehensive system prompt based on language and tone."""
        
        base_prompt = """You are India's top content creator and scriptwriter. You create viral content for Indian audiences across Instagram Reels, YouTube Shorts, and other platforms.

Your expertise includes:
- Understanding Indian culture, trends, and what resonates with desi audiences
- Creating content that feels authentic and relatable
- Using the right mix of humor, emotion, and information
- Crafting hooks that stop the scroll within 3 seconds

IMPORTANT RULES:
1. Always return valid JSON format
2. Be culturally sensitive and relevant to Indian context
3. Include timely references when appropriate (festivals, cricket, trending topics)
4. Make content feel authentic, not forced
"""

        language_instructions = {
            ContentLanguage.HINDI: """
LANGUAGE: Write in pure Hindi using Devanagari script (देवनागरी)
- Use शुद्ध हिंदी words
- Ensure proper Unicode encoding
- Write naturally as spoken in Hindi heartland
- Example: "नमस्ते दोस्तों! आज हम बात करेंगे एक ऐसे टॉपिक पर जो आपकी ज़िंदगी बदल देगा!"
""",
            ContentLanguage.HINGLISH: """
LANGUAGE: Write in Hinglish - natural mix of Hindi (in Roman script) and English
- Use Hindi words in Roman/Latin script, NOT Devanagari
- Mix should feel natural like urban Indians speak
- Include common Hindi expressions: "yaar", "bhai", "matlab", "basically", "actually"
- Example: "Aaj main aapko bataunga ek aisi trick jo seriously change kar degi aapki life!"
- Example: "Guys, ye sunke aap shock ho jaoge, matlab trust me on this one!"
- Use English for technical/modern words, Hindi for emotional connect
""",
            ContentLanguage.ENGLISH: """
LANGUAGE: Write in English for Indian audience
- Use Indian English expressions and references
- Include relatable Indian examples
- Can use occasional Hindi words everyone knows (like "masala", "chai", "jugaad")
- Example: "You won't believe what happened when I tried this desi hack!"
"""
        }
        
        tone_instructions = {
            "funny": """
TONE: Humorous and entertaining
- Use wit, not cringe comedy
- Include relatable Indian humor (office jokes, family drama, desi problems)
- Reference memes and viral moments when relevant
- Don't be offensive - punch up, not down
""",
            "professional": """
TONE: Professional and trustworthy  
- Sound credible and knowledgeable
- Use data and facts when possible
- Maintain authority while being approachable
- Suitable for business and career content
""",
            "trendy": """
TONE: Trendy and current
- Reference latest trends, songs, memes
- Use current slang (but not outdated)
- Feel fresh and of-the-moment
- Appeal to Gen-Z and young millennials
""",
            "educational": """
TONE: Educational but engaging
- Make learning feel easy and fun
- Break down complex topics simply
- Use analogies Indians can relate to
- End with practical takeaways
""",
            "inspirational": """
TONE: Motivational and uplifting
- Share genuine inspiration, not toxic positivity
- Use real struggles Indians face
- Build emotional connection
- End with hope and actionable advice
"""
        }
        
        return base_prompt + language_instructions.get(language, language_instructions[ContentLanguage.HINGLISH]) + tone_instructions.get(tone, tone_instructions["trendy"])
    
    def _build_user_prompt(self, request: ScriptGenerateRequest) -> str:
        """Build detailed user prompt for script generation."""
        
        # Calculate word counts for each section based on duration
        total_words = int(request.target_duration_seconds * 2.5)  # ~150 words per minute
        hook_words = min(10, total_words // 6)  # First 3 seconds
        cta_words = min(15, total_words // 5)
        main_words = total_words - hook_words - cta_words
        
        # Detect cultural context
        cultural_context = self._detect_cultural_context(request.topic)
        cultural_note = ""
        if cultural_context != "general":
            refs = CULTURAL_REFERENCES.get(cultural_context, CULTURAL_REFERENCES["general"])
            cultural_note = f"""
Cultural Context Detected: {cultural_context.upper()}
- Consider using greetings: {refs.get('greetings', [])}
- Themes to include: {refs.get('themes', [])}
- Trending hashtags: {refs.get('hashtags', [])}
"""
        
        content_type_map = {
            ScriptType.REEL: "Instagram Reel",
            ScriptType.SHORT: "YouTube Short",
            ScriptType.AD: "Product Promo/Advertisement",
            ScriptType.YOUTUBE: "YouTube Video",
            ScriptType.PODCAST: "Podcast",
            ScriptType.STORY: "Instagram/WhatsApp Story",
        }
        
        prompt = f"""Create a {content_type_map.get(request.script_type, 'social media')} script about: {request.topic}

SPECIFICATIONS:
- Total Duration: {request.target_duration_seconds} seconds
- Target Words: ~{total_words} words total
- Category: {request.category.value}
- Target Audience: {request.target_audience or 'general Indian audience'}
{cultural_note}

REQUIRED JSON OUTPUT STRUCTURE:
{{
    "title": "Catchy title for the content (max 60 chars)",
    "hook": "Opening line for first 3 seconds - must STOP THE SCROLL (~{hook_words} words)",
    "main_script": "Main body of the script (~{main_words} words)",
    "cta": "Call-to-action at the end (~{cta_words} words)",
    "full_script": "Complete script combining hook + main_script + cta with natural flow",
    "hooks": ["5 alternative opening hooks that could work"],
    "hashtags": ["10-15 relevant hashtags including trending Indian hashtags"],
    "timing_breakdown": {{
        "0-3s": "Hook description",
        "3-{request.target_duration_seconds - 5}s": "Main content beats",
        "{request.target_duration_seconds - 5}-{request.target_duration_seconds}s": "CTA"
    }},
    "visual_suggestions": ["3-5 visual/b-roll suggestions for the video"]
}}

HOOK REQUIREMENTS (First 3 seconds are CRITICAL):
- Must create curiosity or emotional reaction
- Can be a question, shocking statement, or relatable moment  
- Examples of great hooks:
  * "Ye galti mat karna..." (Don't make this mistake...)
  * "Maine 30 din ye kiya aur..." (I did this for 30 days and...)
  * "Shocking but true..."
  * "POV: You just discovered..."

{f'Additional instructions: {request.additional_instructions}' if request.additional_instructions else ''}

Return ONLY valid JSON, no additional text."""
        
        return prompt
    
    def _detect_cultural_context(self, topic: str) -> str:
        """Detect if topic relates to specific Indian cultural events."""
        topic_lower = topic.lower()
        
        if any(word in topic_lower for word in ["diwali", "deepavali", "दीपावली", "दिवाली"]):
            return "diwali"
        elif any(word in topic_lower for word in ["holi", "होली", "rang", "रंग"]):
            return "holi"
        elif any(word in topic_lower for word in ["eid", "ramadan", "रमज़ान", "ईद"]):
            return "eid"
        elif any(word in topic_lower for word in ["navratri", "durga", "नवरात्रि", "दुर्गा"]):
            return "navratri"
        elif any(word in topic_lower for word in ["ganesh", "गणेश", "ganpati"]):
            return "ganesh"
        elif any(word in topic_lower for word in ["christmas", "new year", "क्रिसमस"]):
            return "newyear"
        
        return "general"
    
    def _get_audio_suggestions(self, script_type: str, tone: str) -> List[str]:
        """Get trending audio suggestions based on content type and tone."""
        type_map = {
            "reel": "reel",
            "short": "short",
            "ad": "promo",
            "youtube": "educational",
            "podcast": "educational",
            "story": "reel",
        }
        
        mapped_type = type_map.get(script_type, "reel")
        tone_map = {
            "funny": "funny",
            "humorous": "funny",
            "professional": "professional",
            "serious": "professional",
            "trendy": "trendy",
            "casual": "trendy",
            "educational": "professional",
            "inspirational": "professional",
        }
        
        mapped_tone = tone_map.get(tone, "trendy")
        
        suggestions = TRENDING_AUDIO_SUGGESTIONS.get(mapped_type, {}).get(mapped_tone, [])
        return suggestions if suggestions else ["Trending viral audio", "Popular background music"]
    
    def _parse_json_response(self, content: str, request: ScriptGenerateRequest) -> Dict[str, Any]:
        """Parse JSON response from GPT-4."""
        try:
            # Try to parse as JSON directly
            parsed = json.loads(content)
            return parsed
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    return parsed
                except json.JSONDecodeError:
                    pass
            
            # Fallback: create structured response from raw text
            return {
                "title": f"Script: {request.topic[:50]}",
                "hook": "",
                "main_script": content,
                "cta": "",
                "full_script": content,
                "hooks": [],
                "hashtags": [],
                "timing_breakdown": {},
                "visual_suggestions": [],
            }


# Example outputs for documentation
EXAMPLE_OUTPUTS = {
    "cafe_promotion_hinglish": {
        "title": "Ye Cafe Aapki Life Change Kar Dega! ☕",
        "hook": "Guys, maine wo jagah dhundh li jo Instagram pe famous hone wali hai!",
        "main_script": """Toh basically, ye cafe hai na Koramangala mein, 'Chai & Chill' naam hai. Ab sunlo kya special hai - yahan ki filter coffee itni strong hai ki Monday blues bhi bhag jaaye! 

Ambience dekho - aesthetic hai yaar, proper Pinterest wali vibes. Seating area mein fairy lights, vintage furniture, aur walls pe quotes - literally photo khinchne ka mann karta hai har corner pe.

Menu ki baat karein toh - fusion snacks hain jo aapne kabhi try nahi kiye honge. Butter Chicken Maggi aur Nutella Dosa - sounds weird but trust me, it works!

Price point bhi student-friendly hai - 200 mein pet bhar jaayega aur Instagram feed bhi.""",
        "cta": "Comment mein batao konsa dish try karna chahte ho! Aur follow karo more such hidden gems ke liye! 🙌",
        "full_script": "Guys, maine wo jagah dhundh li jo Instagram pe famous hone wali hai! [full script continues...]",
        "hooks": [
            "Ye cafe hai ya photography studio?",
            "200 mein date night sorted!",
            "Finally! Aesthetic cafe with good food bhi",
            "POV: You found the perfect cafe",
            "Instagram ke liye nahi, taste ke liye famous hai ye jagah"
        ],
        "hashtags": [
            "#CafeHopping", "#BangaloreCafe", "#HiddenGems", "#FoodBlogger",
            "#CoffeeLovers", "#InstaFood", "#WeekendVibes", "#BangaloreFood",
            "#CafeAesthetic", "#FilterCoffee", "#FusionFood", "#FoodieLife"
        ]
    },
    
    "fitness_tips_hindi": {
        "title": "30 दिन में Flat Belly - No Gym, No Diet! 💪",
        "hook": "ये एक exercise है जो मैंने 30 दिन की और results देखकर हैरान रह गई!",
        "main_script": """नमस्ते दोस्तों! आज मैं आपको बताऊंगी वो secret जो gym trainers नहीं बताते।

सुबह उठकर खाली पेट, बस 10 मिनट ये करो:
पहले - 2 मिनट deep breathing
फिर - 5 मिनट plank variations  
आखिर में - 3 मिनट stretching

देखो, ये कोई magic नहीं है। Science है। जब आप खाली पेट exercise करते हो, body stored fat use करती है।

मैंने खुद try किया - पहले हफ्ते कुछ नहीं हुआ, दूसरे हफ्ते bloating कम हुई, तीसरे हफ्ते से visible difference आया।

बस एक बात याद रखो - consistency is key! रोज़ करो, चाहे 5 मिनट ही करो।""",
        "cta": "Video save करो, कल से शुरू करो! Results आएं तो comment में ज़रूर बताना। Follow for more fitness tips! 🙏",
        "hooks": [
            "बिना gym जाए belly fat कैसे घटाएं?",
            "ये exercise करो, महीने में results देखो",
            "Gym trainers का सबसे बड़ा secret",
            "मोटापा घटाने का सबसे आसान तरीका",
            "10 मिनट रोज़, flat belly पक्का"
        ],
        "hashtags": [
            "#FitnessIndia", "#WeightLoss", "#HomeWorkout", "#FlatBelly",
            "#HealthyLifestyle", "#FitnessMotivation", "#IndianFitness",
            "#NoGymWorkout", "#MorningRoutine", "#HealthTips"
        ]
    },
    
    "diwali_sale_english": {
        "title": "BIGGEST Diwali Sale You Can't Miss! 🪔✨",
        "hook": "This Diwali sale is so crazy, even my savings account is scared!",
        "main_script": """What's up everyone! Diwali is around the corner and you know what that means - SHOPPING TIME!

But here's the thing - don't just buy randomly. I've done the research so you don't have to.

The REAL deals are happening on:
Amazon Great Indian Festival - Electronics pe 40-60% off
Myntra Diwali Sale - Fashion pe crazy discounts plus extra bank offers
Flipkart Big Diwali Sale - Home appliances are literally half price

Pro tip: Add to cart NOW, prices drop during sale. Also, use those credit card offers - extra 10% instant discount!

My top picks this year:
For gifting - Premium dry fruit boxes under 500
For yourself - That gadget you've been eyeing all year
For home - Decorative items that last beyond Diwali""",
        "cta": "Save this video and thank me later! Drop a 🪔 if you're ready for Diwali shopping! Follow for more deals!",
        "hooks": [
            "Your wallet after seeing these Diwali deals 😱",
            "POV: You found deals even your mom would approve",
            "Stop scrolling if you love saving money",
            "The Diwali shopping guide you actually need",
            "Best time to buy that thing you wanted!"
        ],
        "hashtags": [
            "#DiwaliSale", "#Diwali2026", "#DiwaliShopping", "#DealsOfTheDay",
            "#FestiveShopping", "#DiwaliOffers", "#BigDiwaliSale", 
            "#ShoppingTips", "#IndianFestival", "#FestivalOfLights"
        ]
    }
}
