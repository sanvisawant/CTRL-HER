"""
StatSaksham AI — Document Registry Service (Step 7B-1)
Supabase-primary document metadata store with in-memory fallback.

Provides a drop-in replacement for the module-level _documents_db dict in routes/documents.py.
All dictionary operations (getitem, setitem, values, contains, etc.) work transparently,
with writes synced to Supabase and initial state loaded from Supabase on startup.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger("statsaksham.document_registry")

_supabase_available: bool = True
_loaded_from_supabase: bool = False


def _get_model():
    """Lazy import to avoid circular dependencies."""
    from models.document import DocumentMetadata
    return DocumentMetadata


def _row_to_model(row: dict):
    """Convert a Supabase row dict to DocumentMetadata."""
    DocumentMetadata = _get_model()
    uploaded_at = row.get("uploaded_at")
    if isinstance(uploaded_at, datetime):
        uploaded_at = uploaded_at.isoformat()
    elif uploaded_at is None:
        uploaded_at = datetime.now(timezone.utc).isoformat()

    return DocumentMetadata(
        document_id=row["document_id"],
        filename=row["filename"],
        file_type=row.get("file_type", ""),
        file_size_bytes=row.get("file_size_bytes", 0),
        file_size_formatted=row.get("file_size_formatted", ""),
        uploaded_at=str(uploaded_at),
        status=row.get("status", "UPLOADED"),
        pages=row.get("pages") or 0,
        text_blocks=row.get("text_blocks") or 0,
        chunks=row.get("chunks") or 0,
        embeddings=row.get("embeddings") or 0,
        description=row.get("description"),
    )


def _model_to_row(meta) -> dict:
    """Convert a DocumentMetadata to a Supabase row dict."""
    return {
        "document_id": meta.document_id,
        "filename": meta.filename,
        "file_type": meta.file_type,
        "file_size_bytes": meta.file_size_bytes,
        "file_size_formatted": meta.file_size_formatted,
        "upload_path": getattr(meta, "upload_path", None),
        "status": meta.status,
        "pages": meta.pages,
        "text_blocks": meta.text_blocks,
        "chunks": meta.chunks,
        "embeddings": meta.embeddings,
        "description": meta.description,
        "uploaded_by": None,
        "uploaded_at": meta.uploaded_at,
    }


class _SyncedDocumentDict(dict):
    """A dictionary that synchronizes modifications to Supabase."""

    def __getitem__(self, key):
        _ensure_loaded()
        return super().__getitem__(key)

    def __contains__(self, key):
        _ensure_loaded()
        return super().__contains__(key)

    def get(self, key, default=None):
        _ensure_loaded()
        return super().get(key, default)

    def values(self):
        _ensure_loaded()
        return super().values()

    def items(self):
        _ensure_loaded()
        return super().items()

    def keys(self):
        _ensure_loaded()
        return super().keys()

    def __len__(self):
        _ensure_loaded()
        return super().__len__()

    def __iter__(self):
        _ensure_loaded()
        return super().__iter__()

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        global _supabase_available
        if _supabase_available and hasattr(value, "document_id"):
            try:
                from integrations.supabase_persistence import upsert_document
                upsert_document(_model_to_row(value))
            except Exception as e:
                logger.warning(f"[DocumentRegistry] Supabase write failed for {key}: {type(e).__name__}")


_cache = _SyncedDocumentDict()


def _load_from_supabase() -> bool:
    """Load all document metadata from Supabase into cache."""
    global _supabase_available
    try:
        from integrations.supabase_persistence import get_all_documents as sb_get_docs
        rows = sb_get_docs()
        for row in rows:
            try:
                meta = _row_to_model(row)
                super(_SyncedDocumentDict, _cache).__setitem__(meta.document_id, meta)
            except Exception as row_err:
                logger.warning(f"Could not parse document row {row.get('document_id')}: {row_err}")
        logger.info(f"[DocumentRegistry] Loaded {len(rows)} document(s) from Supabase.")
        _supabase_available = True
        return True
    except Exception as e:
        logger.warning(f"[DocumentRegistry] Supabase unavailable — using in-memory fallback: {type(e).__name__}")
        _supabase_available = False
        return False


def _ensure_loaded():
    """Ensure cache is populated from Supabase on first access."""
    global _loaded_from_supabase
    if not _loaded_from_supabase:
        _loaded_from_supabase = True
        _load_from_supabase()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_document(document_id: str):
    """Retrieve a single document's metadata."""
    _ensure_loaded()
    return _cache.get(document_id)


def get_all_documents():
    """Return all document metadata records."""
    _ensure_loaded()
    return list(_cache.values())


def document_exists(document_id: str) -> bool:
    """Return True if document_id is known."""
    _ensure_loaded()
    return document_id in _cache


def save_document(meta) -> None:
    """Save or update a document metadata record."""
    _cache[meta.document_id] = meta


def seed_prototype_documents(sample_docs: list) -> None:
    """Seed the cache with prototype document stubs if not already present."""
    _ensure_loaded()
    for doc in sample_docs:
        if doc.document_id not in _cache:
            _cache[doc.document_id] = doc
            logger.debug(f"[DocumentRegistry] Seeded prototype: {doc.document_id}")


def get_registry() -> _SyncedDocumentDict:
    """Return the live cache dict (transparent drop-in for _documents_db)."""
    _ensure_loaded()
    return _cache
