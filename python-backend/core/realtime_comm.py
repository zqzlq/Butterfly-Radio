import socketio
from loguru import logger

# Create Socket.IO async server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ, auth):
    logger.info(f"[Socket.IO] Client connected: {sid}")
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"[Socket.IO] Client disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    room = data.get("room", "default")
    sio.enter_room(sid, room)
    logger.info(f"[Socket.IO] {sid} joined room: {room}")


@sio.event
async def leave_room(sid, data):
    room = data.get("room", "default")
    sio.leave_room(sid, room)


# ─── Outbound event helpers ───

async def emit_playback_state(state: dict):
    """Emit current playback state to all clients."""
    await sio.emit("playback_state", state)


async def emit_song_change(song: dict):
    """Emit song change event."""
    await sio.emit("song_change", song)


async def emit_ai_commentary(data: dict):
    """Emit AI commentary bubble."""
    await sio.emit("ai_commentary", data)


async def emit_interaction(data: dict):
    """Emit user interaction to all clients."""
    await sio.emit("interaction", data)


async def emit_queue_update(queue: list[dict]):
    """Emit updated queue."""
    await sio.emit("queue_update", {"queue": queue})


async def emit_broadcast_status(is_live: bool):
    """Emit broadcast status change."""
    await sio.emit("broadcast_status", {"is_live": is_live})
