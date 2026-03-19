import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

from app.exceptions.infra import ObjectStorageError
from app.infra.s3compatible import S3CompatibleClient


class S3CompatibleClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_bytes_returns_prefixed_key(self) -> None:
        fake_client = MagicMock()

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            client._key_prefix = "tts"
            key = await client.upload_bytes(
                key="audio/file.mp3",
                data=b"abc",
                content_type="audio/mpeg",
                metadata={"user_id": "user-1"},
            )

        self.assertEqual(key, "tts/audio/file.mp3")
        fake_client.put_object.assert_called_once()

    async def test_upload_file_rejects_missing_file(self) -> None:
        fake_client = MagicMock()

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"

            with self.assertRaises(FileNotFoundError):
                await client.upload_file("missing.mp3", "audio/file.mp3")

    async def test_upload_file_uses_boto_upload(self) -> None:
        fake_client = MagicMock()
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file.close()
        temp_path = Path(temp_file.name)
        self.addCleanup(lambda: temp_path.unlink(missing_ok=True))

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            client._key_prefix = "tts"
            key = await client.upload_file(str(temp_path), "audio/file.mp3")

        self.assertEqual(key, "tts/audio/file.mp3")
        fake_client.upload_file.assert_called_once()

    async def test_download_bytes_reads_object_body(self) -> None:
        fake_body = MagicMock()
        fake_body.read.return_value = b"pcm"
        fake_client = MagicMock()
        fake_client.get_object.return_value = {"Body": fake_body}

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            result = await client.download_bytes("audio/file.mp3")

        self.assertEqual(result, b"pcm")

    async def test_delete_calls_delete_object(self) -> None:
        fake_client = MagicMock()

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            await client.delete("audio/file.mp3")

        fake_client.delete_object.assert_called_once()

    async def test_presign_get_url_returns_url(self) -> None:
        fake_client = MagicMock()
        fake_client.generate_presigned_url.return_value = "https://example.com/file.mp3"

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            url = await client.presign_get_url("audio/file.mp3", expires_seconds=10)

        self.assertEqual(url, "https://example.com/file.mp3")

    async def test_initialize_can_create_missing_bucket(self) -> None:
        fake_client = MagicMock()
        fake_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "404"}},
            "HeadBucket",
        )

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            client._create_if_missing = True
            client._region = "us-east-1"
            await client.initialize()

        fake_client.create_bucket.assert_called_once_with(Bucket="bucket")

    async def test_initialize_raises_when_bucket_access_fails(self) -> None:
        fake_client = MagicMock()
        fake_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "403"}},
            "HeadBucket",
        )

        with patch("app.infra.s3compatible.boto3.client", return_value=fake_client):
            client = S3CompatibleClient()
            client._bucket = "bucket"
            client._create_if_missing = False

            with self.assertRaises(ObjectStorageError):
                await client.initialize()


if __name__ == "__main__":
    unittest.main()
