from pydantic_settings import BaseSettings


class VectorDBConfig(BaseSettings):
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


vectordb_config = VectorDBConfig()
