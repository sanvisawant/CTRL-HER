"""
StatSaksham AI — Supabase Persistence Layer (Step 7B-1)
Manages the identity_mapping and documents tables in the existing Supabase instance.

Design principles:
- Uses the EXISTING P1 Supabase connection (psycopg2 + SQLAlchemy engine)
- Never exposes credentials in logs or exceptions
- Always fails safe: Supabase errors fall back to in-code data, never crash the app
- Never touches existing P1 tables (officials, competencies, role_benchmarks,
  official_competency_scores, competency_history)
"""
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger("statsaksham.supabase_persistence")


# ---------------------------------------------------------------------------
# Lazy import to avoid circular deps — P1's engine is the canonical connection
# ---------------------------------------------------------------------------

def _get_engine():
    """Return the existing P1 SQLAlchemy engine. Safely retrieves bound engine via p1_bridge."""
    try:
        from integrations.p1_bridge import p1_session_local
        if p1_session_local is not None and hasattr(p1_session_local, "kw"):
            engine = p1_session_local.kw.get("bind")
            if engine:
                return engine
    except Exception as e:
        logger.debug(f"Could not get engine via p1_bridge: {e}")

    # Fallback to direct import if available
    from modules.competency.database import engine as p1_engine
    return p1_engine


# ---------------------------------------------------------------------------
# Table DDL — CREATE IF NOT EXISTS (idempotent)
# ---------------------------------------------------------------------------

_DDL_IDENTITY_MAPPING = """
CREATE TABLE IF NOT EXISTS identity_mapping (
    canonical_user_id   UUID        PRIMARY KEY,
    p1_user_id          UUID,
    p2_learner_id       VARCHAR(50),
    p3_learner_id       VARCHAR(50),
    p4_user_id          VARCHAR(50),
    p5_cadre_id         VARCHAR(50),
    full_name           TEXT        NOT NULL,
    designation         TEXT,
    department          TEXT,
    email               TEXT,
    role                VARCHAR(20) DEFAULT 'learner',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
"""

_DDL_IDENTITY_INDEXES = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_mapping_p2 ON identity_mapping(p2_learner_id) WHERE p2_learner_id IS NOT NULL;",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_mapping_p3 ON identity_mapping(p3_learner_id) WHERE p3_learner_id IS NOT NULL;",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_mapping_p4 ON identity_mapping(p4_user_id) WHERE p4_user_id IS NOT NULL;",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_mapping_p5 ON identity_mapping(p5_cadre_id) WHERE p5_cadre_id IS NOT NULL;",
]

_DDL_DOCUMENTS = """
CREATE TABLE IF NOT EXISTS documents (
    document_id         VARCHAR(50) PRIMARY KEY,
    filename            TEXT        NOT NULL,
    file_type           VARCHAR(20),
    file_size_bytes     BIGINT,
    file_size_formatted VARCHAR(30),
    upload_path         TEXT,
    status              VARCHAR(30) DEFAULT 'UPLOADED',
    pages               INTEGER     DEFAULT 0,
    text_blocks         INTEGER     DEFAULT 0,
    chunks              INTEGER     DEFAULT 0,
    embeddings          INTEGER     DEFAULT 0,
    description         TEXT,
    uploaded_by         UUID,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);
"""


def create_tables() -> bool:
    """
    Create identity_mapping and documents tables in Supabase if they don't exist.
    Idempotent — safe to call multiple times.
    Returns True on success, False on failure.
    Does NOT touch any existing P1 tables.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            conn.execute(text(_DDL_IDENTITY_MAPPING))
            for idx_ddl in _DDL_IDENTITY_INDEXES:
                try:
                    conn.execute(text(idx_ddl))
                except Exception as idx_err:
                    logger.debug(f"Index DDL note (may already exist): {idx_err}")
            conn.execute(text(_DDL_DOCUMENTS))
            conn.commit()
        logger.info("Supabase tables 'identity_mapping' and 'documents' verified/created.")
        return True
    except Exception as e:
        logger.error(f"[SUPABASE] Failed to create tables — credentials or connectivity issue: {type(e).__name__}")
        return False


def check_table_exists(table_name: str) -> Optional[bool]:
    """
    Returns True if table exists, False if not, None if cannot determine.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = :tn)"
            ), {"tn": table_name})
            row = result.fetchone()
            return bool(row[0]) if row else False
    except Exception as e:
        logger.warning(f"[SUPABASE] Cannot check if '{table_name}' exists: {type(e).__name__}")
        return None


