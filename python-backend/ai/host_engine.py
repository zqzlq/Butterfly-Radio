import asyncio
from pathlib import Path
from typing import Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from ai.llm_engine import llm_engine
from ai.tts_engine import tts_engine
from ai.content_safety import content_safety
from core.realtime_comm import emit_ai_commentary
from core.audio_engine import mix_song_with_commentary
from db import dao

# Temp directory for generated commentary audio
COMMENTARY_DIR = Path("temp/commentary")
COMMENTARY_DIR.mkdir(parents=True, exist_ok=True)


class HostEngine:
    """
    Main AI host engine that orchestrates LLM + TTS + content safety
    to produce AI host commentary for the radio broadcast.
    """

    def __init__(self):
        self._initialized = False

    async def initialize(self):
        """Initialize all AI sub-engines."""
        await llm_engine.initialize()
        await tts_engine.initialize()
        self._initialized = True
        logger.info("AI Host engine initialized")

    def configure(self, ai_mode: str = None, host_style: str = None, tts_speed: float = None):
        """Configure AI host settings."""
        if ai_mode:
            llm_engine.set_mode(ai_mode)
            tts_engine.set_mode(ai_mode)
        if host_style:
            llm_engine.set_host_style(host_style)
        if tts_speed:
            tts_engine.set_speed(tts_speed)

    async def generate_song_intro(self, song: dict) -> Optional[dict]:
        """Generate AI commentary to introduce the next song."""
        return await self._produce_commentary(
            context="song_intro",
            song_info=song,
            emit_to_client=True,
        )

    async def generate_song_review(self, song: dict) -> Optional[dict]:
        """Generate AI commentary reviewing the just-played song."""
        return await self._produce_commentary(
            context="song_review",
            song_info=song,
            emit_to_client=True,
        )

    async def generate_greeting(self) -> Optional[dict]:
        """Generate opening greeting commentary."""
        return await self._produce_commentary(
            context="greeting",
            emit_to_client=True,
        )

    async def handle_user_message(self, user_name: str, message: str) -> Optional[dict]:
        """Handle a user message and generate response commentary."""
        # Safety check
        safety = content_safety.check_text(message)
        if not safety["safe"]:
            logger.warning(f"Unsafe message from {user_name}: {safety['reason']}")
            return await self._produce_commentary(
                context="chat_response",
                user_name=user_name,
                user_message="[消息已被过滤]",
                emit_to_client=True,
            )

        return await self._produce_commentary(
            context="chat_response",
            user_name=user_name,
            user_message=message,
            emit_to_client=True,
        )

    async def handle_song_request(self, user_name: str, song: dict) -> Optional[dict]:
        """Handle a song request and generate response commentary."""
        return await self._produce_commentary(
            context="song_request",
            song_info=song,
            user_name=user_name,
            emit_to_client=True,
        )

    async def _produce_commentary(
        self,
        context: str,
        song_info: dict = None,
        user_name: str = "听众",
        user_message: str = None,
        emit_to_client: bool = True,
    ) -> Optional[dict]:
        """
        Core pipeline: LLM text generation → content safety → TTS synthesis → emit to client.
        """
        try:
            # Step 1: Generate commentary text via LLM
            text = await llm_engine.generate_commentary(
                context=context,
                song_info=song_info,
                user_message=user_message,
                user_name=user_name,
            )

            if not text:
                logger.warning(f"LLM returned empty commentary for context: {context}")
                return None

            # Step 2: Content safety check
            safety = content_safety.check_text(text)
            if not safety["safe"]:
                logger.warning(f"Generated commentary failed safety check: {safety['reason']}")
                text = safety["filtered"]

            # Step 3: TTS synthesis
            import hashlib
            text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
            audio_path = str(COMMENTARY_DIR / f"commentary_{text_hash}.wav")

            tts_result = await tts_engine.synthesize(text, output_path=audio_path)
            if not tts_result:
                logger.warning("TTS synthesis failed, emitting text-only commentary")

            # Step 4: Emit to client
            commentary_data = {
                "id": text_hash,
                "content": text,
                "audio_path": tts_result,
                "context": context,
                "host_name": llm_engine.get_host_info()["name"],
            }

            if emit_to_client:
                await emit_ai_commentary(commentary_data)

            logger.info(f"Commentary produced [{context}]: {text[:60]}...")
            return commentary_data

        except Exception as e:
            logger.error(f"Commentary production failed: {e}")
            return None

    async def mix_commentary_with_song(
        self,
        song_path: str,
        commentary_audio_path: str,
        output_path: str,
    ) -> Optional[str]:
        """
        Mix AI commentary audio with a song file.
        Used for pre-recorded broadcast segments.
        """
        return mix_song_with_commentary(
            song_path=song_path,
            commentary_path=commentary_audio_path,
            output_path=output_path,
            gap_before=500,
            gap_after=800,
            crossfade=300,
        )


# Singleton
host_engine = HostEngine()
