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
        """Saves a quiz session into cache, Supabase (primary), and disk (fallback)."""
        self._cache[session.quiz_id] = session

        # 1. Primary: Persist to Supabase
        try:
            from integrations.supabase_persistence import upsert_quiz_session
            from integrations.identity_mapping import identity_service
            canonical_id = identity_service.resolve_to_canonical_id(session.learner_id)
            s_dict = session.model_dump()
            s_dict["canonical_user_id"] = canonical_id
            if session.result:
                s_dict["score"] = session.result.score
                s_dict["percentage"] = session.result.percentage
            upsert_quiz_session(s_dict)
        except Exception as e:
            logger.warning(f"Failed to persist quiz '{session.quiz_id}' to Supabase: {e}")

        # 2. Fallback mirror: persist to disk
        self._persist_to_disk(session)
        logger.info(f"QuizSession '{session.quiz_id}' saved ({len(session.questions_snapshot)} questions).")

    def get_quiz(self, quiz_id: str) -> Optional[QuizSession]:
        """Retrieves a quiz session from cache, Supabase (primary), or disk (fallback)."""
        if quiz_id in self._cache:
            return self._cache[quiz_id]

        # 1. Primary: Load from Supabase
        try:
            from integrations.supabase_persistence import get_quiz_session_row
            row = get_quiz_session_row(quiz_id)
            if row:
                for ts_key in ("created_at", "submitted_at"):
                    if ts_key in row and hasattr(row[ts_key], "isoformat"):
                        row[ts_key] = row[ts_key].isoformat()
                session = QuizSession(**row)
                self._cache[quiz_id] = session
                return session
        except Exception as e:
            logger.warning(f"Failed to load quiz '{quiz_id}' from Supabase: {e}")

        # 2. Fallback: Load from disk
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
