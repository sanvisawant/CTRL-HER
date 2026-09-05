import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if available
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "StatSaksham AI — Official Statistical System Learning Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    PORT: int = int(os.getenv("PORT", "8000"))
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20"))
    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    
    # Chunking Configuration
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))       # Words/tokens target per chunk
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "120"))   # Words/tokens overlap between chunks

    # Embedding Configuration
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    EMBEDDING_DIMENSION: int = 384

    # Vector Store Configuration
    SEARCH_TOP_K_DEFAULT: int = 5
    SEARCH_TOP_K_MAX: int = 20

    _LEARNING_DIR: Path = Path(__file__).resolve().parent
    _BACKEND_DIR: Path = _LEARNING_DIR.parent.parent if len(_LEARNING_DIR.parents) >= 2 else _LEARNING_DIR
    BASE_DIR: Path = _BACKEND_DIR if (_BACKEND_DIR / "data").exists() else _LEARNING_DIR
    UPLOAD_DIR: Path = BASE_DIR / os.getenv("UPLOAD_DIR", "data/uploads")
    EXTRACTED_DIR: Path = BASE_DIR / "data/extracted"
    CHUNKS_DIR: Path = BASE_DIR / "data/chunks"
    EMBEDDINGS_DIR: Path = BASE_DIR / "data/embeddings"
    VECTOR_STORE_DIR: Path = BASE_DIR / "data/vector_store"
    QUIZZES_DIR: Path = BASE_DIR / "data/quizzes"
    LEARNER_PROGRESS_DIR: Path = BASE_DIR / "data/learner_progress"
    QUESTION_BANK_DIR: Path = BASE_DIR / "data/question_bank"
    RECENT_ATTEMPT_WINDOW: int = 3
    MAX_TOPIC_HISTORY: int = 10
    FAISS_INDEX_FILE: str = "learning_materials.faiss"
    VECTOR_METADATA_FILE: str = "metadata.json"

    ALLOWED_EXTENSIONS: set = {".pdf", ".ppt", ".pptx", ".doc", ".docx"}

settings = Settings()

# Ensure data directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
settings.CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
settings.EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
settings.VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
settings.QUIZZES_DIR.mkdir(parents=True, exist_ok=True)
settings.LEARNER_PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
settings.QUESTION_BANK_DIR.mkdir(parents=True, exist_ok=True)
