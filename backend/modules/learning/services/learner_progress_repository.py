import json
import logging
from pathlib import Path
from typing import Dict, Optional
from config import settings
from models.learner_progress import LearnerProgressProfile

logger = logging.getLogger(__name__)

class LearnerProgressRepository:
    """
    Storage repository for persistent learner progress and topic mastery tracking.
    Maintains an in-memory cache backed by JSON files in settings.LEARNER_PROGRESS_DIR.
    Provides a modular abstraction to allow painless migration to PostgreSQL / Supabase in future phases.
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or settings.LEARNER_PROGRESS_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, LearnerProgressProfile] = {}

    def get_progress(self, learner_id: str) -> LearnerProgressProfile:
        """
        Retrieves learner progress profile from memory cache, loads from disk if available,
        or initializes a clean profile.
        """
        if learner_id in self._cache:
            return self._cache[learner_id]

        file_path = self.storage_dir / f"{learner_id}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    profile = LearnerProgressProfile(**data)
                    self._cache[learner_id] = profile
                    return profile
            except Exception as e:
                logger.error(f"Failed to load learner progress for '{learner_id}' from disk: {e}")

        # Initialize clean profile if none exists yet
        new_profile = LearnerProgressProfile(learner_id=learner_id)
        self._cache[learner_id] = new_profile
        return new_profile

    def save_progress(self, profile: LearnerProgressProfile) -> None:
        """Persists the learner progress profile to memory cache and disk."""
        self._cache[profile.learner_id] = profile
        self._persist_to_disk(profile)

    def clear(self) -> None:
        """Clears cache and storage files (useful for tests and reset)."""
        self._cache.clear()
        for f in self.storage_dir.glob("*.json"):
            try:
                f.unlink()
            except Exception:
                pass

    def _persist_to_disk(self, profile: LearnerProgressProfile) -> None:
        file_path = self.storage_dir / f"{profile.learner_id}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(profile.model_dump(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist learner progress for '{profile.learner_id}' to disk: {e}")


# Module-level singleton
_progress_repo: Optional[LearnerProgressRepository] = None

def get_learner_progress_repository() -> LearnerProgressRepository:
    global _progress_repo
    if _progress_repo is None:
        _progress_repo = LearnerProgressRepository()
    return _progress_repo
