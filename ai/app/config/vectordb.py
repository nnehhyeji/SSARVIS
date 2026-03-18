from pydantic import field_validator
from pydantic_settings import BaseSettings


class VectorDBConfig(BaseSettings):
    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: str = ""
    qdrant_collection_name: str = "conversations"
    qdrant_timeout_seconds: float = 20.0
    qdrant_vector_size: int = 1536

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("qdrant_url", mode="before")
    @classmethod
    def normalize_qdrant_url(cls, value: str | None) -> str:
        if value is None or not str(value).strip():
            return "http://qdrant:6333"
        return str(value)


vectordb_config = VectorDBConfig()
