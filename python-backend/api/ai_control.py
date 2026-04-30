from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from api.schemas import MessageResponse

router = APIRouter(prefix="/ai", tags=["ai"])


class AIConfigUpdate(BaseModel):
    mode: str = Field(default=None, description="AI mode: local_lightweight, local_highquality, cloud_api")
    host_style: str = Field(default=None, description="Host style: warm, rock, literary, news, cure")
    tts_speed: float = Field(default=None, ge=0.5, le=2.0)
    cloud_provider: str = Field(default=None)
    cloud_api_key: str = Field(default=None)


class CommentaryRequest(BaseModel):
    context: str = Field(default="greeting", description="Commentary context")
    song_id: str = Field(default=None)
    user_message: str = Field(default=None)


@router.get("/host", response_model=dict)
async def get_host_info():
    """Get current AI host info."""
    from ai.llm_engine import llm_engine
    from ai.tts_engine import tts_engine
    return {
        "host": llm_engine.get_host_info(),
        "mode": llm_engine._mode,
        "tts_speed": tts_engine._speed,
    }


@router.put("/config", response_model=MessageResponse)
async def update_ai_config(data: AIConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Update AI configuration."""
    from ai.host_engine import host_engine
    from ai.llm_engine import llm_engine

    config_updates = {}
    if data.mode:
        config_updates["ai_mode"] = data.mode
    if data.host_style:
        config_updates["host_style"] = data.host_style
    if data.tts_speed:
        config_updates["tts_speed"] = str(data.tts_speed)
    if data.cloud_provider:
        config_updates["cloud_api_provider"] = data.cloud_provider
        llm_engine.set_cloud_config(data.cloud_provider, data.cloud_api_key or "")
    if data.cloud_api_key:
        config_updates["cloud_api_key"] = data.cloud_api_key

    # Save to DB
    for key, value in config_updates.items():
        await dao.set_config(db, key=key, value=value)

    # Apply configuration
    host_engine.configure(
        ai_mode=data.mode,
        host_style=data.host_style,
        tts_speed=data.tts_speed,
    )

    return MessageResponse(message="AI 配置已更新")


@router.post("/commentary", response_model=dict)
async def generate_commentary(req: CommentaryRequest, db: AsyncSession = Depends(get_db)):
    """Manually trigger AI commentary generation."""
    from ai.host_engine import host_engine

    song_info = None
    if req.song_id:
        song = await dao.get_song(db, req.song_id)
        if song:
            song_info = {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
            }

    if req.context == "greeting":
        result = await host_engine.generate_greeting()
    elif req.context == "song_intro" and song_info:
        result = await host_engine.generate_song_intro(song_info)
    elif req.context == "song_review" and song_info:
        result = await host_engine.generate_song_review(song_info)
    elif req.context == "chat_response":
        result = await host_engine.handle_user_message("听众", req.user_message or "你好")
    else:
        result = await host_engine.generate_greeting()

    return result or {"error": "口播生成失败"}


@router.get("/presets", response_model=dict)
async def get_host_presets():
    """Get all available host personality presets."""
    from ai.llm_engine import HOST_PRESETS
    return {
        name: {"name": preset["name"], "style": name}
        for name, preset in HOST_PRESETS.items()
    }
