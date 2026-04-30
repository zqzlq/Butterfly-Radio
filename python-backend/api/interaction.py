from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from api.schemas import InteractionCreate, InteractionResponse, MessageResponse

router = APIRouter(prefix="/interaction", tags=["interaction"])


@router.get("/", response_model=list[InteractionResponse])
async def list_interactions(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get recent interactions."""
    return await dao.get_recent_interactions(db, limit=limit)


@router.post("/", response_model=InteractionResponse)
async def send_interaction(data: InteractionCreate, db: AsyncSession = Depends(get_db)):
    """Send a user interaction (message, song request, etc.)."""
    user = await dao.get_or_create_default_user(db)
    interaction = await dao.create_interaction(
        db,
        user_id=user.id,
        content=data.content,
        interaction_type=data.interaction_type,
        metadata=data.metadata,
    )

    # Trigger AI response for song requests
    if data.interaction_type == "song_request":
        from service.interaction_service import handle_song_request
        await handle_song_request(db, interaction)

    return interaction


@router.post("/{interaction_id}/replay", response_model=MessageResponse)
async def replay_commentary(interaction_id: str, db: AsyncSession = Depends(get_db)):
    """Replay the AI commentary for an interaction."""
    from core.realtime_comm import sio
    interaction = await dao.get_recent_interactions(db, limit=100)
    target = next((i for i in interaction if i.id == interaction_id), None)
    if target and target.ai_response:
        await sio.emit("ai_commentary", {
            "id": target.id,
            "content": target.ai_response,
            "replay": True,
        })
        return MessageResponse(message="Replaying commentary")
    return MessageResponse(message="No commentary found", success=False)
