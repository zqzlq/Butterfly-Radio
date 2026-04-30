from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ─── Song ───

class SongCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    artist: str = Field(default="Unknown", max_length=255)
    album: Optional[str] = None
    file_path: str
    file_format: str = Field(default="mp3")
    duration: float = Field(default=0.0, ge=0)
    cover_path: Optional[str] = None
    tags: Optional[list[str]] = None


class SongUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    tags: Optional[list[str]] = None


class SongResponse(BaseModel):
    id: str
    title: str
    artist: str
    album: Optional[str]
    file_path: str
    file_format: str
    duration: float
    cover_path: Optional[str]
    tags: Optional[list[str]]
    is_favorited: bool
    play_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Playlist ───

class PlaylistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class PlaylistResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    cover_path: Optional[str]
    is_default: bool
    song_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class PlaylistDetailResponse(PlaylistResponse):
    songs: list[SongResponse] = []


# ─── User ───

class UserUpdate(BaseModel):
    nickname: Optional[str] = Field(None, max_length=64)
    avatar: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    nickname: str
    avatar: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Interaction ───

class InteractionCreate(BaseModel):
    content: str = Field(..., min_length=1)
    interaction_type: str = Field(default="message")
    extra_data: Optional[dict] = None


class InteractionResponse(BaseModel):
    id: str
    user_id: Optional[str]
    content: str
    interaction_type: str
    extra_data: Optional[dict]
    ai_response: Optional[str]
    is_processed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Broadcast ───

class BroadcastStateResponse(BaseModel):
    is_live: bool
    current_song: Optional[SongResponse] = None
    current_position: float
    queue: list[SongResponse] = []
    queue_index: int
    started_at: Optional[datetime]


class PlayCommand(BaseModel):
    song_id: Optional[str] = None
    action: str = Field(default="play")  # play, pause, skip, prev


# ─── System Config ───

class ConfigUpdate(BaseModel):
    key: str
    value: str
    value_type: str = "string"
    description: Optional[str] = None


class ConfigResponse(BaseModel):
    configs: dict[str, str]


# ─── Common ───

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
