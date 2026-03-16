from pydantic_settings import BaseSettings


class DatabaseConfig(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./app.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


database_config = DatabaseConfig()
