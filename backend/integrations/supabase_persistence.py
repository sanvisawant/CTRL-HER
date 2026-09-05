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
from datetime import datetime

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
    id                      VARCHAR(120) PRIMARY KEY,
    canonical_user_id       UUID,
    learner_id              VARCHAR(50) NOT NULL,
    topic                   VARCHAR(255) NOT NULL,
    competency_id           INTEGER,
    competency_name         VARCHAR(150),
    attempts                INTEGER DEFAULT 0,
    questions_attempted     INTEGER DEFAULT 0,
    correct_answers         INTEGER DEFAULT 0,
    incorrect_answers       INTEGER DEFAULT 0,
    accuracy                NUMERIC(5, 2) DEFAULT 0.0,
    recent_accuracy         NUMERIC(5, 2) DEFAULT 0.0,
    mastery_score           NUMERIC(4, 2) DEFAULT 1.0,
    mastery_state           VARCHAR(30) DEFAULT 'LEARNING',
    trend                   VARCHAR(30) DEFAULT 'INSUFFICIENT_DATA',
    first_attempt_at        TIMESTAMPTZ,
    last_attempt_at         TIMESTAMPTZ,
    history                 JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_learner_progress_lid_topic UNIQUE (learner_id, topic)
);
"""
_DDL_LEARNER_PROGRESS_IDX = [
    "CREATE INDEX IF NOT EXISTS idx_lp_canonical ON learner_progress (canonical_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_competency ON learner_progress (competency_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_learner ON learner_progress (learner_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_mastery ON learner_progress (mastery_state);"
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
    Persist learner progress profile to Supabase.
    Inserts/updates each topic as a first-class record in learner_progress.
    """
    try:
        from sqlalchemy import text
        from integrations.identity_mapping import identity_service
        from integrations.competency_mapping import competency_service
        import re

        engine = _get_engine()
        learner_id = profile_data["learner_id"]
        canonical_uid = profile_data.get("canonical_user_id")
        if not canonical_uid:
            resolved = identity_service.resolve(learner_id)
            canonical_uid = resolved.canonical_user_id if resolved else None

        cid_prefix = str(canonical_uid)[:8] if canonical_uid else learner_id[:8]
        topics = profile_data.get("topics", {})

        if not topics:
            return True

        sql = text("""
            INSERT INTO learner_progress (
                id, canonical_user_id, learner_id, topic, competency_id, competency_name,
                attempts, questions_attempted, correct_answers, incorrect_answers,
                accuracy, recent_accuracy, mastery_score, mastery_state, trend,
                first_attempt_at, last_attempt_at, history, metadata, updated_at
            )
            VALUES (
                :id, :canonical_user_id, :learner_id, :topic, :competency_id, :competency_name,
                :attempts, :questions_attempted, :correct_answers, :incorrect_answers,
                :accuracy, :recent_accuracy, :mastery_score, :mastery_state, :trend,
                :first_attempt_at, :last_attempt_at, CAST(:history AS jsonb), CAST(:metadata AS jsonb), NOW()
            )
            ON CONFLICT (learner_id, topic) DO UPDATE SET
                canonical_user_id   = COALESCE(EXCLUDED.canonical_user_id, learner_progress.canonical_user_id),
                competency_id       = COALESCE(EXCLUDED.competency_id, learner_progress.competency_id),
                competency_name     = COALESCE(EXCLUDED.competency_name, learner_progress.competency_name),
                attempts            = EXCLUDED.attempts,
                questions_attempted = EXCLUDED.questions_attempted,
                correct_answers     = EXCLUDED.correct_answers,
                incorrect_answers   = EXCLUDED.incorrect_answers,
                accuracy            = EXCLUDED.accuracy,
                recent_accuracy     = EXCLUDED.recent_accuracy,
                mastery_score       = EXCLUDED.mastery_score,
                mastery_state       = EXCLUDED.mastery_state,
                trend               = EXCLUDED.trend,
                first_attempt_at    = COALESCE(learner_progress.first_attempt_at, EXCLUDED.first_attempt_at),
                last_attempt_at     = EXCLUDED.last_attempt_at,
                history             = EXCLUDED.history,
                metadata            = EXCLUDED.metadata,
                updated_at          = NOW();
        """)

        with engine.connect() as conn:
            for topic_name, tp in topics.items():
                if hasattr(tp, "model_dump"):
                    tp_dict = tp.model_dump()
                elif isinstance(tp, dict):
                    tp_dict = tp
                else:
                    tp_dict = {}

                # Map topic to canonical competency
                canon_comp, _, _ = competency_service.map_p3_topic_to_canonical(topic_name)
                if not canon_comp:
                    clean_prefix = topic_name.split()[0] if topic_name else ""
                    if clean_prefix:
                        canon_comp, _, _ = competency_service.map_p3_topic_to_canonical(clean_prefix)

                comp_id = canon_comp.competency_id if canon_comp else None
                comp_name = canon_comp.name if canon_comp else None

                rec_acc = float(tp_dict.get("recent_accuracy", tp_dict.get("accuracy", 0.0)))
                mastery_score = round(1.0 + (rec_acc / 100.0) * 4.0, 2)
                mastery_score = min(5.0, max(1.0, mastery_score))

                clean_slug = re.sub(r'[^a-zA-Z0-9_]+', '_', topic_name.lower()).strip('_')[:40]
                det_id = f"lp_{cid_prefix}_{clean_slug}"

                first_at = tp_dict.get("first_seen_at") or tp_dict.get("first_attempt_at")
                last_at = tp_dict.get("last_practiced_at") or tp_dict.get("last_attempt_at")

                params = {
                    "id": det_id,
                    "canonical_user_id": canonical_uid,
                    "learner_id": learner_id,
                    "topic": topic_name,
                    "competency_id": comp_id,
                    "competency_name": comp_name,
                    "attempts": int(tp_dict.get("attempts", 0)),
                    "questions_attempted": int(tp_dict.get("questions_attempted", 0)),
                    "correct_answers": int(tp_dict.get("correct_answers", 0)),
                    "incorrect_answers": int(tp_dict.get("incorrect_answers", 0)),
                    "accuracy": float(tp_dict.get("accuracy", 0.0)),
                    "recent_accuracy": rec_acc,
                    "mastery_score": mastery_score,
                    "mastery_state": str(tp_dict.get("status", tp_dict.get("mastery_state", "LEARNING"))),
                    "trend": str(tp_dict.get("trend", "INSUFFICIENT_DATA")),
                    "first_attempt_at": first_at,
                    "last_attempt_at": last_at,
                    "history": json.dumps(tp_dict.get("history", [])),
                    "metadata": json.dumps({"source": "P3_PROGRESS_SERVICE"}),
                }
                conn.execute(sql, params)
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f"[SUPABASE] upsert_learner_progress '{profile_data.get('learner_id')}' failed: {e}")
        return False


