import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, Response
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base
from app.domains.voice.model import Voice  # noqa: F401
from app.domains.voice.router import create_voices, delete_voice, list_voices
from app.domains.voice.schema import VoiceCreateItem


class VoiceRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        temp_file.close()
        self.db_path = Path(temp_file.name)
        self.engine = create_async_engine(
            f"sqlite+aiosqlite:///{self.db_path.as_posix()}",
            future=True,
        )
        self.session_factory = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
        )
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()
        if self.db_path.exists():
            self.db_path.unlink()

    async def test_create_and_list_voices(self) -> None:
        async with self.session_factory() as session:
            with patch(
                "app.domains.voice.router.dashscope_voice_client.create_voice_async",
                AsyncMock(return_value="voice-001"),
            ) as create_voice_mock:
                created = await create_voices(
                    body=[
                        VoiceCreateItem(
                            audio_uri="https://example.com/sample.wav",
                            audio_text="sample text",
                        )
                    ],
                    x_user_id=" user-1 ",
                    session=session,
                )

            self.assertEqual(len(created), 1)
            self.assertEqual(created[0].voice_id, "voice-001")
            self.assertEqual(created[0].file_name, "sample.wav")
            self.assertEqual(created[0].audio_text, "sample text")
            create_voice_mock.assert_awaited_once()

        async with self.session_factory() as session:
            listed = await list_voices(x_user_id="user-1", session=session)

        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0].voice_id, "voice-001")

    async def test_delete_voice_removes_saved_voice(self) -> None:
        async with self.session_factory() as session:
            with patch(
                "app.domains.voice.router.dashscope_voice_client.create_voice_async",
                AsyncMock(return_value="voice-002"),
            ):
                await create_voices(
                    body=[
                        VoiceCreateItem(
                            audio_uri="data:audio/wav;base64,ZmFrZQ==",
                            audio_text="sample text",
                        )
                    ],
                    x_user_id="user-2",
                    session=session,
                )

        async with self.session_factory() as session:
            with patch(
                "app.domains.voice.router.dashscope_voice_client.delete_voice_async",
                AsyncMock(return_value=None),
            ) as delete_voice_mock:
                response = await delete_voice(
                    voice_id="voice-002",
                    x_user_id="user-2",
                    session=session,
                )

            self.assertIsInstance(response, Response)
            self.assertEqual(response.status_code, 204)
            delete_voice_mock.assert_awaited_once_with("voice-002")

        async with self.session_factory() as session:
            listed = await list_voices(x_user_id="user-2", session=session)

        self.assertEqual(listed, [])

    async def test_create_voices_rejects_blank_user_id(self) -> None:
        async with self.session_factory() as session:
            with self.assertRaises(HTTPException) as context:
                await create_voices(
                    body=[
                        VoiceCreateItem(
                            audio_uri="https://example.com/sample.wav",
                            audio_text="sample text",
                        )
                    ],
                    x_user_id="   ",
                    session=session,
                )

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
