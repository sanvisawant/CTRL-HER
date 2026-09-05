import json
import logging
from pathlib import Path
from typing import Dict, Optional
from config import settings
from models.assessment import QuizSession

logger = logging.getLogger(__name__)

class QuizRepository:
    """
    Storage repository for Quiz Sessions and evaluation results.
    Maintains an in-memory registry backed by JSON files in settings.QUIZZES_DIR.
    Provides a modular abstraction to allow painless migration to PostgreSQL / Supabase in future phases.
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or settings.QUIZZES_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, QuizSession] = {}

    def save_quiz(self, session: QuizSession) -> None:
        """Saves a quiz session into memory and persists it to disk."""
        self._cache[session.quiz_id] = session
        self._persist_to_disk(session)
        logger.info(f"QuizSession '{session.quiz_id}' saved ({len(session.questions_snapshot)} questions).")

    def get_quiz(self, quiz_id: str) -> Optional[QuizSession]:
        """Retrieves a quiz session from memory cache or reads from disk."""
        if quiz_id in self._cache:
            return self._cache[quiz_id]

        file_path = self.storage_dir / f"{quiz_id}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    session = QuizSession(**data)
                    self._cache[quiz_id] = session
                    return session
            except Exception as e:
                logger.error(f"Failed to load quiz '{quiz_id}' from disk: {e}")
                return None

        return None

    def update_quiz(self, session: QuizSession) -> None:
        """Updates an existing quiz session state (e.g., after submission)."""
        self.save_quiz(session)

    def clear(self) -> None:
        """Clears cache and storage files (useful for tests and reset)."""
        self._cache.clear()
        for f in self.storage_dir.glob("*.json"):
            try:
                f.unlink()
            except Exception:
                pass

    def _persist_to_disk(self, session: QuizSession) -> None:
        file_path = self.storage_dir / f"{session.quiz_id}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(session.model_dump(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist quiz '{session.quiz_id}' to disk: {e}")


# Module-level singleton
_repository: Optional[QuizRepository] = None

def get_quiz_repository() -> QuizRepository:
    global _repository
    if _repository is None:
        _repository = QuizRepository()
    return _repository
