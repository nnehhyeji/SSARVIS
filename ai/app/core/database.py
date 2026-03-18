from datetime import datetime, timezone

from sqlalchemy import DateTime, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config.database import database_config


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


engine = create_async_engine(database_config.database_url)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_database() -> None:
    from app.domains.chat.model import ChatMessage  # noqa: F401
    from app.domains.prompt.model import Prompt  # noqa: F401
    from app.domains.voice.model import Voice  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _apply_legacy_conversation_migrations(conn)


async def _apply_legacy_conversation_migrations(conn) -> None:
    # Temporary compatibility patch for older local SQLite files until
    # a proper migration tool is introduced for managed deployments.
    try:
        result = await conn.execute(text("PRAGMA table_info(conversations)"))
        columns = {row[1] for row in result.fetchall()}

        if "tts_file_name" not in columns:
            await conn.execute(
                text("ALTER TABLE conversations ADD COLUMN tts_file_name TEXT")
            )
        if "tts_s3_object_key" not in columns:
            await conn.execute(
                text("ALTER TABLE conversations ADD COLUMN tts_s3_object_key TEXT")
            )
    except (OperationalError, ProgrammingError):
        return
