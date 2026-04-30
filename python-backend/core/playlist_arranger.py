import random
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from db import dao


class PlaylistArranger:
    """Handles automatic playlist arrangement and queue management."""

    async def build_queue(
        self,
        db: AsyncSession,
        playlist_id: Optional[str] = None,
        mode: str = "shuffle",
    ) -> list[str]:
        """
        Build a playback queue.
        Modes: shuffle, sequential, smart
        """
        if playlist_id:
            playlist = await dao.get_playlist_with_songs(db, playlist_id)
            if not playlist:
                return []
            songs = [ps.song for ps in playlist.songs]
        else:
            songs = await dao.get_all_songs(db)

        if not songs:
            return []

        song_ids = [s.id for s in songs]

        if mode == "shuffle":
            random.shuffle(song_ids)
        elif mode == "smart":
            song_ids = await self._smart_arrange(db, songs)
        # sequential = keep original order

        logger.info(f"Built queue ({mode}): {len(song_ids)} songs")
        return song_ids

    async def _smart_arrange(self, db: AsyncSession, songs: list) -> list[str]:
        """
        Smart arrangement: interleave high-play-count songs with low-play-count,
        avoid same artist back-to-back, favor recently unplayed songs.
        """
        # Sort by play count (ascending) to prioritize less-played songs
        sorted_songs = sorted(songs, key=lambda s: s.play_count)

        result = []
        remaining = list(sorted_songs)

        while remaining:
            # Pick from the less-played half, preferring different artist from last
            half = max(1, len(remaining) // 2)
            candidates = remaining[:half]

            if result:
                last_artist = None
                for s in songs:
                    if s.id == result[-1]:
                        last_artist = s.artist
                        break

                # Prefer different artist
                different_artist = [s for s in candidates if s.artist != last_artist]
                if different_artist:
                    candidates = different_artist

            chosen = random.choice(candidates)
            result.append(chosen.id)
            remaining = [s for s in remaining if s.id != chosen.id]

        return result

    async def auto_fill_queue(self, db: AsyncSession) -> list[str]:
        """Auto-fill queue with all available songs (shuffle mode)."""
        return await self.build_queue(db, mode="shuffle")

    async def get_next_song_id(self, db: AsyncSession, current_index: int, queue: list[str]) -> Optional[str]:
        """Get the next song ID in the queue, looping if at the end."""
        if not queue:
            return None
        next_index = (current_index + 1) % len(queue)
        return queue[next_index]

    async def get_prev_song_id(self, db: AsyncSession, current_index: int, queue: list[str]) -> Optional[str]:
        """Get the previous song ID in the queue, looping if at the start."""
        if not queue:
            return None
        prev_index = (current_index - 1) % len(queue)
        return queue[prev_index]


# Singleton
playlist_arranger = PlaylistArranger()
