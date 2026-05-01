import base64
import hashlib
import os
import sys
import uuid
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger


def _get_temp_dir(subdir: str) -> Path:
    """Resolve temp directory — next to executable in bundled mode, CWD in dev."""
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).parent / "temp"
    else:
        base = Path("temp")
    path = base / subdir
    path.mkdir(parents=True, exist_ok=True)
    return path


# ─── Edge TTS voice presets ───
EDGE_VOICES = {
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",      # 女，活泼甜美
    "xiaoyi": "zh-CN-XiaoyiNeural",           # 女，温柔
    "yunxi": "zh-CN-YunxiNeural",             # 男，年轻
    "yunyang": "zh-CN-YunyangNeural",         # 男，专业播音
    "xiaomeng": "zh-CN-XiaomengNeural",       # 女，可爱
    "xiaochen": "zh-CN-XiaochenNeural",       # 女，知性
}

# ─── Volcengine TTS voice presets ───
VOLC_VOICES = {
    "通用女声": "BV001_V2_streaming",
    "通用男声": "BV002_V2_streaming",
    "灿灿": "BV007_V2_streaming",
    "曦曦": "BV123_V2_streaming",
    "灵溪": "BV125_V2_streaming",
}


class TTSEngine:
    """
    TTS engine with multiple providers.
    Supported: edge (free), volcengine (cloud), chat_tts (local placeholder).
    """

    def __init__(self):
        self._provider = "edge"  # edge, volcengine, chat_tts
        self._voice = "zh-CN-XiaoxiaoNeural"  # Edge TTS default voice
        self._volc_appid = ""
        self._volc_token = ""
        self._volc_voice = "BV001_V2_streaming"
        self._speed = 1.0
        self._output_dir = _get_temp_dir("tts")

    def set_provider(self, provider: str):
        """Set TTS provider: edge, volcengine, chat_tts."""
        self._provider = provider
        logger.info(f"TTS provider set to: {provider}")

    def set_voice(self, voice: str):
        """Set voice name."""
        if self._provider == "edge":
            self._voice = EDGE_VOICES.get(voice, voice)
        elif self._provider == "volcengine":
            self._volc_voice = VOLC_VOICES.get(voice, voice)
        logger.info(f"TTS voice set to: {voice}")

    def set_volcengine_config(self, appid: str, token: str):
        """Set Volcengine TTS credentials."""
        self._volc_appid = appid
        self._volc_token = token

    def set_speed(self, speed: float):
        """Set playback speed."""
        self._speed = max(0.5, min(2.0, speed))
        logger.info(f"TTS speed set to: {self._speed}")

    async def initialize(self):
        """Initialize TTS engine. Read config from env."""
        self._volc_appid = os.environ.get("VOLC_TTS_APPID", "")
        self._volc_token = os.environ.get("VOLC_TTS_TOKEN", "")
        voice = os.environ.get("TTS_VOICE", "")
        if voice:
            self.set_voice(voice)
        logger.info(f"TTS engine initialized: provider={self._provider}, voice={self._voice}")

    async def synthesize(self, text: str, output_path: str = None) -> Optional[str]:
        """
        Synthesize text to speech audio file.
        Returns the path to the generated audio file, or None on failure.
        """
        if not text or not text.strip():
            return None

        if output_path is None:
            text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
            output_path = str(self._output_dir / f"tts_{text_hash}.mp3")

        # Check cache
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Using cached TTS audio: {output_path}")
            return output_path

        result = None
        if self._provider == "edge":
            result = await self._synthesize_edge(text, output_path)
        elif self._provider == "volcengine":
            if self._volc_appid and self._volc_token:
                result = await self._synthesize_volcengine(text, output_path)
            else:
                logger.warning("Volcengine TTS credentials not configured, falling back to Edge TTS")
                result = await self._synthesize_edge(text, output_path)
        elif self._provider == "chat_tts":
            result = await self._synthesize_chat_tts(text, output_path)
        else:
            result = await self._synthesize_edge(text, output_path)

        return result

    # ─── Edge TTS (free, no API key) ───

    async def _synthesize_edge(self, text: str, output_path: str) -> Optional[str]:
        """Synthesize using Microsoft Edge TTS (free)."""
        try:
            import edge_tts

            rate = f"+{int((self._speed - 1) * 100)}%" if self._speed >= 1 else f"{int((self._speed - 1) * 100)}%"
            communicate = edge_tts.Communicate(text, self._voice, rate=rate)
            await communicate.save(output_path)

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(f"Edge TTS synthesized ({self._voice}): {output_path}")
                return output_path
            else:
                logger.error("Edge TTS produced empty output")
                return None
        except Exception as e:
            logger.error(f"Edge TTS failed: {e}")
            return None

    # ─── Volcengine TTS (cloud, needs API key) ───

    async def _synthesize_volcengine(self, text: str, output_path: str) -> Optional[str]:
        """Synthesize using Volcengine (火山引擎) TTS API."""
        url = "https://openspeech.bytedance.com/api/v1/tts"
        headers = {"Content-Type": "application/json"}
        payload = {
            "app": {
                "appid": self._volc_appid,
                "token": self._volc_token,
                "cluster": "volcano_tts",
            },
            "user": {"uid": "butterfly-radio"},
            "audio": {
                "voice_type": self._volc_voice,
                "encoding": "mp3",
                "speed_ratio": self._speed,
                "volume_ratio": 1.0,
                "pitch_ratio": 1.0,
            },
            "request": {
                "reqid": uuid.uuid4().hex,
                "text": text,
                "text_type": "plain",
                "operation": "query",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()

                if data.get("code") != 0:
                    logger.error(f"Volcengine TTS error: {data.get('message', 'unknown')}")
                    return None

                audio_b64 = data.get("data", "")
                if not audio_b64:
                    logger.error("Volcengine TTS returned empty audio data")
                    return None

                audio_bytes = base64.b64decode(audio_b64)
                with open(output_path, "wb") as f:
                    f.write(audio_bytes)

                logger.info(f"Volcengine TTS synthesized ({self._volc_voice}): {output_path}")
                return output_path
        except httpx.HTTPStatusError as e:
            logger.error(f"Volcengine TTS HTTP error {e.response.status_code}: {e.response.text[:200]}")
        except Exception as e:
            logger.error(f"Volcengine TTS failed: {e}")

        return None

    # ─── ChatTTS (local, placeholder) ───

    async def _synthesize_chat_tts(self, text: str, output_path: str) -> Optional[str]:
        """Synthesize using local ChatTTS model."""
        try:
            # import ChatTTS
            # chat = ChatTTS.Chat()
            # chat.load_models()
            # wavs = chat.infer([text], use_decoder=True)
            # Save to file...
            logger.info(f"ChatTTS placeholder: {text[:50]}...")
            return self._generate_placeholder_audio(text, output_path)
        except ImportError:
            logger.warning("ChatTTS not installed")
            return self._generate_placeholder_audio(text, output_path)
        except Exception as e:
            logger.error(f"ChatTTS failed: {e}")
            return None

    def _generate_placeholder_audio(self, text: str, output_path: str) -> str:
        """Generate a placeholder silent audio file for testing."""
        from pydub import AudioSegment
        duration_ms = max(1000, len(text) * 150)
        silence = AudioSegment.silent(duration=duration_ms)
        silence.export(output_path, format="mp3")
        logger.info(f"Generated placeholder TTS audio ({duration_ms}ms): {output_path}")
        return output_path

    def get_status(self) -> dict:
        """Get current TTS status for UI display."""
        return {
            "provider": self._provider,
            "voice": self._voice if self._provider == "edge" else self._volc_voice,
            "speed": self._speed,
            "has_volcengine_key": bool(self._volc_appid and self._volc_token),
        }

    def get_voices(self) -> dict:
        """Get available voices for current provider."""
        if self._provider == "edge":
            return {k: v for k, v in EDGE_VOICES.items()}
        elif self._provider == "volcengine":
            return {k: v for k, v in VOLC_VOICES.items()}
        return {}

    def clear_cache(self):
        """Clear cached TTS audio files."""
        import shutil
        if self._output_dir.exists():
            shutil.rmtree(self._output_dir)
            self._output_dir.mkdir(parents=True, exist_ok=True)
            logger.info("TTS cache cleared")


# Singleton
tts_engine = TTSEngine()
