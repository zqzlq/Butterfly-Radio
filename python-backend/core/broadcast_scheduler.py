import time
import asyncio
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from db import dao
from db.database import async_session
from core.realtime_comm import (
    emit_playback_state, emit_song_change, emit_broadcast_status, emit_queue_update
)
from core.playlist_arranger import playlist_arranger


def _song_to_dict(song) -> dict:
    """Convert a Song ORM object to a dict for Socket.IO emission."""
    return {
        "id": song.id,
        "title": song.title,
        "artist": song.artist,
        "album": song.album,
        "duration": song.duration,
        "cover_path": song.cover_path,
        "is_favorited": song.is_favorited,
        "play_count": song.play_count,
    }


class BroadcastScheduler:
    """
    Manages the live broadcast timeline, queue, and playback scheduling.
    Uses APScheduler for precise timeline control and periodic progress sync.
    """

    def __init__(self):
        self._is_running = False
        self._is_paused = False
        self._scheduler: Optional[AsyncIOScheduler] = None
        self._current_song_start_time: float = 0
        self._current_song_duration: float = 0
        self._progress_offset: float = 0

    def _ensure_scheduler(self) -> AsyncIOScheduler:
        if self._scheduler is None:
            self._scheduler = AsyncIOScheduler()
            self._scheduler.start()
            logger.info("APScheduler initialized")
        return self._scheduler

    def _start_progress_sync(self, song_duration: float):
        scheduler = self._ensure_scheduler()
        try:
            scheduler.remove_job("progress_sync")
        except Exception:
            pass
        self._current_song_start_time = time.time()
        self._current_song_duration = song_duration
        scheduler.add_job(
            self._sync_progress,
            trigger=IntervalTrigger(seconds=1),
            id="progress_sync",
            replace_existing=True,
        )

    def _stop_progress_sync(self):
        if self._scheduler:
            try:
                self._scheduler.remove_job("progress_sync")
            except Exception:
                pass

    async def _sync_progress(self):
        if not self._is_running or self._is_paused:
            return
        elapsed = time.time() - self._current_song_start_time + self._progress_offset
        duration = self._current_song_duration
        if duration > 0 and elapsed >= duration:
            await self._auto_advance()
            return
        await emit_playback_state({
            "is_playing": True,
            "current_time": elapsed,
            "duration": duration,
        })

    async def _auto_advance(self):
        self._stop_progress_sync()
        async with async_session() as db:
            state = await dao.get_broadcast_state(db)
            if not state.queue or not self._is_running:
                return

            next_index = state.queue_index + 1
            if next_index >= len(state.queue):
                new_queue = await playlist_arranger.auto_fill_queue(db)
                if not new_queue:
                    logger.warning("No songs to continue broadcast")
                    await self.stop(db)
                    return
                await dao.update_broadcast_state(db, queue=new_queue, queue_index=0)
                next_index = 0
                next_song_id = new_queue[0]
            else:
                next_song_id = state.queue[next_index]

            song = await dao.get_song(db, next_song_id)
            if not song:
                return

            await dao.update_broadcast_state(
                db, current_song_id=next_song_id, current_position=0.0, queue_index=next_index,
            )
            await dao.update_song(db, next_song_id, play_count=song.play_count + 1)

            self._progress_offset = 0
            self._start_progress_sync(song.duration)
            await emit_song_change(_song_to_dict(song))
            logger.info(f"Auto-advanced to: {song.title}")

    async def start(self, db: AsyncSession, song_id: str = None):
        state = await dao.get_broadcast_state(db)

        if song_id:
            song = await dao.get_song(db, song_id)
            if not song:
                logger.warning(f"Song {song_id} not found")
                return
            await dao.update_broadcast_state(
                db, is_live=True, current_song_id=song_id, current_position=0.0, started_at=datetime.utcnow(),
            )
            self._progress_offset = 0
            self._start_progress_sync(song.duration)
            await emit_song_change(_song_to_dict(song))
        else:
            if not state.queue or len(state.queue) == 0:
                new_queue = await playlist_arranger.auto_fill_queue(db)
                if not new_queue:
                    logger.warning("No songs available for broadcast")
                    return
                await dao.update_broadcast_state(
                    db, is_live=True, queue=new_queue, queue_index=0,
                    current_song_id=new_queue[0], current_position=0.0, started_at=datetime.utcnow(),
                )
                song = await dao.get_song(db, new_queue[0])
                if song:
                    self._progress_offset = 0
                    self._start_progress_sync(song.duration)
                    await emit_song_change(_song_to_dict(song))
                    await emit_queue_update(await self._build_queue_info(db, new_queue))
            else:
                await dao.update_broadcast_state(db, is_live=True, started_at=datetime.utcnow())
                current_song = await dao.get_song(db, state.current_song_id) if state.current_song_id else None
                if current_song:
                    self._progress_offset = state.current_position
                    self._start_progress_sync(current_song.duration)
                    await emit_song_change(_song_to_dict(current_song))

        self._is_running = True
        self._is_paused = False
        await emit_broadcast_status(True)
        logger.info("Broadcast started")

    async def stop(self, db: AsyncSession):
        self._is_running = False
        self._is_paused = False
        self._stop_progress_sync()
        await dao.update_broadcast_state(db, is_live=False)
        await emit_broadcast_status(False)
        await emit_playback_state({"is_playing": False, "current_time": 0, "duration": 0})
        logger.info("Broadcast stopped")

    async def pause(self, db: AsyncSession):
        self._is_paused = True
        self._stop_progress_sync()
        current_pos = time.time() - self._current_song_start_time + self._progress_offset
        await dao.update_broadcast_state(db, current_position=current_pos)
        await emit_playback_state({"is_playing": False, "current_time": current_pos, "duration": self._current_song_duration})
        logger.info(f"Playback paused at {current_pos:.1f}s")

    async def resume(self, db: AsyncSession):
        if not self._is_running:
            return
        state = await dao.get_broadcast_state(db)
        self._progress_offset = state.current_position
        self._is_paused = False
        self._start_progress_sync(self._current_song_duration)
        await emit_playback_state({"is_playing": True, "current_time": state.current_position, "duration": self._current_song_duration})
        logger.info(f"Playback resumed from {state.current_position:.1f}s")

    async def skip(self, db: AsyncSession):
        self._stop_progress_sync()
        state = await dao.get_broadcast_state(db)
        if not state.queue or len(state.queue) == 0:
            return
        next_index = state.queue_index + 1
        if next_index >= len(state.queue):
            next_index = 0
        next_song_id = state.queue[next_index]
        song = await dao.get_song(db, next_song_id)
        if not song:
            return
        await dao.update_broadcast_state(
            db, current_song_id=next_song_id, current_position=0.0, queue_index=next_index,
        )
        await dao.update_song(db, next_song_id, play_count=song.play_count + 1)
        self._progress_offset = 0
        self._is_paused = False
        self._start_progress_sync(song.duration)
        await emit_song_change(_song_to_dict(song))
        logger.info(f"Skipped to: {song.title}")

    async def prev(self, db: AsyncSession):
        self._stop_progress_sync()
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
            db, current_song_id=prev_song_id, current_position=0.0, queue_index=prev_index,
        )
        self._progress_offset = 0
        self._is_paused = False
        self._start_progress_sync(song.duration)
        await emit_song_change(_song_to_dict(song))
        logger.info(f"Went back to: {song.title}")

    async def set_queue(self, db: AsyncSession, song_ids: list[str]):
        await dao.update_broadcast_state(db, queue=song_ids, queue_index=0)
        await emit_queue_update(await self._build_queue_info(db, song_ids))
        logger.info(f"Queue updated: {len(song_ids)} songs")

    async def rebuild_queue(self, db: AsyncSession, mode: str = "shuffle"):
        queue = await playlist_arranger.build_queue(db, mode=mode)
        await self.set_queue(db, queue)
        return queue

    async def _build_queue_info(self, db: AsyncSession, queue_ids: list[str]) -> list[dict]:
        result = []
        for song_id in queue_ids:
            song = await dao.get_song(db, song_id)
            if song:
                result.append(_song_to_dict(song))
        return result

    def shutdown(self):
        self._stop_progress_sync()
        if self._scheduler:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None


# Singleton instance
broadcast_scheduler = BroadcastScheduler()
