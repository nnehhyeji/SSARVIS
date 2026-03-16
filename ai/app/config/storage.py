from pydantic_settings import BaseSettings


class StorageConfig(BaseSettings):
    s3_endpoint_url: str = ""
    s3_bucket_name: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


storage_config = StorageConfig()
