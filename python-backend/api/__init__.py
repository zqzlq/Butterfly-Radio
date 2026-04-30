from fastapi import APIRouter

from .live import router as live_router
from .playlist import router as playlist_router
from .interaction import router as interaction_router
from .user import router as user_router
from .config import router as config_router
from .media import router as media_router
from .ai_control import router as ai_router

router = APIRouter()

router.include_router(live_router)
router.include_router(playlist_router)
router.include_router(interaction_router)
router.include_router(user_router)
router.include_router(config_router)
router.include_router(media_router)
router.include_router(ai_router)


@router.get("/status")
async def get_status():
    return {"status": "running", "version": "0.1.0"}
