import logging
from typing import List
from config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Wraps sentence-transformers for document chunk embedding.
    The model is loaded once on first use and reused for all subsequent calls.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model loaded. Dimension: {self.dimension}")
        except ImportError:
            raise RuntimeError(
                "sentence-transformers is not installed. Run: pip install sentence-transformers"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load embedding model '{self.model_name}': {str(e)}")

    def embed_text(self, text: str) -> List[float]:
        """Embed a single text string. Returns a flat list of floats."""
        if not text or not text.strip():
            raise ValueError("Cannot embed empty or whitespace-only text.")
        self._load_model()
        vector = self._model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of texts in a single batch call.
        Any empty strings in the list are replaced with a zero vector to avoid data loss.
        """
        if not texts:
            return []
        self._load_model()

        # Replace empty strings with placeholder to maintain index alignment
        safe_texts = [t if t.strip() else "[empty]" for t in texts]
        vectors = self._model.encode(safe_texts, normalize_embeddings=True, show_progress_bar=False)
        return [v.tolist() for v in vectors]

    @property
    def dimension(self) -> int:
        """Returns the embedding dimension. Loads the model if needed."""
        self._load_model()
        return self._model.get_embedding_dimension()


# Module-level singleton — loaded on first use, shared across requests
_embedding_service: EmbeddingService | None = None

def get_embedding_service() -> EmbeddingService:
    """Returns the shared EmbeddingService instance, creating it if needed."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService(model_name=settings.EMBEDDING_MODEL)
    return _embedding_service
