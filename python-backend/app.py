from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from loguru import logger

from db.database import init_db, async_session
from api import router as api_router
from core.realtime_comm import sio
from service.playlist_service import scan_default_music
from db import dao


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized.")

    # Initialize default configs
    async with async_session() as db:
        # Scan default music directory
        songs = await scan_default_music(db)
        if songs:
            logger.info(f"Loaded {len(songs)} default songs")

        # Init default system configs
        from api.config import DEFAULT_CONFIGS
        for key, (value, value_type, description) in DEFAULT_CONFIGS.items():
            existing = await dao.get_config(db, key)
            if existing is None:
                await dao.set_config(db, key=key, value=value, value_type=value_type, description=description)
        logger.info("Default configs initialized")

    logger.info("Butterfly Radio backend ready.")
    yield
    # Shutdown
    from core.broadcast_scheduler import broadcast_scheduler
    broadcast_scheduler.shutdown()
    logger.info("Cleaning up resources...")


def create_app():
    """Create and configure the FastAPI application with Socket.IO."""
    fastapi_app = FastAPI(
        title="Butterfly Radio",
        description="Local AI Radio Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS - allow Electron frontend
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routes
    fastapi_app.include_router(api_router, prefix="/api")

    # Health check
    @fastapi_app.get("/health")
    async def health():
        return {"status": "ok", "service": "butterfly-radio"}

    # Wrap with Socket.IO ASGI app
    asgi_app = socketio.ASGIApp(sio, other_app=fastapi_app)

    return asgi_app
