import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "StatSaksham AI - P4 Admin Intelligence & Competency Quest API"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "StatSaksham AI Backend for SIH26101 - P4: Admin Intelligence, "
        "Workforce Competency Analytics, Explainable Demand Forecasting, "
        "What-If Simulator, and Competency Quest Gamification Engine."
    )
    
    # Database - Supabase PostgreSQL is PRIMARY; SQLite is fallback
    _CORE_DIR = Path(__file__).resolve().parent
    _BACKEND_DIR = _CORE_DIR.parents[3] if len(_CORE_DIR.parents) > 3 else _CORE_DIR
    _DEFAULT_DB_PATH = _BACKEND_DIR / "data" / "statsaksham.db"
    _DEFAULT_SQLITE_URL = f"sqlite:///{_DEFAULT_DB_PATH.as_posix()}" if _DEFAULT_DB_PATH.exists() else "sqlite:///./statsaksham.db"
    _DEFAULT_PG_URL = "postgresql://postgres.dgbmxefpfcledhifnxyv:Marisamenezes-123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

    DATABASE_URL: str = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL", _DEFAULT_PG_URL))
    SQLITE_FALLBACK_URL: str = _DEFAULT_SQLITE_URL
    USE_SQLITE_FALLBACK: bool = os.getenv("USE_SQLITE_FALLBACK", "false").lower() in ("true", "1", "yes")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*"
    ]
    
    # Seeder
    AUTO_SEED_DATA: bool = True
    
    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
