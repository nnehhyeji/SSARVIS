import os
import tempfile
import uuid
from dataclasses import dataclass

from app.config.media import media_config
from app.config.storage import storage_config
from app.infra.s3compatible import S3CompatibleClient


@dataclass(frozen=True)
class UploadedTTSAudio:
    file_name: str
    object_key: str
    download_url: str


class TTSAudioStorageService:
    def __init__(self, storage_client: S3CompatibleClient) -> None:
        self.storage_client = storage_client

    async def upload_pcm_as_mp3(
        self,
        user_id: str,
        conversation_id: int,
        pcm_data: bytes,
    ) -> UploadedTTSAudio:
        if not pcm_data:
            raise ValueError("No PCM data available for TTS upload")
        if not storage_config.s3_bucket_name:
            raise ValueError("S3 bucket name is required")

        from pydub import AudioSegment

        segment = AudioSegment(
            data=pcm_data,
            sample_width=2,
            frame_rate=media_config.opus_sample_rate,
            channels=media_config.opus_channels,
        )

        file_name = f"tts_{conversation_id}_{uuid.uuid4().hex}.mp3"
        object_key = f"tts/{user_id}/{file_name}"

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_path = temp_file.name

        try:
            segment.export(temp_path, format="mp3")
            uploaded_key = await self.storage_client.upload_file(
                local_path=temp_path,
                key=object_key,
                content_type="audio/mpeg",
                metadata={
                    "user_id": user_id,
                    "conversation_id": str(conversation_id),
                },
            )
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

        download_url = await self.storage_client.presign_get_url(
            uploaded_key,
            expires_seconds=storage_config.tts_presigned_url_expires_seconds,
        )
        return UploadedTTSAudio(
            file_name=file_name,
            object_key=uploaded_key,
            download_url=download_url,
        )
