from pydantic_settings import BaseSettings


class VectorDBConfig(BaseSettings):
    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: str = ""
    qdrant_collection_name: str = "conversations"
    qdrant_timeout_seconds: float = 20.0

    model_config = {"env_file": ".env", "extra": "ignore"}


vectordb_config = VectorDBConfig()
