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
        Retrieves learner progress profile from memory cache, loads from Supabase (primary),
        falls back to disk if unavailable, or initializes a clean profile.
        """
        if learner_id in self._cache:
            return self._cache[learner_id]

        # 1. Primary: Load from Supabase
        try:
            from integrations.supabase_persistence import get_learner_progress_row
            row = get_learner_progress_row(learner_id)
            if row:
                topics_data = row.get("topics")
                if isinstance(topics_data, str):
                    topics_data = json.loads(topics_data)
                elif topics_data is None:
                    topics_data = {}
                profile = LearnerProgressProfile(
                    learner_id=str(row["learner_id"]),
                    topics=topics_data,
                    total_tracked_topics=row.get("total_tracked_topics", 0),
                    mastered_topics=row.get("mastered_topics", 0),
                    topics_needing_review=row.get("topics_needing_review", 0),
                    improving_topics=row.get("improving_topics", 0),
                    overall_accuracy=float(row.get("overall_accuracy", 0.0)),
                )
                self._cache[learner_id] = profile
                return profile
        except Exception as e:
            logger.warning(f"Failed to load learner progress for '{learner_id}' from Supabase: {e}")

        # 2. Fallback: Load from disk
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

        # 3. Initialize clean profile if none exists yet
        new_profile = LearnerProgressProfile(learner_id=learner_id)
        self._cache[learner_id] = new_profile
        return new_profile

    def save_progress(self, profile: LearnerProgressProfile) -> None:
        """Persists the learner progress profile to cache, Supabase (primary), and disk (fallback)."""
        self._cache[profile.learner_id] = profile

        # 1. Primary: Persist to Supabase
        try:
            from integrations.supabase_persistence import upsert_learner_progress
            from integrations.identity_mapping import identity_service
            canonical_id = identity_service.resolve_to_canonical_id(profile.learner_id)
            profile_dict = profile.model_dump()
            profile_dict["canonical_user_id"] = canonical_id
            upsert_learner_progress(profile_dict)
        except Exception as e:
            logger.warning(f"Failed to persist learner progress for '{profile.learner_id}' to Supabase: {e}")

        # 2. Fallback mirror: persist to disk
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
