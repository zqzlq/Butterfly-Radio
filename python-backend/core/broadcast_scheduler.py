from datetime import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from db import dao
from core.realtime_comm import emit_playback_state, emit_song_change, emit_broadcast_status


class BroadcastScheduler:
    """Manages the live broadcast timeline, queue, and playback scheduling."""

    def __init__(self):
        self._is_running = False
        self._playback_task = None

    async def start(self, db: AsyncSession, song_id: str = None):
        """Start or resume the broadcast."""
        state = await dao.get_broadcast_state(db)

        if song_id:
            # Play specific song
            song = await dao.get_song(db, song_id)
            if not song:
                logger.warning(f"Song {song_id} not found")
                return
            await dao.update_broadcast_state(
                db,
                is_live=True,
                current_song_id=song_id,
                current_position=0.0,
                started_at=datetime.utcnow(),
            )
            await emit_song_change({
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "duration": song.duration,
                "cover_path": song.cover_path,
            })
        else:
            # Resume or start from queue
            if not state.queue or len(state.queue) == 0:
                # Auto-fill queue from all songs
                songs = await dao.get_all_songs(db)
                if not songs:
                    logger.warning("No songs available for broadcast")
                    return
                queue_ids = [s.id for s in songs]
                await dao.update_broadcast_state(
                    db,
                    is_live=True,
                    queue=queue_ids,
                    queue_index=0,
                    current_song_id=queue_ids[0],
                    current_position=0.0,
                    started_at=datetime.utcnow(),
                )
                song = songs[0]
                await emit_song_change({
                    "id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "album": song.album,
                    "duration": song.duration,
                    "cover_path": song.cover_path,
                })
            else:
                await dao.update_broadcast_state(db, is_live=True, started_at=datetime.utcnow())

        self._is_running = True
        await emit_broadcast_status(True)
        logger.info("Broadcast started")

    async def stop(self, db: AsyncSession):
        """Stop the broadcast."""
        self._is_running = False
        await dao.update_broadcast_state(db, is_live=False)
        await emit_broadcast_status(False)
        logger.info("Broadcast stopped")

    async def pause(self, db: AsyncSession):
        """Pause playback."""
        self._is_running = False
        await emit_playback_state({"is_playing": False})
        logger.info("Playback paused")

    async def skip(self, db: AsyncSession):
        """Skip to next song in queue."""
        state = await dao.get_broadcast_state(db)
        if not state.queue or len(state.queue) == 0:
            return

        next_index = state.queue_index + 1
        if next_index >= len(state.queue):
            next_index = 0  # Loop back

        next_song_id = state.queue[next_index]
        song = await dao.get_song(db, next_song_id)
        if not song:
            return

        await dao.update_broadcast_state(
            db,
            current_song_id=next_song_id,
            current_position=0.0,
            queue_index=next_index,
        )

        # Increment play count
        await dao.update_song(db, next_song_id, play_count=song.play_count + 1)

        await emit_song_change({
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "duration": song.duration,
            "cover_path": song.cover_path,
        })
        logger.info(f"Skipped to: {song.title}")

    async def prev(self, db: AsyncSession):
        """Go to previous song in queue."""
        state = await dao.get_broadcast_state(db)
        if not state.queue or len(state.queue) == 0:
            return

        prev_index = state.queue_index - 1
        if prev_index < 0:
            prev_index = len(state.queue) - 1

        prev_song_id = state.queue[prev_index]
        song = await dao.get_song(db, prev_song_id)
        if not song:
            return

        await dao.update_broadcast_state(
            db,
            current_song_id=prev_song_id,
            current_position=0.0,
            queue_index=prev_index,
        )

        await emit_song_change({
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "duration": song.duration,
            "cover_path": song.cover_path,
        })
        logger.info(f"Went back to: {song.title}")


# Singleton instance
broadcast_scheduler = BroadcastScheduler()
