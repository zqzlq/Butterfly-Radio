from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from api.schemas import ConfigUpdate, ConfigResponse, MessageResponse

router = APIRouter(prefix="/config", tags=["config"])

# Default configs
DEFAULT_CONFIGS = {
    "ai_mode": ("local_lightweight", "string", "AI mode: local_lightweight, local_highquality, cloud_api"),
    "llm_model": ("qwen3-1.7b-4bit", "string", "LLM model name"),
    "tts_model": ("chattts-light", "string", "TTS model name"),
    "tts_speed": ("1.0", "float", "TTS playback speed"),
    "host_style": ("warm", "string", "AI host personality style"),
    "auto_play": ("true", "bool", "Auto-start playback on launch"),
    "crossfade_duration": ("3.0", "float", "Crossfade duration in seconds"),
    "theme": ("default", "string", "UI theme name"),
    "cloud_api_key": ("", "string", "Cloud API key"),
    "cloud_api_provider": ("doubao", "string", "Cloud API provider: doubao, qwen"),
}


@router.get("/", response_model=ConfigResponse)
async def get_configs(db: AsyncSession = Depends(get_db)):
    """Get all system configurations."""
    configs = await dao.get_all_configs(db)
    # Fill in defaults for missing keys
    for key, (default_val, _, _) in DEFAULT_CONFIGS.items():
        if key not in configs:
            configs[key] = default_val
    return ConfigResponse(configs=configs)


@router.put("/", response_model=MessageResponse)
async def update_config(data: ConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Update a system configuration."""
    await dao.set_config(
        db,
        key=data.key,
        value=data.value,
        value_type=data.value_type,
        description=data.description,
    )
    return MessageResponse(message=f"Config '{data.key}' updated")


@router.post("/init", response_model=MessageResponse)
async def init_default_configs(db: AsyncSession = Depends(get_db)):
    """Initialize default configurations if not present."""
    for key, (value, value_type, description) in DEFAULT_CONFIGS.items():
        existing = await dao.get_config(db, key)
        if existing is None:
            await dao.set_config(db, key=key, value=value, value_type=value_type, description=description)
    return MessageResponse(message="Default configs initialized")
