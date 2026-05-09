import os
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from service.artist_photo import fetch_artist_photo

router = APIRouter(prefix="/media", tags=["media"])

# TTS commentary audio directory
if getattr(sys, "frozen", False):
    _temp_base = Path(sys.executable).parent / "temp"
else:
    _temp_base = Path("temp")

COMMENTARY_DIR = _temp_base / "commentary"

MEDIA_TYPE_MAP = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
}


@router.get("/songs/{song_id}/stream")
async def stream_song(request: Request, song_id: str, db: AsyncSession = Depends(get_db)):
    """Stream an audio file with full HTTP range request support for seeking."""
    song = await dao.get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    file_path = Path(song.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    file_size = file_path.stat().st_size
    media_type = MEDIA_TYPE_MAP.get(file_path.suffix.lower(), "application/octet-stream")
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
        try:
            ranges = range_header.replace("bytes=", "").split("-")
            start = int(ranges[0])
            end = int(ranges[1]) if ranges[1] else file_size - 1
        except (ValueError, IndexError):
            start, end = 0, file_size - 1

        end = min(end, file_size - 1)
        if start > end or start >= file_size:
            return Response(
                status_code=416,
                headers={
                    "Content-Range": f"bytes */{file_size}",
                    "Accept-Ranges": "bytes",
                },
            )

        content_length = end - start + 1

        def iter_range():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                chunk_size = 64 * 1024  # 64KB chunks
                while remaining > 0:
                    read_size = min(chunk_size, remaining)
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_range(),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    # No range header — serve entire file
    def iter_file():
        with open(file_path, "rb") as f:
            while True:
                data = f.read(64 * 1024)
                if not data:
                    break
                yield data

    return StreamingResponse(
        iter_file(),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
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


@router.get("/artist-photo/{artist_name}")
async def get_artist_photo(artist_name: str):
    """Get a photo for an artist by searching the internet."""
    photo_path = await fetch_artist_photo(artist_name)
    if not photo_path:
        raise HTTPException(status_code=404, detail="Artist photo not found")

    media_type = "image/jpeg"
    suffix = photo_path.suffix.lower()
    if suffix == ".png":
        media_type = "image/png"
    elif suffix == ".webp":
        media_type = "image/webp"
    elif suffix == ".gif":
        media_type = "image/gif"

    return FileResponse(
        path=str(photo_path),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=604800"},  # 7 days
    )
