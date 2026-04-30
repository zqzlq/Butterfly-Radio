import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class Song(Base):
    __tablename__ = "songs"

    id = Column(String(32), primary_key=True, default=gen_id)
    title = Column(String(255), nullable=False, index=True)
    artist = Column(String(255), nullable=False, default="Unknown")
    album = Column(String(255), nullable=True)
    file_path = Column(String(1024), nullable=False, unique=True)
    file_format = Column(String(16), nullable=False, default="mp3")
    duration = Column(Float, nullable=False, default=0.0)
    cover_path = Column(String(1024), nullable=True)
    tags = Column(JSON, nullable=True)
    is_favorited = Column(Boolean, default=False)
    play_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    playlist_songs = relationship("PlaylistSong", back_populates="song", cascade="all, delete-orphan")


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String(32), primary_key=True, default=gen_id)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cover_path = Column(String(1024), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    songs = relationship("PlaylistSong", back_populates="playlist", cascade="all, delete-orphan")


class PlaylistSong(Base):
    __tablename__ = "playlist_songs"

    id = Column(String(32), primary_key=True, default=gen_id)
    playlist_id = Column(String(32), ForeignKey("playlists.id"), nullable=False)
    song_id = Column(String(32), ForeignKey("songs.id"), nullable=False)
    sort_order = Column(Integer, default=0)

    playlist = relationship("Playlist", back_populates="songs")
    song = relationship("Song", back_populates="playlist_songs")


class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=gen_id)
    nickname = Column(String(64), nullable=False, default="听众")
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    interactions = relationship("Interaction", back_populates="user")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String(32), primary_key=True, default=gen_id)
    user_id = Column(String(32), ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    interaction_type = Column(String(32), nullable=False, default="message")  # message, song_request, command
    extra_data = Column(JSON, nullable=True)  # extra data like song name for requests
    ai_response = Column(Text, nullable=True)
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="interactions")


class BroadcastState(Base):
    """Tracks the live broadcast state."""
    __tablename__ = "broadcast_state"

    id = Column(String(32), primary_key=True, default=gen_id)
    is_live = Column(Boolean, default=False)
    current_song_id = Column(String(32), ForeignKey("songs.id"), nullable=True)
    current_position = Column(Float, default=0.0)
    queue = Column(JSON, nullable=True)  # ordered list of song IDs
    queue_index = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(32), default="string")  # string, int, float, bool, json
    description = Column(String(512), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
