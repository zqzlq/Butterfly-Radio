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
    from core.realtime_comm import emit_interaction, emit_ai_commentary

    user = await dao.get_or_create_default_user(db)
    interaction = await dao.create_interaction(
        db,
        user_id=user.id,
        content=data.content,
        interaction_type=data.interaction_type,
        extra_data=data.extra_data,
    )

    # Broadcast interaction to all clients
    await emit_interaction({
        "id": interaction.id,
        "content": interaction.content,
        "interaction_type": interaction.interaction_type,
        "extra_data": interaction.extra_data,
        "created_at": str(interaction.created_at),
    })

    # Handle different interaction types
    if data.interaction_type == "song_request":
        from service.interaction_service import handle_song_request
        await handle_song_request(db, interaction)

        if interaction.ai_response:
            from ai.llm_engine import llm_engine
            await emit_ai_commentary({
                "id": f"resp_{interaction.id}",
                "content": interaction.ai_response,
                "context": "song_request",
                "host_name": llm_engine.get_host_info()["name"],
            })
    elif data.interaction_type == "message":
        # Generate AI commentary for regular messages
        from ai.host_engine import host_engine
        user = await dao.get_or_create_default_user(db)
        result = await host_engine.handle_user_message(user.nickname, data.content)
        if result:
            await dao.mark_interaction_processed(db, interaction.id, result["content"])

    return interaction


@router.post("/{interaction_id}/replay", response_model=MessageResponse)
async def replay_commentary(interaction_id: str, db: AsyncSession = Depends(get_db)):
    """Replay the AI commentary for an interaction."""
    from core.realtime_comm import emit_ai_commentary
    interactions = await dao.get_recent_interactions(db, limit=100)
    target = next((i for i in interactions if i.id == interaction_id), None)
    if target and target.ai_response:
        await emit_ai_commentary({
            "id": target.id,
            "content": target.ai_response,
            "replay": True,
        })
        return MessageResponse(message="Replaying commentary")
    return MessageResponse(message="No commentary found", success=False)
