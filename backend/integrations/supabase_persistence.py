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
import json
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


# ---------------------------------------------------------------------------
# Step 7B-2 DDL — learner_progress, quiz_sessions, question_bank
# ---------------------------------------------------------------------------

_DDL_LEARNER_PROGRESS = """
CREATE TABLE IF NOT EXISTS learner_progress (
    learner_id              VARCHAR(50) PRIMARY KEY,
    canonical_user_id       UUID,
    total_tracked_topics    INTEGER DEFAULT 0,
    mastered_topics         INTEGER DEFAULT 0,
    topics_needing_review   INTEGER DEFAULT 0,
    improving_topics        INTEGER DEFAULT 0,
    overall_accuracy        NUMERIC(5, 2) DEFAULT 0.0,
    topics                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
"""
_DDL_LEARNER_PROGRESS_IDX = [
    "CREATE INDEX IF NOT EXISTS idx_lp_canonical ON learner_progress (canonical_user_id);"
]

_DDL_QUIZ_SESSIONS = """
CREATE TABLE IF NOT EXISTS quiz_sessions (
    quiz_id                 VARCHAR(100) PRIMARY KEY,
    learner_id              VARCHAR(50) NOT NULL,
    canonical_user_id       UUID,
    document_id             VARCHAR(100) NOT NULL,
    topic                   TEXT,
    difficulty              VARCHAR(30) DEFAULT 'medium',
    status                  VARCHAR(30) DEFAULT 'IN_PROGRESS',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    submitted_at            TIMESTAMPTZ,
    score                   INTEGER,
    percentage              NUMERIC(5, 2),
    parent_quiz_id          VARCHAR(100),
    adaptive_round          INTEGER DEFAULT 0,
    adaptive_target_topic   TEXT,
    questions_snapshot      JSONB NOT NULL DEFAULT '[]'::jsonb,
    submission              JSONB,
    result                  JSONB,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
"""
_DDL_QUIZ_SESSIONS_IDX = [
    "CREATE INDEX IF NOT EXISTS idx_qs_learner ON quiz_sessions (learner_id);",
    "CREATE INDEX IF NOT EXISTS idx_qs_status ON quiz_sessions (status);",
    "CREATE INDEX IF NOT EXISTS idx_qs_canonical ON quiz_sessions (canonical_user_id);"
]

_DDL_QUESTION_BANK = """
CREATE TABLE IF NOT EXISTS question_bank (
    question_id             VARCHAR(100) PRIMARY KEY,
    question                TEXT NOT NULL,
    options                 JSONB NOT NULL,
    correct_answer          VARCHAR(10) NOT NULL,
    explanation             TEXT,
    difficulty              VARCHAR(20) DEFAULT 'medium',
    topic                   VARCHAR(100) DEFAULT 'General',
    document_id             VARCHAR(100),
    source                  JSONB NOT NULL,
    status                  VARCHAR(20) DEFAULT 'DRAFT',
    origin                  VARCHAR(20) DEFAULT 'GENERATED',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at             TIMESTAMPTZ,
    reviewed_by             VARCHAR(100)
);
"""
_DDL_QUESTION_BANK_IDX = [
    "CREATE INDEX IF NOT EXISTS idx_qb_status ON question_bank (status);",
    "CREATE INDEX IF NOT EXISTS idx_qb_topic ON question_bank (topic);",
    "CREATE INDEX IF NOT EXISTS idx_qb_document_id ON question_bank (document_id);",
    "CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank (difficulty);"
]


