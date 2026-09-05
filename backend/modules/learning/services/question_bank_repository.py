import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from config import settings
from models.question_bank import QuestionBankItem
from services.mcq_validator import MCQValidator

logger = logging.getLogger(__name__)

class QuestionBankRepository:
    """
    Storage repository for the Trainer Question Bank.
    Maintains an in-memory cache backed by individual JSON files in settings.QUESTION_BANK_DIR.
    Provides a modular abstraction to allow seamless migration to PostgreSQL / Supabase in future phases.
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or settings.QUESTION_BANK_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, QuestionBankItem] = {}
        self._load_all_from_disk()

    def _load_all_from_disk(self) -> None:
        """Populates cache with all existing questions on disk."""
        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    item = QuestionBankItem(**data)
                    self._cache[item.question_id] = item
            except Exception as e:
                logger.error(f"Failed to load question '{file_path.name}' from disk: {e}")

    def save(self, item: QuestionBankItem) -> None:
        """Saves a QuestionBankItem to cache and persists it to disk."""
        self._cache[item.question_id] = item
        self._persist_to_disk(item)
        logger.info(f"QuestionBankItem '{item.question_id}' saved with status '{item.status}'.")

    def get(self, question_id: str) -> Optional[QuestionBankItem]:
        """Retrieves a question from memory cache or reads from disk."""
        if question_id in self._cache:
            return self._cache[question_id]

        file_path = self.storage_dir / f"{question_id}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    item = QuestionBankItem(**data)
                    self._cache[question_id] = item
                    return item
            except Exception as e:
                logger.error(f"Failed to load question '{question_id}' from disk: {e}")
                return None
        return None

    def list(
        self,
        document_id: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[QuestionBankItem]:
        """
        Lists and filters question bank items.
        """
        results = list(self._cache.values())

        if document_id:
            results = [r for r in results if r.source.document_id == document_id]

        if topic:
            target_topic = topic.strip().lower()
            results = [r for r in results if target_topic in r.topic.strip().lower()]

        if difficulty:
            target_diff = difficulty.strip().lower()
            results = [r for r in results if r.difficulty.strip().lower() == target_diff]

        if status:
            target_status = status.strip().upper()
            results = [r for r in results if r.status.strip().upper() == target_status]

        if search:
            query = search.strip().lower()
            results = [r for r in results if query in r.question.lower() or query in r.topic.lower()]

        # Sort descending by updated_at or created_at
        results.sort(key=lambda x: x.updated_at or x.created_at, reverse=True)
        return results

    def find_duplicate(
        self,
        question_text: str,
        document_id: str,
        topic: str,
        exclude_id: Optional[str] = None
    ) -> Optional[QuestionBankItem]:
        """
        Detects duplicate questions within the same document and topic.
        Uses normalized alphanumeric comparison with single spaces.
        """
        norm_q = MCQValidator.normalize_text(question_text)
        norm_topic = MCQValidator.normalize_text(topic)

        for item in self._cache.values():
            if exclude_id and item.question_id == exclude_id:
                continue
            if item.source.document_id == document_id:
                if MCQValidator.normalize_text(item.topic) == norm_topic:
                    if MCQValidator.normalize_text(item.question) == norm_q:
                        return item
        return None

    def clear(self) -> None:
        """Clears memory cache and removes disk files. Useful for testing."""
        self._cache.clear()
        for f in self.storage_dir.glob("*.json"):
            try:
                f.unlink()
            except Exception:
                pass

    def _persist_to_disk(self, item: QuestionBankItem) -> None:
        file_path = self.storage_dir / f"{item.question_id}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(item.model_dump(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist question bank item '{item.question_id}' to disk: {e}")


# Module-level singleton
_repository: Optional[QuestionBankRepository] = None

def get_question_bank_repository() -> QuestionBankRepository:
    global _repository
    if _repository is None:
        _repository = QuestionBankRepository()
    return _repository
