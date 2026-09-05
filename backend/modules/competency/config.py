import os
from functools import lru_cache
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres.dgbmxefpfcledhifnxyv:Marisamenezes-123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
        description="PostgreSQL / Supabase connection URL"
    )

    # AI Engine
    AI_PROVIDER: Literal["gemini", "openai"] = Field(
        default="gemini",
        description="LLM provider to use for evaluation"
    )
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API Key")
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash", description="Gemini model identifier")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="OpenAI model identifier")

    # Domain Fallbacks
    FALLBACK_BENCHMARK_SCORE: float = Field(
        default=3.5,
        description="Default benchmark competency score if role benchmark is not defined"
    )

    # Server & Environment
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")
    APP_PORT: int = Field(default=8000, description="Server listening port")
    DEBUG: bool = Field(default=True, description="Debug flag")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