# ---------------------------------------------------------------------------
# identity_mapping CRUD
# ---------------------------------------------------------------------------

def upsert_identity(identity: Dict[str, Any]) -> bool:
    """
    Insert or update a single identity mapping row.
    identity must have keys matching identity_mapping columns.
    Returns True on success, False on failure.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        sql = text("""
            INSERT INTO identity_mapping
                (canonical_user_id, p1_user_id, p2_learner_id, p3_learner_id,
                 p4_user_id, p5_cadre_id, full_name, designation, department, email, role)
            VALUES
                (:canonical_user_id, :p1_user_id, :p2_learner_id, :p3_learner_id,
                 :p4_user_id, :p5_cadre_id, :full_name, :designation, :department, :email, :role)
            ON CONFLICT (canonical_user_id)
            DO UPDATE SET
                p2_learner_id = EXCLUDED.p2_learner_id,
                p3_learner_id = EXCLUDED.p3_learner_id,
                p4_user_id    = EXCLUDED.p4_user_id,
                p5_cadre_id   = EXCLUDED.p5_cadre_id,
                full_name     = EXCLUDED.full_name,
                designation   = EXCLUDED.designation,
                department    = EXCLUDED.department,
                email         = EXCLUDED.email,
                role          = EXCLUDED.role
        """)
        with engine.connect() as conn:
            conn.execute(sql, identity)
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"[SUPABASE] upsert_identity failed: {type(e).__name__}: {e}")
        return False


def get_all_identities() -> List[Dict[str, Any]]:
    """
    Fetch all rows from identity_mapping.
    Returns empty list on failure.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM identity_mapping"))
            rows = result.mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f"[SUPABASE] get_all_identities failed: {type(e).__name__}")
        return []


# ---------------------------------------------------------------------------
# documents CRUD
# ---------------------------------------------------------------------------

def upsert_document(doc: Dict[str, Any]) -> bool:
    """
    Insert or update a document metadata row.
    Returns True on success, False on failure.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        sql = text("""
            INSERT INTO documents
                (document_id, filename, file_type, file_size_bytes, file_size_formatted,
                 upload_path, status, pages, text_blocks, chunks, embeddings, description,
                 uploaded_by, uploaded_at)
            VALUES
                (:document_id, :filename, :file_type, :file_size_bytes, :file_size_formatted,
                 :upload_path, :status, :pages, :text_blocks, :chunks, :embeddings, :description,
                 :uploaded_by, :uploaded_at)
            ON CONFLICT (document_id)
            DO UPDATE SET
                filename            = EXCLUDED.filename,
                file_size_bytes     = EXCLUDED.file_size_bytes,
                file_size_formatted = EXCLUDED.file_size_formatted,
                status              = EXCLUDED.status,
                pages               = EXCLUDED.pages,
                text_blocks         = EXCLUDED.text_blocks,
                chunks              = EXCLUDED.chunks,
                embeddings          = EXCLUDED.embeddings,
                description         = EXCLUDED.description,
                upload_path         = EXCLUDED.upload_path
        """)
        with engine.connect() as conn:
            conn.execute(sql, doc)
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"[SUPABASE] upsert_document '{doc.get('document_id')}' failed: {type(e).__name__}: {e}")
        return False


def get_all_documents() -> List[Dict[str, Any]]:
    """
    Fetch all document metadata rows from Supabase.
    Returns empty list on failure.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT document_id, filename, file_type, file_size_bytes, file_size_formatted, "
                "upload_path, status, pages, text_blocks, chunks, embeddings, description, "
                "uploaded_by, uploaded_at FROM documents ORDER BY uploaded_at ASC"
            ))
            rows = result.mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f"[SUPABASE] get_all_documents failed: {type(e).__name__}")
        return []


def update_document_status(document_id: str, status: str, **extra_fields) -> bool:
    """
    Update status (and optional extra fields like pages, chunks, embeddings) for a document.
    Returns True on success, False on failure.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        set_clauses = ["status = :status"]
        params: Dict[str, Any] = {"status": status, "document_id": document_id}
        for field in ("pages", "text_blocks", "chunks", "embeddings"):
            if field in extra_fields:
                set_clauses.append(f"{field} = :{field}")
                params[field] = extra_fields[field]
        sql = text(f"UPDATE documents SET {', '.join(set_clauses)} WHERE document_id = :document_id")
        with engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f"[SUPABASE] update_document_status failed: {type(e).__name__}")
        return False
