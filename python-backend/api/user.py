from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db import dao
from api.schemas import UserUpdate, UserResponse

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Get current user profile."""
    return await dao.get_or_create_default_user(db)


@router.put("/me", response_model=UserResponse)
async def update_current_user(data: UserUpdate, db: AsyncSession = Depends(get_db)):
    """Update current user profile."""
    user = await dao.get_or_create_default_user(db)
    updated = await dao.update_user(db, user.id, **data.model_dump(exclude_unset=True))
    return updated