def get_learner_progress_row(learner_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve learner_progress from Supabase by learner_id or canonical UUID.
    Assembles individual topic progress rows into an aggregate profile dictionary.
    """
    try:
        from sqlalchemy import text
        from integrations.identity_mapping import identity_service
        engine = _get_engine()

        resolved = identity_service.resolve(learner_id)
        canonical_uid = resolved.canonical_user_id if resolved else None

        sql = text("""
            SELECT id, canonical_user_id, learner_id, topic, competency_id, competency_name,
                   attempts, questions_attempted, correct_answers, incorrect_answers,
                   accuracy, recent_accuracy, mastery_score, mastery_state, trend,
                   first_attempt_at, last_attempt_at, history, metadata,
                   created_at, updated_at
            FROM learner_progress
            WHERE learner_id = :learner_id 
               OR (canonical_user_id IS NOT NULL AND canonical_user_id = :canonical_uid)
            ORDER BY topic
        """)
        params = {"learner_id": learner_id, "canonical_uid": canonical_uid}
        with engine.connect() as conn:
            rows = [dict(r) for r in conn.execute(sql, params).mappings().all()]
            if not rows:
                return None

            topics = {}
            mastered_count = 0
            needing_review_count = 0
            improving_count = 0
            total_attempted = 0
            total_correct = 0

            for r in rows:
                t_name = r["topic"]
                hist = r.get("history")
                if isinstance(hist, str):
                    hist = json.loads(hist)
                elif hist is None:
                    hist = []

                first_str = r["first_attempt_at"].isoformat() if r.get("first_attempt_at") else ""
                last_str = r["last_attempt_at"].isoformat() if r.get("last_attempt_at") else ""

                m_state = r["mastery_state"] or "LEARNING"
                if m_state == "MASTERED":
                    mastered_count += 1
                elif m_state == "NEEDS_REVIEW":
                    needing_review_count += 1
                elif m_state == "IMPROVING":
                    improving_count += 1

                q_att = int(r.get("questions_attempted") or 0)
                c_ans = int(r.get("correct_answers") or 0)
                total_attempted += q_att
                total_correct += c_ans

                topics[t_name] = {
                    "topic": t_name,
                    "attempts": int(r.get("attempts") or 0),
                    "questions_attempted": q_att,
                    "correct_answers": c_ans,
                    "incorrect_answers": int(r.get("incorrect_answers") or 0),
                    "accuracy": float(r.get("accuracy") or 0.0),
                    "recent_accuracy": float(r.get("recent_accuracy") or 0.0),
                    "status": m_state,
                    "trend": r.get("trend") or "INSUFFICIENT_DATA",
                    "first_seen_at": first_str,
                    "last_practiced_at": last_str,
                    "history": hist
                }

            overall_acc = round((total_correct / total_attempted) * 100.0, 2) if total_attempted > 0 else 0.0
            latest_updated = max((r["updated_at"] for r in rows if r.get("updated_at")), default=datetime.utcnow())
            earliest_created = min((r["created_at"] for r in rows if r.get("created_at")), default=datetime.utcnow())

            return {
                "learner_id": learner_id,
                "canonical_user_id": canonical_uid or rows[0].get("canonical_user_id"),
                "total_tracked_topics": len(topics),
                "mastered_topics": mastered_count,
                "topics_needing_review": needing_review_count,
                "improving_topics": improving_count,
                "overall_accuracy": overall_acc,
                "topics": topics,
                "created_at": earliest_created,
                "updated_at": latest_updated
            }
    except Exception as e:
        logger.warning(f"[SUPABASE] get_learner_progress_row '{learner_id}' failed: {e}")
        return None


def get_learner_topic_rows(learner_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve all raw topic-level learner_progress rows from Supabase.
    """
    try:
        from sqlalchemy import text
        from integrations.identity_mapping import identity_service
        engine = _get_engine()
        resolved = identity_service.resolve(learner_id)
        canonical_uid = resolved.canonical_user_id if resolved else None

        sql = text("""
            SELECT id, canonical_user_id, learner_id, topic, competency_id, competency_name,
                   attempts, questions_attempted, correct_answers, incorrect_answers,
                   accuracy, recent_accuracy, mastery_score, mastery_state, trend,
                   first_attempt_at, last_attempt_at, history, metadata,
                   created_at, updated_at
            FROM learner_progress
            WHERE learner_id = :learner_id 
               OR (canonical_user_id IS NOT NULL AND canonical_user_id = :canonical_uid)
            ORDER BY topic
        """)
        with engine.connect() as conn:
            return [dict(r) for r in conn.execute(sql, {"learner_id": learner_id, "canonical_uid": canonical_uid}).mappings().all()]
    except Exception as e:
        logger.warning(f"[SUPABASE] get_learner_topic_rows '{learner_id}' failed: {e}")
        return []


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
