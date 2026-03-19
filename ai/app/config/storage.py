from pydantic_settings import BaseSettings


class StorageConfig(BaseSettings):
    s3_endpoint_url: str = ""
    s3_region: str = "auto"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = ""
    s3_key_prefix: str = ""
    s3_use_ssl: bool = True
    s3_addressing_style: str = "path"
    s3_create_bucket_if_missing: bool = False
    tts_presigned_url_expires_seconds: int = 3600

    model_config = {"env_file": ".env", "extra": "ignore"}


storage_config = StorageConfig()