def create_7b2_tables() -> bool:
    """
    Create learner_progress, quiz_sessions, and question_bank tables in Supabase.
    Idempotent — safe to run multiple times.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            # 1. learner_progress
            conn.execute(text(_DDL_LEARNER_PROGRESS))
            for idx in _DDL_LEARNER_PROGRESS_IDX:
                try:
                    conn.execute(text(idx))
                except Exception as e:
                    logger.debug(f"learner_progress index notice: {e}")

            # 2. quiz_sessions
            conn.execute(text(_DDL_QUIZ_SESSIONS))
            for idx in _DDL_QUIZ_SESSIONS_IDX:
                try:
                    conn.execute(text(idx))
                except Exception as e:
                    logger.debug(f"quiz_sessions index notice: {e}")

            # 3. question_bank
            conn.execute(text(_DDL_QUESTION_BANK))
            for idx in _DDL_QUESTION_BANK_IDX:
                try:
                    conn.execute(text(idx))
                except Exception as e:
                    logger.debug(f"question_bank index notice: {e}")

            conn.commit()
        logger.info("Supabase 7B-2 tables (learner_progress, quiz_sessions, question_bank) verified/created.")
        return True
    except Exception as e:
        logger.error(f"[SUPABASE] Failed to create 7B-2 tables: {type(e).__name__}: {e}")
        return False


# ---------------------------------------------------------------------------
# learner_progress CRUD
# ---------------------------------------------------------------------------

def upsert_learner_progress(profile_data: Dict[str, Any]) -> bool:
    """
    Insert or update a learner_progress record in Supabase.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        topics_json = json.dumps(profile_data.get("topics", {}))
        params = {
            "learner_id": profile_data["learner_id"],
            "canonical_user_id": profile_data.get("canonical_user_id"),
            "total_tracked_topics": profile_data.get("total_tracked_topics", 0),
            "mastered_topics": profile_data.get("mastered_topics", 0),
            "topics_needing_review": profile_data.get("topics_needing_review", 0),
            "improving_topics": profile_data.get("improving_topics", 0),
            "overall_accuracy": profile_data.get("overall_accuracy", 0.0),
            "topics": topics_json,
        }
        sql = text("""
            INSERT INTO learner_progress
                (learner_id, canonical_user_id, total_tracked_topics, mastered_topics,
                 topics_needing_review, improving_topics, overall_accuracy, topics, updated_at)
            VALUES
                (:learner_id, :canonical_user_id, :total_tracked_topics, :mastered_topics,
                 :topics_needing_review, :improving_topics, :overall_accuracy, CAST(:topics AS jsonb), NOW())
            ON CONFLICT (learner_id)
            DO UPDATE SET
                canonical_user_id     = COALESCE(EXCLUDED.canonical_user_id, learner_progress.canonical_user_id),
                total_tracked_topics  = EXCLUDED.total_tracked_topics,
                mastered_topics       = EXCLUDED.mastered_topics,
                topics_needing_review = EXCLUDED.topics_needing_review,
                improving_topics      = EXCLUDED.improving_topics,
                overall_accuracy      = EXCLUDED.overall_accuracy,
                topics                = EXCLUDED.topics,
                updated_at            = NOW()
        """)
        with engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f"[SUPABASE] upsert_learner_progress '{profile_data.get('learner_id')}' failed: {e}")
        return False


