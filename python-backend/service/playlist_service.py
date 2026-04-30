import os
import sys
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from db import dao
from db.models import Song

SUPPORTED_FORMATS = {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"}


def get_audio_duration(file_path: str) -> float:
    """Get audio file duration using pydub."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0  # Convert ms to seconds
    except Exception as e:
        logger.warning(f"Failed to get duration for {file_path}: {e}")
        return 0.0


def get_audio_metadata(file_path: str) -> dict:
    """Extract metadata from audio file."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(file_path)
        return {
            "duration": len(audio) / 1000.0,
            "channels": audio.channels,
            "sample_rate": audio.frame_rate,
            "format": Path(file_path).suffix.lstrip("."),
        }
    except Exception as e:
        logger.warning(f"Failed to read metadata for {file_path}: {e}")
        return {"duration": 0.0, "format": Path(file_path).suffix.lstrip(".")}


async def import_directory(db: AsyncSession, directory: str) -> list[Song]:
    """Scan a directory and import all supported audio files."""
    dir_path = Path(directory)
    if not dir_path.exists() or not dir_path.is_dir():
        logger.error(f"Directory not found: {directory}")
        return []

    imported = []
    for file_path in dir_path.rglob("*"):
        if file_path.suffix.lower() in SUPPORTED_FORMATS:
            # Check if already imported
            existing = await dao.search_songs(db, file_path.stem)
            if any(str(file_path) == s.file_path for s in existing):
                continue

            metadata = get_audio_metadata(str(file_path))
            title = file_path.stem  # Use filename as title
            format_ext = file_path.suffix.lstrip(".")

            song = await dao.create_song(
                db,
                title=title,
                artist="Unknown",
                file_path=str(file_path),
                file_format=format_ext,
                duration=metadata.get("duration", 0.0),
            )
            imported.append(song)
            logger.info(f"Imported: {title} ({format_ext})")

    logger.info(f"Imported {len(imported)} songs from {directory}")
    return imported


async def scan_default_music(db: AsyncSession) -> list[Song]:
    """Scan the default music directory on startup."""
    candidates = [
        # Dev mode: project root
        Path(__file__).parent.parent.parent / "resources" / "default-music",
    ]

    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).parent
        candidates.insert(0, exe_dir / "default-music")
        candidates.append(exe_dir.parent / "resources" / "default-music")
        candidates.append(exe_dir.parent.parent / "resources" / "default-music")

    for default_dir in candidates:
        if default_dir.exists():
            logger.info(f"Found default music directory: {default_dir}")
            return await import_directory(db, str(default_dir))

    return []
