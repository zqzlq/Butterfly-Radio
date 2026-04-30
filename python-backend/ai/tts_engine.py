import io
import os
import sys
from pathlib import Path
from typing import Optional

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


class TTSEngine:
    """
    TTS engine for synthesizing AI host speech.
    Supports ChatTTS (lightweight) and Qwen3-TTS (high quality).
    """

    def __init__(self):
        self._mode = "local_lightweight"  # local_lightweight, local_highquality, cloud_api
        self._tts = None
        self._speed = 1.0
        self._sample_rate = 24000
        self._output_dir = _get_temp_dir("tts")

    def set_mode(self, mode: str):
        """Set the TTS mode."""
        self._mode = mode
        logger.info(f"TTS mode set to: {mode}")

    def set_speed(self, speed: float):
        """Set TTS playback speed."""
        self._speed = max(0.5, min(2.0, speed))
        logger.info(f"TTS speed set to: {self._speed}")

    async def initialize(self):
        """Initialize the TTS engine based on current mode."""
        if self._mode in ("local_lightweight", "local_highquality"):
            await self._init_local()
        logger.info(f"TTS engine initialized (mode={self._mode})")

    async def _init_local(self):
        """Initialize local TTS model."""
        try:
            if self._mode == "local_lightweight":
                # import ChatTTS
                # self._tts = ChatTTS.Chat()
                # self._tts.load_models()
                logger.info("ChatTTS placeholder — will be loaded when model files are available")
            elif self._mode == "local_highquality":
                # Qwen3-TTS initialization
                logger.info("Qwen3-TTS placeholder — will be loaded when model files are available")
        except ImportError:
            logger.warning("TTS library not installed, local TTS unavailable")
        except Exception as e:
            logger.error(f"Failed to load TTS model: {e}")

    async def synthesize(self, text: str, output_path: str = None) -> Optional[str]:
        """
        Synthesize text to speech audio file.
        Returns the path to the generated audio file, or None on failure.
        """
        if not text or not text.strip():
            return None

        if output_path is None:
            import hashlib
            text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
            output_path = str(self._output_dir / f"tts_{text_hash}.wav")

        # Check cache
        if os.path.exists(output_path):
            logger.info(f"Using cached TTS audio: {output_path}")
            return output_path

        if self._tts:
            return await self._synthesize_local(text, output_path)
        else:
            return await self._synthesize_fallback(text, output_path)

    async def _synthesize_local(self, text: str, output_path: str) -> Optional[str]:
        """Synthesize using local TTS model."""
        try:
            if self._mode == "local_lightweight" and self._tts:
                # ChatTTS synthesis
                # wavs = self._tts.infer([text], use_decoder=True)
                # Save to file
                logger.info(f"Local TTS synthesis placeholder: {text[:50]}...")
                return self._generate_placeholder_audio(text, output_path)
            elif self._mode == "local_highquality":
                # Qwen3-TTS synthesis
                logger.info(f"Qwen3-TTS synthesis placeholder: {text[:50]}...")
                return self._generate_placeholder_audio(text, output_path)
        except Exception as e:
            logger.error(f"Local TTS synthesis failed: {e}")
        return None

    async def synthesize_cloud(self, text: str, output_path: str, provider: str = "doubao") -> Optional[str]:
        """Synthesize using cloud TTS API."""
        try:
            if provider == "doubao":
                return await self._call_doubao_tts(text, output_path)
            elif provider == "qwen":
                return await self._call_qwen_tts(text, output_path)
        except Exception as e:
            logger.error(f"Cloud TTS failed: {e}")
        return None

    async def _call_doubao_tts(self, text: str, output_path: str) -> Optional[str]:
        """Call Volcengine TTS API."""
        logger.info("Doubao TTS API placeholder")
        return self._generate_placeholder_audio(text, output_path)

    async def _call_qwen_tts(self, text: str, output_path: str) -> Optional[str]:
        """Call Alibaba TTS API."""
        logger.info("Qwen TTS API placeholder")
        return self._generate_placeholder_audio(text, output_path)

    def _generate_placeholder_audio(self, text: str, output_path: str) -> str:
        """Generate a placeholder silent audio file for testing."""
        from pydub import AudioSegment
        # Generate silence proportional to text length (approx 150ms per Chinese char)
        duration_ms = max(1000, len(text) * 150)
        silence = AudioSegment.silent(duration=duration_ms)
        silence.export(output_path, format="wav")
        logger.info(f"Generated placeholder TTS audio ({duration_ms}ms): {output_path}")
        return output_path

    def clear_cache(self):
        """Clear cached TTS audio files."""
        import shutil
        if self._output_dir.exists():
            shutil.rmtree(self._output_dir)
            self._output_dir.mkdir(parents=True, exist_ok=True)
            logger.info("TTS cache cleared")


# Singleton
tts_engine = TTSEngine()
