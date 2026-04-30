from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Song, Playlist, PlaylistSong, User, Interaction, BroadcastState, SystemConfig


# ─── Song ───

async def get_song(db: AsyncSession, song_id: str) -> Optional[Song]:
    result = await db.execute(select(Song).where(Song.id == song_id))
    return result.scalar_one_or_none()


async def get_all_songs(db: AsyncSession, favorited_only: bool = False) -> list[Song]:
    stmt = select(Song)
    if favorited_only:
        stmt = stmt.where(Song.is_favorited == True)
    stmt = stmt.order_by(Song.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def search_songs(db: AsyncSession, keyword: str) -> list[Song]:
    stmt = select(Song).where(
        (Song.title.ilike(f"%{keyword}%")) | (Song.artist.ilike(f"%{keyword}%"))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_song(db: AsyncSession, **kwargs) -> Song:
    song = Song(**kwargs)
    db.add(song)
    await db.commit()
    await db.refresh(song)
    return song


async def update_song(db: AsyncSession, song_id: str, **kwargs) -> Optional[Song]:
    song = await get_song(db, song_id)
    if not song:
        return None
    for k, v in kwargs.items():
        if hasattr(song, k):
            setattr(song, k, v)
    await db.commit()
    await db.refresh(song)
    return song


async def delete_song(db: AsyncSession, song_id: str) -> bool:
    song = await get_song(db, song_id)
    if not song:
        return False
    await db.delete(song)
    await db.commit()
    return True


async def toggle_favorite(db: AsyncSession, song_id: str) -> Optional[Song]:
    song = await get_song(db, song_id)
    if not song:
        return None
    song.is_favorited = not song.is_favorited
    await db.commit()
    await db.refresh(song)
    return song


# ─── Playlist ───

async def get_all_playlists(db: AsyncSession) -> list[Playlist]:
    result = await db.execute(select(Playlist).order_by(Playlist.created_at.desc()))
    return list(result.scalars().all())


async def get_playlist_with_songs(db: AsyncSession, playlist_id: str) -> Optional[Playlist]:
    result = await db.execute(
        select(Playlist)
        .options(selectinload(Playlist.songs).selectinload(PlaylistSong.song))
        .where(Playlist.id == playlist_id)
    )
    return result.scalar_one_or_none()


async def create_playlist(db: AsyncSession, name: str, description: str = None) -> Playlist:
    playlist = Playlist(name=name, description=description)
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return playlist


async def add_song_to_playlist(db: AsyncSession, playlist_id: str, song_id: str) -> Optional[PlaylistSong]:
    # Get current max sort order
    result = await db.execute(
        select(func.max(PlaylistSong.sort_order)).where(PlaylistSong.playlist_id == playlist_id)
    )
    max_order = result.scalar() or 0

    ps = PlaylistSong(playlist_id=playlist_id, song_id=song_id, sort_order=max_order + 1)
    db.add(ps)
    await db.commit()
    await db.refresh(ps)
    return ps


async def remove_song_from_playlist(db: AsyncSession, playlist_id: str, song_id: str) -> bool:
    result = await db.execute(
        select(PlaylistSong).where(
            PlaylistSong.playlist_id == playlist_id,
            PlaylistSong.song_id == song_id,
        )
    )
    ps = result.scalar_one_or_none()
    if not ps:
        return False
    await db.delete(ps)
    await db.commit()
    return True


# ─── User ───

async def get_or_create_default_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.is_active == True).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        user = User(nickname="听众")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user_id: str, **kwargs) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for k, v in kwargs.items():
        if hasattr(user, k):
            setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


# ─── Interaction ───

async def create_interaction(db: AsyncSession, **kwargs) -> Interaction:
    interaction = Interaction(**kwargs)
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return interaction


async def get_recent_interactions(db: AsyncSession, limit: int = 20) -> list[Interaction]:
    result = await db.execute(
        select(Interaction).order_by(Interaction.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def mark_interaction_processed(db: AsyncSession, interaction_id: str, ai_response: str) -> Optional[Interaction]:
    result = await db.execute(select(Interaction).where(Interaction.id == interaction_id))
    interaction = result.scalar_one_or_none()
    if not interaction:
        return None
    interaction.is_processed = True
    interaction.ai_response = ai_response
    await db.commit()
    await db.refresh(interaction)
    return interaction


# ─── BroadcastState ───

async def get_broadcast_state(db: AsyncSession) -> BroadcastState:
    result = await db.execute(select(BroadcastState).limit(1))
    state = result.scalar_one_or_none()
    if not state:
        state = BroadcastState(is_live=False, queue=[])
        db.add(state)
        await db.commit()
        await db.refresh(state)
    return state


async def update_broadcast_state(db: AsyncSession, **kwargs) -> BroadcastState:
    state = await get_broadcast_state(db)
    for k, v in kwargs.items():
        if hasattr(state, k):
            setattr(state, k, v)
    await db.commit()
    await db.refresh(state)
    return state


# ─── SystemConfig ───

async def get_config(db: AsyncSession, key: str) -> Optional[str]:
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    return config.value if config else None


async def set_config(db: AsyncSession, key: str, value: str, value_type: str = "string", description: str = None) -> SystemConfig:
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if config:
        config.value = value
        config.value_type = value_type
    else:
        config = SystemConfig(key=key, value=value, value_type=value_type, description=description)
        db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def get_all_configs(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(SystemConfig))
    configs = result.scalars().all()
    return {c.key: c.value for c in configs}
