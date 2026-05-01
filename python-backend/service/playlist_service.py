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
    """Get audio file duration using mutagen (no FFmpeg required)."""
    try:
        from mutagen import File as MutagenFile
        audio = MutagenFile(file_path)
        if audio and audio.info:
            return audio.info.length
        return 0.0
    except Exception as e:
        logger.warning(f"Failed to get duration for {file_path}: {e}")
        return 0.0


def get_audio_metadata(file_path: str) -> dict:
    """Extract metadata from audio file using mutagen."""
    try:
        from mutagen import File as MutagenFile
        from mutagen.easyid3 import EasyID3
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.mp4 import MP4

        audio = MutagenFile(file_path)
        result = {
            "duration": 0.0,
            "format": Path(file_path).suffix.lstrip("."),
        }

        if audio and audio.info:
            result["duration"] = audio.info.length
            result["channels"] = getattr(audio.info, "channels", 0)
            result["sample_rate"] = getattr(audio.info, "sample_rate", 0)

        # Extract tags (title, artist, album)
        if audio and audio.tags:
            if isinstance(audio.tags, dict):
                # ID3-based (MP3)
                for key in ("TIT2", "Title"):
                    if key in audio.tags:
                        result["title"] = str(audio.tags[key])
                for key in ("TPE1", "Artist"):
                    if key in audio.tags:
                        result["artist"] = str(audio.tags[key])
                for key in ("TALB", "Album"):
                    if key in audio.tags:
                        result["album"] = str(audio.tags[key])

        return result
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
            title = metadata.get("title") or file_path.stem
            artist = metadata.get("artist", "Unknown")
            album = metadata.get("album")
            format_ext = file_path.suffix.lstrip(".")

            song = await dao.create_song(
                db,
                title=title,
                artist=artist,
                album=album,
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