def get_learner_progress_row(learner_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve learner_progress from Supabase by learner_id.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        sql = text("""
            SELECT learner_id, canonical_user_id, total_tracked_topics, mastered_topics,
                   topics_needing_review, improving_topics, overall_accuracy, topics,
                   created_at, updated_at
            FROM learner_progress
            WHERE learner_id = :learner_id
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, {"learner_id": learner_id}).mappings().first()
            if res:
                return dict(res)
            return None
    except Exception as e:
        logger.warning(f"[SUPABASE] get_learner_progress_row '{learner_id}' failed: {e}")
        return None


# ---------------------------------------------------------------------------
# quiz_sessions CRUD
# ---------------------------------------------------------------------------

def upsert_quiz_session(session_data: Dict[str, Any]) -> bool:
    """
    Insert or update a quiz_session record in Supabase.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        params = {
            "quiz_id": session_data["quiz_id"],
            "learner_id": session_data["learner_id"],
            "canonical_user_id": session_data.get("canonical_user_id"),
            "document_id": session_data["document_id"],
            "topic": session_data.get("topic"),
            "difficulty": session_data.get("difficulty", "medium"),
            "status": session_data.get("status", "IN_PROGRESS"),
            "created_at": session_data.get("created_at"),
            "submitted_at": session_data.get("submitted_at"),
            "score": session_data.get("score"),
            "percentage": session_data.get("percentage"),
            "parent_quiz_id": session_data.get("parent_quiz_id"),
            "adaptive_round": session_data.get("adaptive_round", 0),
            "adaptive_target_topic": session_data.get("adaptive_target_topic"),
            "questions_snapshot": json.dumps(session_data.get("questions_snapshot", [])),
            "submission": json.dumps(session_data["submission"]) if session_data.get("submission") else None,
            "result": json.dumps(session_data["result"]) if session_data.get("result") else None,
        }
        sql = text("""
            INSERT INTO quiz_sessions
                (quiz_id, learner_id, canonical_user_id, document_id, topic, difficulty,
                 status, created_at, submitted_at, score, percentage, parent_quiz_id,
                 adaptive_round, adaptive_target_topic, questions_snapshot, submission, result, updated_at)
            VALUES
                (:quiz_id, :learner_id, :canonical_user_id, :document_id, :topic, :difficulty,
                 :status, :created_at, :submitted_at, :score, :percentage, :parent_quiz_id,
                 :adaptive_round, :adaptive_target_topic, CAST(:questions_snapshot AS jsonb),
                 CAST(:submission AS jsonb), CAST(:result AS jsonb), NOW())
            ON CONFLICT (quiz_id)
            DO UPDATE SET
                status                 = EXCLUDED.status,
                submitted_at           = EXCLUDED.submitted_at,
                score                  = EXCLUDED.score,
                percentage             = EXCLUDED.percentage,
                submission             = EXCLUDED.submission,
                result                 = EXCLUDED.result,
                updated_at             = NOW()
        """)
        with engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f"[SUPABASE] upsert_quiz_session '{session_data.get('quiz_id')}' failed: {e}")
        return False


def get_quiz_session_row(quiz_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve quiz_session from Supabase by quiz_id.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        sql = text("""
            SELECT quiz_id, learner_id, canonical_user_id, document_id, topic, difficulty,
                   status, created_at, submitted_at, score, percentage, parent_quiz_id,
                   adaptive_round, adaptive_target_topic, questions_snapshot, submission, result,
                   updated_at
            FROM quiz_sessions
            WHERE quiz_id = :quiz_id
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, {"quiz_id": quiz_id}).mappings().first()
            if res:
                return dict(res)
            return None
    except Exception as e:
        logger.warning(f"[SUPABASE] get_quiz_session_row '{quiz_id}' failed: {e}")
        return None


# ---------------------------------------------------------------------------
# question_bank CRUD
# ---------------------------------------------------------------------------

def upsert_question_bank_item(item_data: Dict[str, Any]) -> bool:
    """
    Insert or update a question_bank record in Supabase.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        params = {
            "question_id": item_data["question_id"],
            "question": item_data["question"],
            "options": json.dumps(item_data.get("options", [])),
            "correct_answer": item_data["correct_answer"],
            "explanation": item_data.get("explanation", ""),
            "difficulty": item_data.get("difficulty", "medium"),
            "topic": item_data.get("topic", "General"),
            "document_id": item_data.get("document_id"),
            "source": json.dumps(item_data.get("source", {})),
            "status": item_data.get("status", "DRAFT"),
            "origin": item_data.get("origin", "GENERATED"),
            "created_at": item_data.get("created_at"),
            "updated_at": item_data.get("updated_at"),
            "reviewed_at": item_data.get("reviewed_at"),
            "reviewed_by": item_data.get("reviewed_by"),
        }
        sql = text("""
            INSERT INTO question_bank
                (question_id, question, options, correct_answer, explanation, difficulty,
                 topic, document_id, source, status, origin, created_at, updated_at,
                 reviewed_at, reviewed_by)
            VALUES
                (:question_id, :question, CAST(:options AS jsonb), :correct_answer, :explanation, :difficulty,
                 :topic, :document_id, CAST(:source AS jsonb), :status, :origin, :created_at, :updated_at,
                 :reviewed_at, :reviewed_by)
            ON CONFLICT (question_id)
            DO UPDATE SET
                question       = EXCLUDED.question,
                options        = EXCLUDED.options,
                correct_answer = EXCLUDED.correct_answer,
                explanation    = EXCLUDED.explanation,
                difficulty     = EXCLUDED.difficulty,
                topic          = EXCLUDED.topic,
                document_id    = EXCLUDED.document_id,
                source         = EXCLUDED.source,
                status         = EXCLUDED.status,
                origin         = EXCLUDED.origin,
                updated_at     = EXCLUDED.updated_at,
                reviewed_at    = EXCLUDED.reviewed_at,
                reviewed_by    = EXCLUDED.reviewed_by
        """)
        with engine.connect() as conn:
            conn.execute(sql, params)
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f"[SUPABASE] upsert_question_bank_item '{item_data.get('question_id')}' failed: {e}")
        return False


def get_question_bank_item_row(question_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve question_bank record from Supabase by question_id.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        sql = text("""
            SELECT question_id, question, options, correct_answer, explanation, difficulty,
                   topic, document_id, source, status, origin, created_at, updated_at,
                   reviewed_at, reviewed_by
            FROM question_bank
            WHERE question_id = :question_id
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, {"question_id": question_id}).mappings().first()
            if res:
                return dict(res)
            return None
    except Exception as e:
        logger.warning(f"[SUPABASE] get_question_bank_item_row '{question_id}' failed: {e}")
        return None


def list_question_bank_rows(
    status: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    document_id: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List and filter question_bank records from Supabase.
    """
    try:
        from sqlalchemy import text
        engine = _get_engine()
        clauses = []
        params: Dict[str, Any] = {}

        if status:
            clauses.append("UPPER(status) = :status")
            params["status"] = status.strip().upper()
        if topic:
            clauses.append("LOWER(topic) LIKE :topic")
            params["topic"] = f"%{topic.strip().lower()}%"
        if difficulty:
            clauses.append("LOWER(difficulty) = :difficulty")
            params["difficulty"] = difficulty.strip().lower()
        if document_id:
            clauses.append("document_id = :document_id")
            params["document_id"] = document_id
        if search:
            clauses.append("(LOWER(question) LIKE :search OR LOWER(topic) LIKE :search)")
            params["search"] = f"%{search.strip().lower()}%"

        where_str = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = text(f"""
            SELECT question_id, question, options, correct_answer, explanation, difficulty,
                   topic, document_id, source, status, origin, created_at, updated_at,
                   reviewed_at, reviewed_by
            FROM question_bank
            {where_str}
            ORDER BY updated_at DESC
        """)
        with engine.connect() as conn:
            res = conn.execute(sql, params).mappings().all()
            return [dict(r) for r in res]
    except Exception as e:
        logger.warning(f"[SUPABASE] list_question_bank_rows failed: {e}")
        return []
