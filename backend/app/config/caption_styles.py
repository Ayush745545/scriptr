"""
Caption Styling Presets
Indian aesthetic styles for video captions (Reels/Shorts).
"""

from typing import Dict, Any

CAPTION_STYLES: Dict[str, Dict[str, Any]] = {
    "bollywood_drama": {
        "id": "bollywood_drama",
        "name": "Bollywood Drama",
        "description": "Bold, cinematic style with gold gradients",
        "font_family": "Montserrat, sans-serif",
        "font_weight": "900",
        "text_transform": "uppercase",
        "color": "#FFD700",  # Gold
        "text_shadow": "2px 2px 0px #8B0000",  # Dark Red shadow
        "background_color": "transparent",
        "highlight_color": "#FF0000",
        "animation": "pop_in",
        "position": "bottom",
    },
    "minimal_chic": {
        "id": "minimal_chic",
        "name": "Minimal Chic",
        "description": "Clean white text with subtle black shadow",
        "font_family": "Inter, sans-serif",
        "font_weight": "600",
        "text_transform": "none",
        "color": "#FFFFFF",
        "text_shadow": "0px 1px 2px rgba(0,0,0,0.5)",
        "background_color": "transparent",
        "highlight_color": "#FFD700",
        "animation": "fade",
        "position": "bottom",
    },
    "desi_vlog": {
        "id": "desi_vlog",
        "name": "Desi Vlog",
        "description": "Yellow text with black background strip",
        "font_family": "Oswald, sans-serif",
        "font_weight": "700",
        "text_transform": "uppercase",
        "color": "#FFFF00",
        "text_shadow": "none",
        "background_color": "#000000",
        "highlight_color": "#FFFFFF",
        "animation": "slide_up",
        "position": "bottom_third",
    },
    "neon_nights": {
        "id": "neon_nights",
        "name": "Neon Nights",
        "description": "Cyberpunk/Club aesthetic with neon glow",
        "font_family": "Rajdhani, sans-serif",
        "font_weight": "700",
        "text_transform": "uppercase",
        "color": "#00FF00",  # Neon Green
        "text_shadow": "0 0 5px #00FF00, 0 0 10px #00FF00",
        "background_color": "rgba(0,0,0,0.3)",
        "highlight_color": "#FF00FF",  # Neon Pink
        "animation": "flicker",
        "position": "center",
    },
    "classic_hindi": {
        "id": "classic_hindi",
        "name": "Classic Hindi",
        "description": "Traditional Devanagari friendly layout",
        "font_family": "Baloo 2, cursive",
        "font_weight": "600",
        "text_transform": "none",
        "color": "#FFFFFF",
        "text_shadow": "1px 1px 2px #000000",
        "background_color": "rgba(0,0,0,0.6)",
        "highlight_color": "#FF9933",  # Saffron
        "animation": "typewriter",
        "position": "bottom",
    },
}
