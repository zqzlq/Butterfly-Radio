from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from api.schemas import BroadcastStateResponse, PlayCommand, SongResponse, MessageResponse

router = APIRouter(prefix="/live", tags=["live"])


@router.get("/state", response_model=BroadcastStateResponse)
async def get_broadcast_state(db: AsyncSession = Depends(get_db)):
    """Get current broadcast state."""
    state = await dao.get_broadcast_state(db)
    current_song = None
    if state.current_song_id:
        current_song = await dao.get_song(db, state.current_song_id)

    queue_songs = []
    if state.queue:
        for song_id in state.queue:
            song = await dao.get_song(db, song_id)
            if song:
                queue_songs.append(song)

    return BroadcastStateResponse(
        is_live=state.is_live,
        current_song=current_song,
        current_position=state.current_position,
        queue=queue_songs,
        queue_index=state.queue_index,
        started_at=state.started_at,
    )


@router.post("/play", response_model=MessageResponse)
async def play(command: PlayCommand, db: AsyncSession = Depends(get_db)):
    """Control playback: play, pause, skip, prev, resume."""
    from core.broadcast_scheduler import broadcast_scheduler

    if command.action == "play":
        await broadcast_scheduler.start(db, song_id=command.song_id)
    elif command.action == "pause":
        await broadcast_scheduler.pause(db)
    elif command.action == "resume":
        await broadcast_scheduler.resume(db)
    elif command.action == "skip":
        await broadcast_scheduler.skip(db)
    elif command.action == "prev":
        await broadcast_scheduler.prev(db)

    return MessageResponse(message=f"Action '{command.action}' executed")


@router.post("/start", response_model=MessageResponse)
async def start_broadcast(db: AsyncSession = Depends(get_db)):
    """Start the live broadcast."""
    from core.broadcast_scheduler import broadcast_scheduler
    await broadcast_scheduler.start(db)
    return MessageResponse(message="Broadcast started")


@router.post("/stop", response_model=MessageResponse)
async def stop_broadcast(db: AsyncSession = Depends(get_db)):
    """Stop the live broadcast."""
    from core.broadcast_scheduler import broadcast_scheduler
    await broadcast_scheduler.stop(db)
    return MessageResponse(message="Broadcast stopped")


@router.post("/queue/rebuild", response_model=MessageResponse)
async def rebuild_queue(mode: str = "shuffle", db: AsyncSession = Depends(get_db)):
    """Rebuild the playback queue."""
    from core.broadcast_scheduler import broadcast_scheduler
    await broadcast_scheduler.rebuild_queue(db, mode=mode)
    return MessageResponse(message=f"Queue rebuilt ({mode})")


@router.post("/queue/set", response_model=MessageResponse)
async def set_queue(song_ids: list[str], db: AsyncSession = Depends(get_db)):
    """Replace the current queue with given song IDs."""
    from core.broadcast_scheduler import broadcast_scheduler
    await broadcast_scheduler.set_queue(db, song_ids)
    return MessageResponse(message=f"Queue set with {len(song_ids)} songs")
