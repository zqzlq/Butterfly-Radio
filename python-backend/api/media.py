import os
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao

router = APIRouter(prefix="/media", tags=["media"])

# TTS commentary audio directory
if getattr(sys, "frozen", False):
    _temp_base = Path(sys.executable).parent / "temp"
else:
    _temp_base = Path("temp")

COMMENTARY_DIR = _temp_base / "commentary"


@router.get("/songs/{song_id}/stream")
async def stream_song(song_id: str, db: AsyncSession = Depends(get_db)):
    """Stream an audio file for playback."""
    song = await dao.get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    file_path = Path(song.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    media_type_map = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".flac": "audio/flac",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
    }
    media_type = media_type_map.get(file_path.suffix.lower(), "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=f"{song.title}{file_path.suffix}",
    )


@router.get("/songs/{song_id}/cover")
async def get_cover(song_id: str, db: AsyncSession = Depends(get_db)):
    """Get the cover image for a song."""
    song = await dao.get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    if song.cover_path:
        cover_path = Path(song.cover_path)
        if cover_path.exists():
            return FileResponse(
                path=str(cover_path),
                media_type="image/jpeg",
            )

    # Return a 1x1 transparent PNG as default
    raise HTTPException(status_code=404, detail="Cover not found")


@router.get("/tts/{filename}")
async def serve_tts_audio(filename: str):
    """Serve AI commentary TTS audio files."""
    # Prevent directory traversal
    safe_name = Path(filename).name
    file_path = COMMENTARY_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="TTS audio not found")

    return FileResponse(
        path=str(file_path),
        media_type="audio/wav",
        filename=safe_name,
    )
