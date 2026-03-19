import asyncio
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config.storage import storage_config
from app.exceptions.infra import ObjectStorageError


class S3CompatibleClient:
    def __init__(self) -> None:
        self._bucket = storage_config.s3_bucket_name
        self._key_prefix = storage_config.s3_key_prefix.strip("/")
        self._create_if_missing = storage_config.s3_create_bucket_if_missing
        self._region = storage_config.s3_region
        self._client = boto3.client(
            "s3",
            endpoint_url=storage_config.s3_endpoint_url or None,
            region_name=self._region,
            aws_access_key_id=storage_config.s3_access_key_id or None,
            aws_secret_access_key=storage_config.s3_secret_access_key or None,
            use_ssl=storage_config.s3_use_ssl,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": storage_config.s3_addressing_style},
            ),
        )

    async def initialize(self) -> None:
        if not self._bucket:
            raise ValueError("S3 bucket name is required")

        try:
            await asyncio.to_thread(self._client.head_bucket, Bucket=self._bucket)
        except ClientError as exc:
            if not self._create_if_missing:
                raise ObjectStorageError("Failed to access bucket") from exc
            await asyncio.to_thread(self._create_bucket)

    async def upload_bytes(
        self,
        key: str,
        data: bytes,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> str:
        object_key = self._full_key(key)
        extra_args = self._build_extra_args(content_type, metadata)

        try:
            await asyncio.to_thread(
                self._client.put_object,
                Bucket=self._bucket,
                Key=object_key,
                Body=data,
                **extra_args,
            )
        except ClientError as exc:
            raise ObjectStorageError("Failed to upload bytes") from exc

        return object_key

    async def upload_file(
        self,
        local_path: str,
        key: str,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> str:
        path = Path(local_path)
        if not path.exists():
            raise FileNotFoundError(f"File does not exist: {local_path}")

        object_key = self._full_key(key)
        extra_args = self._build_extra_args(content_type, metadata)

        try:
            await asyncio.to_thread(
                self._client.upload_file,
                str(path),
                self._bucket,
                object_key,
                ExtraArgs=extra_args or None,
            )
        except ClientError as exc:
            raise ObjectStorageError("Failed to upload file") from exc

        return object_key

    async def download_bytes(self, key: str) -> bytes:
        object_key = self._full_key(key)

        def _download() -> bytes:
            response = self._client.get_object(Bucket=self._bucket, Key=object_key)
            return response["Body"].read()

        try:
            return await asyncio.to_thread(_download)
        except ClientError as exc:
            raise ObjectStorageError("Failed to download object") from exc

    async def delete(self, key: str) -> None:
        object_key = self._full_key(key)
        try:
            await asyncio.to_thread(
                self._client.delete_object,
                Bucket=self._bucket,
                Key=object_key,
            )
        except ClientError as exc:
            raise ObjectStorageError("Failed to delete object") from exc

    async def presign_get_url(self, key: str, expires_seconds: int = 3600) -> str:
        object_key = self._full_key(key)
        try:
            return await asyncio.to_thread(
                self._client.generate_presigned_url,
                "get_object",
                Params={"Bucket": self._bucket, "Key": object_key},
                ExpiresIn=expires_seconds,
            )
        except ClientError as exc:
            raise ObjectStorageError("Failed to generate presigned URL") from exc

    def _full_key(self, key: str) -> str:
        normalized = key.strip("/")
        if not self._key_prefix:
            return normalized
        return f"{self._key_prefix}/{normalized}"

    def _create_bucket(self) -> None:
        if self._region == "us-east-1":
            self._client.create_bucket(Bucket=self._bucket)
            return

        self._client.create_bucket(
            Bucket=self._bucket,
            CreateBucketConfiguration={"LocationConstraint": self._region},
        )

    @staticmethod
    def _build_extra_args(
        content_type: str | None,
        metadata: dict[str, str] | None,
    ) -> dict:
        extra_args: dict = {}
        if content_type:
            extra_args["ContentType"] = content_type
        if metadata:
            extra_args["Metadata"] = metadata
        return extra_args
