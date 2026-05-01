from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from db.database import get_db
from db import dao
from api.schemas import (
    SongCreate, SongUpdate, SongResponse,
    PlaylistCreate, PlaylistResponse, PlaylistDetailResponse,
    MessageResponse,
)

router = APIRouter(prefix="/playlist", tags=["playlist"])


# ─── Songs ───

@router.get("/songs", response_model=list[SongResponse])
async def list_songs(
    favorited: bool = False,
    keyword: str = None,
    db: AsyncSession = Depends(get_db),
):
    """List all songs, optionally filter by favorite or keyword."""
    if keyword:
        return await dao.search_songs(db, keyword)
    return await dao.get_all_songs(db, favorited_only=favorited)


@router.get("/songs/{song_id}", response_model=SongResponse)
async def get_song(song_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single song by ID."""
    song = await dao.get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.post("/songs", response_model=SongResponse)
async def create_song(data: SongCreate, db: AsyncSession = Depends(get_db)):
    """Register a new song."""
    song = await dao.create_song(db, **data.model_dump())
    return song


@router.put("/songs/{song_id}", response_model=SongResponse)
async def update_song(song_id: str, data: SongUpdate, db: AsyncSession = Depends(get_db)):
    """Update song metadata."""
    song = await dao.update_song(db, song_id, **data.model_dump(exclude_unset=True))
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.delete("/songs/{song_id}", response_model=MessageResponse)
async def delete_song(song_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a song."""
    deleted = await dao.delete_song(db, song_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Song not found")
    return MessageResponse(message="Song deleted")


@router.post("/songs/{song_id}/favorite", response_model=SongResponse)
async def toggle_favorite(song_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle favorite status of a song."""
    song = await dao.toggle_favorite(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.post("/songs/import", response_model=list[SongResponse])
async def import_songs(
    directory: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Scan a local directory and import audio files."""
    from service.playlist_service import import_directory
    songs = await import_directory(db, directory)
    return songs


@router.get("/browse")
async def browse_directory(path: str = ""):
    """List subdirectories for directory browsing."""
    import os
    from pathlib import Path

    if not path:
        # Return drive list on Windows
        if os.name == "nt":
            import string
            drives = []
            for letter in string.ascii_uppercase:
                drive = f"{letter}:\\"
                if os.path.exists(drive):
                    drives.append({"name": drive, "path": drive})
            return {"current": "", "parent": None, "items": drives}
        path = "/"

    dir_path = Path(path)
    if not dir_path.exists() or not dir_path.is_dir():
        return {"error": "目录不存在", "current": path, "parent": None, "items": []}

    items = []
    try:
        for item in sorted(dir_path.iterdir()):
            if item.is_dir() and not item.name.startswith("."):
                items.append({"name": item.name, "path": str(item)})
    except PermissionError:
        pass

    parent = str(dir_path.parent) if dir_path.parent != dir_path else None
    return {"current": str(dir_path), "parent": parent, "items": items}


# ─── Online Search ───

class DownloadTrackRequest(BaseModel):
    source: str = Field(..., description="Source platform: jamendo")
    track_id: str = Field(..., description="Track ID on the platform")
    title: str = Field(..., description="Track title")
    artist: str = Field(..., description="Artist name")
    url: str = Field(..., description="Direct download URL")


@router.get("/search-online")
async def search_online(keyword: str, limit: int = 5, db: AsyncSession = Depends(get_db)):
    """Search for songs on Jamendo (free music platform)."""
    client_id = await dao.get_config(db, "jamendo_client_id") or ""
    if not client_id:
        raise HTTPException(status_code=400, detail="Jamendo Client ID 未配置，请在设置中填写")

    from service.music_search import search_jamendo
    results = await search_jamendo(keyword, client_id, limit=limit)
    return {"results": results, "total": len(results)}


@router.post("/download-track", response_model=SongResponse)
async def download_track(req: DownloadTrackRequest, db: AsyncSession = Depends(get_db)):
    """Download a track from an online platform and add to local library."""
    from service.music_search import download_track as do_download
    from service.playlist_service import get_audio_metadata

    # Download the MP3
    file_path = await do_download(
        title=req.title,
        artist=req.artist,
        url=req.url,
    )

    if not file_path:
        raise HTTPException(status_code=500, detail="下载失败")

    # Extract metadata
    metadata = get_audio_metadata(file_path)

    # Check if already in database
    existing = await dao.search_songs(db, req.title)
    for s in existing:
        if s.file_path == file_path:
            return s

    # Create song in database
    song = await dao.create_song(
        db,
        title=metadata.get("title") or req.title,
        artist=metadata.get("artist") or req.artist,
        album=metadata.get("album"),
        file_path=file_path,
        file_format="mp3",
        duration=metadata.get("duration", 0.0),
    )

    from loguru import logger
    logger.info(f"Downloaded and imported: {song.title} from {req.source}")
    return song


# ─── Playlists ───

@router.get("/", response_model=list[PlaylistResponse])
async def list_playlists(db: AsyncSession = Depends(get_db)):
    """List all playlists."""
    playlists = await dao.get_all_playlists(db)
    result = []
    for p in playlists:
        detail = await dao.get_playlist_with_songs(db, p.id)
        result.append(PlaylistResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            cover_path=p.cover_path,
            is_default=p.is_default,
            song_count=len(detail.songs) if detail else 0,
            created_at=p.created_at,
        ))
    return result


@router.get("/{playlist_id}", response_model=PlaylistDetailResponse)
async def get_playlist(playlist_id: str, db: AsyncSession = Depends(get_db)):
    """Get playlist with all songs."""
    playlist = await dao.get_playlist_with_songs(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    songs = [ps.song for ps in playlist.songs]
    return PlaylistDetailResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        cover_path=playlist.cover_path,
        is_default=playlist.is_default,
        song_count=len(songs),
        created_at=playlist.created_at,
        songs=songs,
    )


@router.post("/", response_model=PlaylistResponse)
async def create_playlist(data: PlaylistCreate, db: AsyncSession = Depends(get_db)):
    """Create a new playlist."""
    playlist = await dao.create_playlist(db, name=data.name, description=data.description)
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        cover_path=playlist.cover_path,
        is_default=playlist.is_default,
        song_count=0,
        created_at=playlist.created_at,
    )


@router.post("/{playlist_id}/songs/{song_id}", response_model=MessageResponse)
async def add_to_playlist(playlist_id: str, song_id: str, db: AsyncSession = Depends(get_db)):
    """Add a song to a playlist."""
    ps = await dao.add_song_to_playlist(db, playlist_id, song_id)
    if not ps:
        raise HTTPException(status_code=404, detail="Playlist or song not found")
    return MessageResponse(message="Song added to playlist")


@router.delete("/{playlist_id}/songs/{song_id}", response_model=MessageResponse)
async def remove_from_playlist(playlist_id: str, song_id: str, db: AsyncSession = Depends(get_db)):
    """Remove a song from a playlist."""
    removed = await dao.remove_song_from_playlist(db, playlist_id, song_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Song not in playlist")
    return MessageResponse(message="Song removed from playlist")
