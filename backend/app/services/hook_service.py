"""
Hook Generation Service v2
==========================
AI-powered viral hook generator with:
- GPT-4 with few-shot examples from top 100 Indian creators
- 20 proven hook templates for Indian audiences
- Performance prediction (0-100 score)
- A/B test tracking helpers

Data source: Patterns from top Indian creators across niches
(Dhruv Rathee, Beer Biceps, Warikoo, Gaurav Taneja, Kusha Kapila,
 Technical Guruji, Ashish Chanchlani, Kabita's Kitchen, etc.)
"""

import json
import uuid
import unicodedata
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import openai

from app.core.config import settings
from app.models.project import Hook

# ══════════════════════════════════════════════════════════════════════════════
#  20 PROVEN HOOK TEMPLATES FOR INDIAN AUDIENCES
#  Analysed from viral patterns of top 100 Indian creators
# ══════════════════════════════════════════════════════════════════════════════

PROVEN_TEMPLATES: List[Dict] = [
    # ── CURIOSITY GAP (4 templates) ──────────────────────────────────────────
    {
        "text": "Maine ₹{amount} waste kiye taaki aapko na karne pade...",
        "text_hindi": "मैंने ₹{amount} बर्बाद किए ताकि आपको ना करने पड़े...",
        "text_english": "I wasted ₹{amount} so you don't have to...",
        "hook_type": "curiosity_gap",
        "category": "finance",
        "platform": "both",
    },
    {
        "text": "Ye cheez {number}% log galat karte hain aur unhe pata bhi nahi...",
        "text_hindi": "ये चीज़ {number}% लोग गलत करते हैं और उन्हें पता भी नहीं...",
        "text_english": "This thing {number}% of people do wrong and they don't even know...",
        "hook_type": "curiosity_gap",
        "category": "education",
        "platform": "both",
    },
    {
        "text": "Ye ek trick se meri life change ho gayi, aur kisi ne nahi bataya...",
        "text_hindi": "ये एक ट्रिक से मेरी लाइफ चेंज हो गई, और किसी ने नहीं बताया...",
        "text_english": "This one trick changed my life, and nobody told me...",
        "hook_type": "curiosity_gap",
        "category": "lifestyle",
        "platform": "reel",
    },
    {
        "text": "Ye video dekhne ke baad aap {topic} ko bilkul different tarike se dekhoge...",
        "text_hindi": "ये वीडियो देखने के बाद आप {topic} को बिल्कुल अलग तरीके से देखोगे...",
        "text_english": "After watching this, you'll see {topic} completely differently...",
        "hook_type": "curiosity_gap",
        "category": "education",
        "platform": "both",
    },
    # ── CONTRARIAN (4 templates) ─────────────────────────────────────────────
    {
        "text": "Sab bol rahe hain {X} karo, par main bataunga kyun ye galat hai...",
        "text_hindi": "सब बोल रहे हैं {X} करो, पर मैं बताऊंगा क्यों ये गलत है...",
        "text_english": "Everyone says do {X}, but I'll tell you why that's wrong...",
        "hook_type": "contrarian",
        "category": "business",
        "platform": "both",
    },
    {
        "text": "Unpopular opinion: {topic} is actually overrated. Here's why...",
        "text_hindi": "अलोकप्रिय राय: {topic} असल में ओवररेटेड है। जानो क्यों...",
        "text_english": "Unpopular opinion: {topic} is actually overrated. Here's why...",
        "hook_type": "contrarian",
        "category": "lifestyle",
        "platform": "reel",
    },
    {
        "text": "Ye {popular thing} follow karna band karo. Actually kaam ye karta hai...",
        "text_hindi": "ये {popular thing} फॉलो करना बंद करो। असल में काम ये करता है...",
        "text_english": "Stop following {popular thing}. What actually works is this...",
        "hook_type": "contrarian",
        "category": "fitness",
        "platform": "both",
    },
    {
        "text": "Doctor ne bola {common advice}? Galat hai. Science ye kehti hai...",
        "text_hindi": "डॉक्टर ने बोला {common advice}? गलत है। साइंस ये कहती है...",
        "text_english": "Doctor said {common advice}? Wrong. Science says this...",
        "hook_type": "contrarian",
        "category": "fitness",
        "platform": "short",
    },
    # ── RELATABLE STRUGGLE (4 templates) ─────────────────────────────────────
    {
        "text": "POV: Tu {city} ka student hai aur exam kal hai...",
        "text_hindi": "POV: तू {city} का स्टूडेंट है और एग्जाम कल है...",
        "text_english": "POV: You're a {city} student and the exam is tomorrow...",
        "hook_type": "relatable_struggle",
        "category": "entertainment",
        "platform": "reel",
    },
    {
        "text": "Ye feeling tabhi aati hai jab {relatable situation}...",
        "text_hindi": "ये फीलिंग तभी आती है जब {relatable situation}...",
        "text_english": "This feeling only hits when {relatable situation}...",
        "hook_type": "relatable_struggle",
        "category": "lifestyle",
        "platform": "reel",
    },
    {
        "text": "Ghar mein mummy ka dialogue: 'Beta {common dialogue}'... Relatable?",
        "text_hindi": "घर में मम्मी का डायलॉग: 'बेटा {common dialogue}'... रिलेटेबल?",
        "text_english": "Mom at home: 'Son/daughter {common dialogue}'... Relatable?",
        "hook_type": "relatable_struggle",
        "category": "entertainment",
        "platform": "reel",
    },
    {
        "text": "Salary aa gayi aur next din hi khatam... ye cycle kab todoge?",
        "text_hindi": "सैलरी आ गई और अगले दिन ही खत्म... ये साइकल कब तोड़ोगे?",
        "text_english": "Salary came and gone the next day... when will you break this cycle?",
        "hook_type": "relatable_struggle",
        "category": "finance",
        "platform": "both",
    },
    # ── NUMBERS / LISTS (4 templates) ────────────────────────────────────────
    {
        "text": "{N} cafes in {city} jo aapko try karne chahiye under ₹{amount}...",
        "text_hindi": "{N} कैफ़े {city} में जो आपको ट्राई करने चाहिए ₹{amount} के अंदर...",
        "text_english": "{N} cafes in {city} you must try under ₹{amount}...",
        "hook_type": "numbers_list",
        "category": "food",
        "platform": "reel",
    },
    {
        "text": "Top {N} mistakes jo {audience} karte hain — #3 sabse dangerous...",
        "text_hindi": "टॉप {N} गलतियां जो {audience} करते हैं — #3 सबसे खतरनाक...",
        "text_english": "Top {N} mistakes that {audience} make — #3 is the most dangerous...",
        "hook_type": "numbers_list",
        "category": "education",
        "platform": "both",
    },
    {
        "text": "Sirf {N} minute mein {result} — ye formula koi nahi batata...",
        "text_hindi": "सिर्फ {N} मिनट में {result} — ये फॉर्मूला कोई नहीं बताता...",
        "text_english": "In just {N} minutes get {result} — nobody shares this formula...",
        "hook_type": "numbers_list",
        "category": "lifestyle",
        "platform": "both",
    },
    {
        "text": "₹{amount} mein {N} products jo Amazon pe available hain aur kaam ke hain...",
        "text_hindi": "₹{amount} में {N} प्रोडक्ट्स जो अमेज़न पे मिलते हैं और काम के हैं...",
        "text_english": "₹{amount} — {N} products on Amazon that are actually worth it...",
        "hook_type": "numbers_list",
        "category": "tech",
        "platform": "short",
    },
    # ── DIRECT ADDRESS (4 templates) ─────────────────────────────────────────
    {
        "text": "Agar aap {audience} ho, toh scrolling band karo. Ye tumhare liye hai...",
        "text_hindi": "अगर आप {audience} हो, तो स्क्रॉलिंग बंद करो। ये तुम्हारे लिए है...",
        "text_english": "If you're a {audience}, stop scrolling. This is for you...",
        "hook_type": "direct_address",
        "category": "business",
        "platform": "both",
    },
    {
        "text": "Ye reel un logon ke liye hai jinke paas {thing} nahi hai...",
        "text_hindi": "ये रील उन लोगों के लिए है जिनके पास {thing} नहीं है...",
        "text_english": "This reel is for those who don't have {thing}...",
        "hook_type": "direct_address",
        "category": "motivation",
        "platform": "reel",
    },
    {
        "text": "STOP! Agar aap abhi {common action} kar rahe ho, toh ye suno pehle...",
        "text_hindi": "रुको! अगर आप अभी {common action} कर रहे हो, तो ये सुनो पहले...",
        "text_english": "STOP! If you're doing {common action} right now, hear this first...",
        "hook_type": "direct_address",
        "category": "lifestyle",
        "platform": "both",
    },
    {
        "text": "Tu {city} mein rehta hai? Toh ye tera sign hai ki {action}...",
        "text_hindi": "तू {city} में रहता है? तो ये तेरा साइन है कि {action}...",
        "text_english": "You live in {city}? Then this is your sign to {action}...",
        "hook_type": "direct_address",
        "category": "lifestyle",
        "platform": "reel",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
#  FEW-SHOT EXAMPLES  (patterns from top 100 Indian creators' viral hooks)
# ══════════════════════════════════════════════════════════════════════════════

FEW_SHOT_EXAMPLES = """
Here are real high-performing hooks from top Indian creators, grouped by type:

### CURIOSITY GAP (Dhruv Rathee, Warikoo, Ankur Warikoo style)
1. "Maine 3 saal waste kiye ye samajhne mein. Tum 60 seconds mein samjho." [Score: 92]
2. "₹50,000 ki galti jo maine ki — taaki tum na karo." [Score: 89]
3. "Ye cheez 90% Indians galat karte hain aur unhe pata bhi nahi." [Score: 95]
4. "Ek aisi trick jo school mein kabhi nahi sikhaayi... par life change kar degi." [Score: 88]

### CONTRARIAN (Beer Biceps, Prakhar ke Pravachan style)
5. "Sab bol rahe hain mutual funds invest karo. Main bataunga kyun galat hai." [Score: 91]
6. "Unpopular opinion: IIT jaana overrated hai. Sunlo kyun." [Score: 87]
7. "Doctor ne bola roz doodh piyo? Science kehti hai galat." [Score: 86]
8. "Meditation karo bol rahe sab. Par kya sach mein kaam karti hai?" [Score: 83]

### RELATABLE STRUGGLE (Kusha Kapila, Ashish Chanchlani, Bhuvan Bam style)
9. "POV: Tu Delhi ka student hai aur metro mein jagah nahi mil rahi." [Score: 94]
10. "Salary aayi, EMI gayi, credit card bill aaya... kuch bacha? Nahi." [Score: 93]
11. "Mummy: 'Kuch khaaya?' Me: 'Haan' (khaaya nahi)." [Score: 90]
12. "Monday subah alarm bajta hai aur tu sochta hai resign kar du..." [Score: 88]

### NUMBERS / LISTS (Technical Guruji, Kabita's Kitchen, Flying Beast style)
13. "3 jagah Delhi mein under ₹200 jo tourist nahi jaante." [Score: 91]
14. "5 apps jo delete kar do — battery aur data dono bachega." [Score: 89]
15. "Top 7 mistakes first-time investors karte hain. #4 sabse khatarnaak." [Score: 90]
16. "₹500 mein 5 Amazon gadgets jo actually kaam ke hain." [Score: 87]

### DIRECT ADDRESS (Ranveer Allahbadia, Sandeep Maheshwari style)
17. "Agar tu abhi 20s mein hai, toh STOP. Ye sun pehle." [Score: 93]
18. "Small business owner ho? Ye reel save kar lo. Baad mein thank karoge." [Score: 92]
19. "Ye video unke liye hai jinhone last month gym chhod diya." [Score: 85]
20. "Agar tum Tier-2 city se ho aur succeed karna chahte ho — keep watching." [Score: 90]
"""


class HookService:
    """
    Service for generating viral hooks with GPT-4 few-shot prompting
    and A/B test tracking.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # ══════════════════════════════════════════════════════════════════════════
    #  GENERATE HOOKS
    # ══════════════════════════════════════════════════════════════════════════

    async def generate_hooks(
        self,
        topic: str,
        target_audience: str,
        platform: str,
        language: str,
        category: str,
        count: int = 5,
        user_id: Optional[uuid.UUID] = None,
    ) -> dict:
        """
        Generate `count` hook variations with performance predictions.
        Returns a dict with batch_id and list of hook dicts.
        """
        batch_id = uuid.uuid4()

        prompt = self._build_prompt(topic, target_audience, platform, language, category, count)

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": self._system_prompt(language)},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            temperature=0.85,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        hooks = self._parse_response(content, language, platform)

        # Persist to DB
        saved_hooks = []
        for h in hooks[:count]:
            hook_row = Hook(
                user_id=user_id,
                text=h["text"],
                text_hindi=h.get("text_hindi"),
                text_english=h.get("text_english"),
                category=category,
                hook_type=h.get("hook_type", "curiosity_gap"),
                platform=platform,
                target_audience=target_audience,
                predicted_score=h.get("predicted_score", 75.0),
                predicted_reasoning=h.get("predicted_reasoning", ""),
                is_ai_generated=True,
                is_template=False,
                generation_topic=topic,
                generation_batch_id=batch_id,
            )
            self.db.add(hook_row)
            await self.db.flush()

            h["id"] = str(hook_row.id)
            saved_hooks.append(h)

        await self.db.commit()

        return {
            "batch_id": str(batch_id),
            "hooks": saved_hooks,
        }

    # ── System prompt ─────────────────────────────────────────────────────────

    def _system_prompt(self, language: str) -> str:
        lang_guide = {
            "hi": "Generate hooks entirely in Hindi (Devanagari script).",
            "en": "Generate hooks in English, but keep Indian cultural context.",
            "hinglish": "Generate hooks in Hinglish — natural mix of Hindi + English in Roman script. This is how Indian Gen-Z actually talks.",
        }

        return f"""You are a viral content strategist who has analysed the top 100 Indian creators' hooks.
Your job: generate scroll-stopping hooks — the first 3 seconds that decide whether someone watches.

Language: {lang_guide.get(language, lang_guide['hinglish'])}

You MUST generate hooks across these 5 types:
1. CURIOSITY GAP — create an information gap the viewer *must* close
2. CONTRARIAN — challenge a popular belief to trigger engagement  
3. RELATABLE STRUGGLE — POV/situation the target audience lives every day
4. NUMBERS/LIST — specific numbers create credibility + curiosity
5. DIRECT ADDRESS — speak directly to the target audience, make them feel seen

For each hook, also predict a performance score (0-100) based on:
- Scroll-stop power (will it interrupt mindless scrolling?)
- Emotional trigger (curiosity, FOMO, anger, pride, nostalgia)
- Shareability (would someone tag a friend?)
- Platform fit (Reel = visual + punchy, Short = slightly longer OK)

{FEW_SHOT_EXAMPLES}

RESPOND IN JSON with this exact structure:
{{
  "hooks": [
    {{
      "text": "hook text in requested language",
      "text_hindi": "Hindi version (Devanagari)",
      "text_english": "English translation",
      "hook_type": "curiosity_gap|contrarian|relatable_struggle|numbers_list|direct_address",
      "predicted_score": 85,
      "predicted_reasoning": "1-line reason why this score"
    }}
  ]
}}
"""

    # ── Build prompt ──────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        topic: str,
        target_audience: str,
        platform: str,
        language: str,
        category: str,
        count: int,
    ) -> str:
        return f"""Generate {count} viral opening hooks for:

TOPIC: {topic}
TARGET AUDIENCE: {target_audience}
PLATFORM: {"Instagram Reel / YouTube Shorts" if platform == "reel" else "YouTube Shorts"}
CATEGORY: {category}
LANGUAGE: {language}

Requirements:
- Each hook must be 1-2 lines max (under 15 words ideal)
- Mix all 5 hook types
- Include ₹ amounts, city names, or numbers where relevant (Indian context)
- Think like Dhruv Rathee for educational, Kusha Kapila for relatable, Warikoo for business
- Predict a score 0-100 for each hook

Return exactly {count} hooks in JSON."""

    # ── Parse response ────────────────────────────────────────────────────────

    def _parse_response(self, content: str, language: str, platform: str) -> List[dict]:
        """Parse GPT-4 JSON response into hook dicts."""
        try:
            data = json.loads(content)
            raw_hooks = data.get("hooks", [])
        except json.JSONDecodeError:
            # Fallback: try line-based parsing
            return self._parse_line_based(content, language, platform)

        hooks = []
        for h in raw_hooks:
            text = unicodedata.normalize("NFC", str(h.get("text", "")))
            if not text:
                continue
            hooks.append({
                "text": text,
                "text_hindi": unicodedata.normalize("NFC", str(h.get("text_hindi", ""))) or None,
                "text_english": h.get("text_english") or None,
                "hook_type": h.get("hook_type", "curiosity_gap"),
                "predicted_score": float(h.get("predicted_score", 75)),
                "predicted_reasoning": h.get("predicted_reasoning", "Strong hook pattern"),
                "platform": platform,
            })

        return hooks

    def _parse_line_based(self, content: str, language: str, platform: str) -> List[dict]:
        """Fallback parser for non-JSON responses."""
        hooks = []
        current: dict = {}

        for line in content.strip().split("\n"):
            line = line.strip()
            if line.startswith("HOOK:"):
                if current:
                    hooks.append(current)
                current = {
                    "text": unicodedata.normalize("NFC", line.replace("HOOK:", "").strip()),
                    "hook_type": "curiosity_gap",
                    "predicted_score": 75.0,
                    "predicted_reasoning": "Generated hook",
                    "text_hindi": None,
                    "text_english": None,
                    "platform": platform,
                }
            elif line.startswith("TYPE:"):
                t = line.replace("TYPE:", "").strip().lower()
                type_map = {
                    "curiosity": "curiosity_gap",
                    "curiosity_gap": "curiosity_gap",
                    "contrarian": "contrarian",
                    "relatable": "relatable_struggle",
                    "relatable_struggle": "relatable_struggle",
                    "numbers": "numbers_list",
                    "numbers_list": "numbers_list",
                    "list": "numbers_list",
                    "direct": "direct_address",
                    "direct_address": "direct_address",
                }
                current["hook_type"] = type_map.get(t, "curiosity_gap")
            elif line.startswith("SCORE:"):
                try:
                    current["predicted_score"] = float(line.replace("SCORE:", "").strip())
                except ValueError:
                    pass
            elif line.startswith("HINDI:"):
                current["text_hindi"] = unicodedata.normalize("NFC", line.replace("HINDI:", "").strip()) or None
            elif line.startswith("ENGLISH:"):
                current["text_english"] = line.replace("ENGLISH:", "").strip() or None

        if current:
            hooks.append(current)

        return hooks

    # ══════════════════════════════════════════════════════════════════════════
    #  A/B TEST TRACKING
    # ══════════════════════════════════════════════════════════════════════════

    async def vote_ab(self, hook_id: uuid.UUID, result: str) -> dict:
        """Record A/B test vote: 'worked' or 'failed'."""
        row = await self.db.execute(select(Hook).where(Hook.id == hook_id))
        hook = row.scalar_one_or_none()
        if not hook:
            return {"error": "not_found"}

        hook.times_tested += 1
        if result == "worked":
            hook.times_worked += 1
        else:
            hook.times_failed += 1

        # Recompute score
        if hook.times_tested > 0:
            hook.ab_score = round(hook.times_worked / hook.times_tested * 100, 1)

        await self.db.commit()

        return {
            "id": str(hook.id),
            "times_tested": hook.times_tested,
            "times_worked": hook.times_worked,
            "times_failed": hook.times_failed,
            "ab_score": hook.ab_score,
        }

    # ══════════════════════════════════════════════════════════════════════════
    #  LEADERBOARD  — crowd-sourced top hooks
    # ══════════════════════════════════════════════════════════════════════════

    async def get_leaderboard(self, limit: int = 20) -> dict:
        """Return top-performing hooks by community A/B scores."""
        query = (
            select(Hook)
            .where(Hook.times_tested >= 3)  # Need at least 3 votes
            .order_by(Hook.ab_score.desc().nullslast(), Hook.times_tested.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        hooks = result.scalars().all()

        total_votes_q = await self.db.execute(
            select(func.sum(Hook.times_tested)).where(Hook.times_tested > 0)
        )
        total_votes = total_votes_q.scalar() or 0

        entries = []
        for h in hooks:
            entries.append({
                "id": str(h.id),
                "text": h.text,
                "hook_type": h.hook_type,
                "category": h.category,
                "platform": h.platform,
                "ab_score": h.ab_score or 0,
                "times_tested": h.times_tested,
                "times_worked": h.times_worked,
                "times_failed": h.times_failed,
                "usage_count": h.usage_count,
            })

        return {"entries": entries, "total_votes": total_votes}

    # ══════════════════════════════════════════════════════════════════════════
    #  TEMPLATES
    # ══════════════════════════════════════════════════════════════════════════

    def get_proven_templates(
        self,
        hook_type: Optional[str] = None,
        category: Optional[str] = None,
        platform: Optional[str] = None,
    ) -> List[dict]:
        """Return the 20 proven templates, optionally filtered."""
        templates = []
        for i, t in enumerate(PROVEN_TEMPLATES):
            if hook_type and t["hook_type"] != hook_type:
                continue
            if category and t["category"] != category:
                continue
            if platform and t["platform"] not in (platform, "both"):
                continue

            from app.schemas.hook import HOOK_TYPE_LABELS
            label = HOOK_TYPE_LABELS.get(t["hook_type"], {}).get("en", t["hook_type"])

            templates.append({
                "id": f"template-{i}",
                "text": t["text"],
                "text_hindi": t.get("text_hindi"),
                "text_english": t.get("text_english"),
                "hook_type": t["hook_type"],
                "hook_type_label": label,
                "category": t["category"],
                "platform": t["platform"],
                "usage_count": 0,
                "ab_score": None,
                "times_tested": 0,
                "times_worked": 0,
            })

        return templates
