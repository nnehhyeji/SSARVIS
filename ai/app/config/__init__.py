"""Configuration package."""

from app.config.dashscope import DashScopeConfig, dashscope_config
from app.config.media import MediaConfig, media_config
from app.config.openai import OpenAIConfig, openai_config
from app.config.prompt import PromptConfig, prompt_config
from app.config.vectordb import VectorDBConfig, vectordb_config

__all__ = [
    "DashScopeConfig",
    "dashscope_config",
    "MediaConfig",
    "media_config",
    "OpenAIConfig",
    "openai_config",
    "PromptConfig",
    "prompt_config",
    "VectorDBConfig",
    "vectordb_config",
]
