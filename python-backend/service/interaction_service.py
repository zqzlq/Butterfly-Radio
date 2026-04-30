from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from db import dao
from db.models import Interaction


async def handle_song_request(db: AsyncSession, interaction: Interaction):
    """Handle a song request from a user."""
    # Parse song name from content
    content = interaction.content.strip()
    if content.startswith("/点歌"):
        song_name = content.replace("/点歌", "").strip()
    else:
        song_name = content

    if not song_name:
        return

    # Search for the song
    songs = await dao.search_songs(db, song_name)
    if songs:
        # Found — add to queue
        state = await dao.get_broadcast_state(db)
        queue = state.queue or []
        queue.append(songs[0].id)
        await dao.update_broadcast_state(db, queue=queue)

        # Mark interaction as processed
        response = f"收到点歌请求！已将「{songs[0].title}」加入播放队列。"
        await dao.mark_interaction_processed(db, interaction.id, response)
        logger.info(f"Song request: {songs[0].title} added to queue")
    else:
        response = f"抱歉，没有找到「{song_name}」相关的歌曲。"
        await dao.mark_interaction_processed(db, interaction.id, response)
        logger.info(f"Song request not found: {song_name}")
