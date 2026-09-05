"""
VectorStore — Phase 2C-2
Persistent FAISS IndexFlatIP over L2-normalised embeddings.

Storage layout:
    data/vector_store/
        learning_materials.faiss   — FAISS binary index
        metadata.json              — {index_version, model, dimension,
                                       indexed_docs, items[]}

Each item in `items` maps a FAISS ordinal position → original chunk metadata.
Duplicate-indexing prevention: `indexed_docs` is a list of document_ids
already present; re-adding the same document is a no-op.
"""
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Current schema version — bump if the metadata structure changes
_METADATA_VERSION = 1


class VectorStore:
    """
    Wraps a FAISS IndexFlatIP with an explicit metadata mapping.
    Thread-safety: adequate for single-worker FastAPI prototype use.
    """

    def __init__(self, index_path: Path, metadata_path: Path, dimension: int):
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.dimension = dimension

        # Lazy-load on first use via _ensure_loaded()
        self._index = None          # faiss.IndexFlatIP
        self._metadata: Dict = {}   # full metadata dict (see _empty_metadata)
        self._loaded = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def document_exists(self, document_id: str) -> bool:
        """Return True if this document's vectors are already in the index."""
        self._ensure_loaded()
        return document_id in self._metadata.get("indexed_docs", [])

    def add_document_embeddings(
        self,
        document_id: str,
        embeddings: List[Dict[str, Any]]
    ) -> int:
        """
        Add all vectors from a document's embedding JSON into the FAISS index.
        Each item in `embeddings` must have keys: vector, chunk_id, chunk_index,
        text, source, location, locations, word_count.

        Returns the number of vectors added.
        Raises ValueError if document is already indexed.
        """
        self._ensure_loaded()

        if document_id in self._metadata.get("indexed_docs", []):
            raise ValueError(f"Document '{document_id}' is already indexed.")

        if not embeddings:
            raise ValueError(f"No embeddings provided for document '{document_id}'.")

        # Build float32 matrix — FAISS requires contiguous float32
        vectors = np.array(
            [item["vector"] for item in embeddings],
            dtype=np.float32
        )

        if vectors.shape[1] != self.dimension:
            raise ValueError(
                f"Vector dimension mismatch: expected {self.dimension}, "
                f"got {vectors.shape[1]}"
            )

        # Record starting ordinal so metadata indices are correct
        base_ordinal = self._index.ntotal
        self._index.add(vectors)

        # Append metadata for each new vector
        items = self._metadata.setdefault("items", [])
        for local_pos, emb in enumerate(embeddings):
            items.append({
                "index": base_ordinal + local_pos,
                "document_id": document_id,
                "chunk_id": emb.get("chunk_id", ""),
                "chunk_index": emb.get("chunk_index", local_pos),
                "text": emb.get("text", ""),
                "source": emb.get("source", ""),
                "location": emb.get("location"),
                "locations": emb.get("locations", []),
                "word_count": emb.get("word_count", 0),
            })

        self._metadata.setdefault("indexed_docs", []).append(document_id)
        return len(embeddings)

    def search(
        self,
        query_vector: List[float],
        top_k: int,
        document_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search the index for the top_k closest vectors to query_vector.
        If document_id is provided, filters results to that document only.

        Returns a list of result dicts with keys:
            chunk_id, document_id, score, text, source, location, locations,
            chunk_index
        Ordered by descending similarity score.
        """
        self._ensure_loaded()

        total_vectors = self._index.ntotal
        if total_vectors == 0:
            return []

        # When filtering by document, we need more candidates from FAISS
        # then trim in Python.  Cap at total vectors to avoid FAISS error.
        k = min(top_k if document_id is None else total_vectors, total_vectors)

        q = np.array([query_vector], dtype=np.float32)
        scores, indices = self._index.search(q, k)

        items = self._metadata.get("items", [])
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(items):
                # FAISS can return -1 as a sentinel for unfilled positions
                continue
            meta = items[idx]
            if document_id and meta.get("document_id") != document_id:
                continue
            results.append({
                "chunk_id": meta["chunk_id"],
                "document_id": meta["document_id"],
                "score": float(score),
                "text": meta["text"],
                "source": meta["source"],
                "location": meta.get("location"),
                "locations": meta.get("locations", []),
                "chunk_index": meta.get("chunk_index", 0),
            })
            if len(results) >= top_k:
                break

        # Already ordered by FAISS (highest score first for IndexFlatIP)
        return results

    def save(self) -> None:
        """Persist FAISS index and metadata to disk."""
        import faiss
        self._ensure_loaded()
        faiss.write_index(self._index, str(self.index_path))
        self._metadata["embedding_model"] = self._metadata.get("embedding_model", "")
        self._metadata["dimension"] = self.dimension
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self._metadata, f, ensure_ascii=False)
        logger.info(
            f"VectorStore saved — {self._index.ntotal} vectors, "
            f"{len(self._metadata.get('indexed_docs', []))} documents"
        )

    @property
    def total_vectors(self) -> int:
        self._ensure_loaded()
        return self._index.ntotal

    @property
    def indexed_documents(self) -> List[str]:
        self._ensure_loaded()
        return list(self._metadata.get("indexed_docs", []))

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        import faiss
        if self.index_path.exists() and self.metadata_path.exists():
            try:
                self._index = faiss.read_index(str(self.index_path))
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
                logger.info(
                    f"VectorStore loaded — {self._index.ntotal} vectors, "
                    f"{len(self._metadata.get('indexed_docs', []))} documents"
                )
            except Exception as e:
                logger.warning(f"Could not load existing index ({e}). Creating fresh.")
                self._index, self._metadata = self._create_empty(faiss)
        else:
            self._index, self._metadata = self._create_empty(faiss)
        self._loaded = True

    def _create_empty(self, faiss_module) -> tuple:
        logger.info(f"Creating empty IndexFlatIP (dim={self.dimension})")
        index = faiss_module.IndexFlatIP(self.dimension)
        metadata = self._empty_metadata()
        return index, metadata

    @staticmethod
    def _empty_metadata() -> Dict:
        return {
            "index_version": _METADATA_VERSION,
            "embedding_model": "",
            "dimension": 0,
            "indexed_docs": [],
            "items": [],
        }


# ------------------------------------------------------------------
# Module-level singleton
# ------------------------------------------------------------------
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """Returns the shared VectorStore instance, initialised on first call."""
    global _vector_store
    if _vector_store is None:
        from config import settings
        _vector_store = VectorStore(
            index_path=settings.VECTOR_STORE_DIR / settings.FAISS_INDEX_FILE,
            metadata_path=settings.VECTOR_STORE_DIR / settings.VECTOR_METADATA_FILE,
            dimension=settings.EMBEDDING_DIMENSION,
        )
    return _vector_store
