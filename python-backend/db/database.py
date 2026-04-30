import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase


def _get_db_path() -> str:
    """Resolve database path — next to executable in bundled mode, CWD in dev."""
    if getattr(sys, "frozen", False):
        # Bundled: store DB next to the executable so it persists
        db_dir = Path(sys.executable).parent
    else:
        db_dir = Path(".")
    db_dir.mkdir(parents=True, exist_ok=True)
    return str(db_dir / "butterfly_radio.db")


DATABASE_URL = f"sqlite+aiosqlite:///{_get_db_path()}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
