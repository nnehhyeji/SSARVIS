import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.infra.tts_storage import TTSAudioStorageService


class TTSAudioStorageServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_pcm_as_mp3_rejects_empty_pcm(self) -> None:
        service = TTSAudioStorageService(storage_client=AsyncMock())

        with self.assertRaises(ValueError):
            await service.upload_pcm_as_mp3(
                user_id="user-1",
                conversation_id=1,
                pcm_data=b"",
            )

    async def test_upload_pcm_as_mp3_requires_bucket_name(self) -> None:
        storage_client = AsyncMock()
        service = TTSAudioStorageService(storage_client=storage_client)

        with patch("app.infra.tts_storage.storage_config.s3_bucket_name", ""):
            with self.assertRaises(ValueError):
                await service.upload_pcm_as_mp3(
                    user_id="user-1",
                    conversation_id=1,
                    pcm_data=b"pcm",
                )

    async def test_upload_pcm_as_mp3_uploads_file_and_presigns_url(self) -> None:
        storage_client = AsyncMock()
        storage_client.upload_file = AsyncMock(return_value="tts/user-1/file.mp3")
        storage_client.presign_get_url = AsyncMock(
            return_value="https://example.com/file.mp3"
        )
        service = TTSAudioStorageService(storage_client=storage_client)

        def build_segment(*args, **kwargs):
            return SimpleNamespace(export=lambda path, format: None)

        with patch("app.infra.tts_storage.storage_config.s3_bucket_name", "bucket"), patch(
            "pydub.AudioSegment", side_effect=build_segment
        ):
            uploaded = await service.upload_pcm_as_mp3(
                user_id="user-1",
                conversation_id=1,
                pcm_data=b"pcm",
            )

        self.assertEqual(uploaded.object_key, "tts/user-1/file.mp3")
        self.assertEqual(uploaded.download_url, "https://example.com/file.mp3")
        storage_client.upload_file.assert_awaited_once()
        storage_client.presign_get_url.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
