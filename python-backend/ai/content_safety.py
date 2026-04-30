import re
from typing import Optional
from loguru import logger

# Built-in sensitive word list (basic, expandable)
SENSITIVE_PATTERNS = [
    # Political sensitive
    r"(政治敏感词占位)",
    # Violent content
    r"(暴力|血腥|杀|死|伤害他人)",
    # Adult content
    r"(色情|裸体|性行为)",
    # Spam / ads
    r"(加微信|加QQ|免费领|中奖|诈骗)",
    # Hate speech
    r"(侮辱|歧视|种族)",
]


class ContentSafety:
    """
    Content safety moderation module.
    Supports local rule-based filtering and optional cloud API moderation.
    """

    def __init__(self):
        self._mode = "local"  # local, cloud
        self._custom_words: set[str] = set()
        self._load_custom_words()

    def _load_custom_words(self):
        """Load custom sensitive words from config file."""
        try:
            words_file = "config/sensitive_words.txt"
            if __import__("os").path.exists(words_file):
                with open(words_file, "r", encoding="utf-8") as f:
                    for line in f:
                        word = line.strip()
                        if word and not word.startswith("#"):
                            self._custom_words.add(word)
                logger.info(f"Loaded {len(self._custom_words)} custom sensitive words")
        except Exception as e:
            logger.warning(f"Failed to load custom sensitive words: {e}")

    def set_mode(self, mode: str):
        """Set moderation mode."""
        self._mode = mode

    def add_custom_words(self, words: list[str]):
        """Add custom sensitive words."""
        self._custom_words.update(words)
        logger.info(f"Added {len(words)} custom sensitive words")

    def check_text(self, text: str) -> dict:
        """
        Check text for unsafe content.
        Returns: {"safe": bool, "reason": str | None, "filtered": str}
        """
        if not text or not text.strip():
            return {"safe": True, "reason": None, "filtered": text}

        # Check built-in patterns
        for pattern in SENSITIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return {
                    "safe": False,
                    "reason": "内容包含敏感信息",
                    "filtered": self._mask_text(text, pattern),
                }

        # Check custom words
        for word in self._custom_words:
            if word in text:
                return {
                    "safe": False,
                    "reason": "内容包含敏感词",
                    "filtered": text.replace(word, "*" * len(word)),
                }

        return {"safe": True, "reason": None, "filtered": text}

    def _mask_text(self, text: str, pattern: str) -> str:
        """Mask matched content in text."""
        def replace_match(match):
            return "*" * len(match.group(0))
        return re.sub(pattern, replace_match, text, flags=re.IGNORECASE)

    def is_safe(self, text: str) -> bool:
        """Quick check if text is safe."""
        return self.check_text(text)["safe"]

    def filter_text(self, text: str) -> str:
        """Return filtered version of text."""
        return self.check_text(text)["filtered"]


# Singleton
content_safety = ContentSafety()
