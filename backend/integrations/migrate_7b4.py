"""
STEP 7B-4 — P3 Learner Progress & Mastery Supabase Migration
Migrates P3 learner progress from JSON files (backend/data/learner_progress/)
to Supabase PostgreSQL (public.learner_progress table).
Each topic mastery record is stored as a first-class, indexed row with canonical identity & competency links.
"""
import os
import sys
import json
import re
import logging
from pathlib import Path
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

# Setup paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "learning"))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "workforce"))

from integrations.identity_mapping import identity_service
from integrations.competency_mapping import competency_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_7b4")

DEFAULT_PG_URL = "postgresql://postgres.dgbmxefpfcledhifnxyv:Marisamenezes-123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
PG_URL = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL", DEFAULT_PG_URL))
PROGRESS_DIR = _BACKEND_DIR / "data" / "learner_progress"

DDL_LEARNER_PROGRESS = """
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

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_lp_canonical ON learner_progress (canonical_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_competency ON learner_progress (competency_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_learner ON learner_progress (learner_id);",
    "CREATE INDEX IF NOT EXISTS idx_lp_mastery ON learner_progress (mastery_state);"
]


def ensure_topic_schema(pg_conn):
    """Ensures learner_progress table exists with the topic-level schema."""
    cur = pg_conn.cursor()
    # Check if table exists and what columns it has
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'learner_progress';
    """)
    cols = [r[0] for r in cur.fetchall()]

    if cols and "topic" not in cols:
        logger.info("Migrating legacy aggregate learner_progress table to topic-level schema...")
        cur.execute("DROP TABLE IF EXISTS learner_progress CASCADE;")
        pg_conn.commit()

    cur.execute(DDL_LEARNER_PROGRESS)
    for idx in INDEX_STATEMENTS:
        cur.execute(idx)
    pg_conn.commit()
    cur.close()
    logger.info("Supabase learner_progress topic-level table verified/created.")


def slugify(text: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9_]+', '_', text.lower()).strip('_')
    return clean[:40]


def migrate_json_progress(pg_conn):
    """Reads all JSON progress profiles from disk and upserts into Supabase."""
    cur = pg_conn.cursor()

    json_files = list(PROGRESS_DIR.glob("*.json"))
    logger.info(f"Found {len(json_files)} JSON progress file(s) in {PROGRESS_DIR}")

    total_json_topics = 0
    records_to_upsert = []

    for f_path in json_files:
        try:
            with open(f_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read {f_path}: {e}")
            continue

        learner_id = data.get("learner_id", f_path.stem)
        resolved_identity = identity_service.resolve(learner_id)
        canonical_uid = resolved_identity.canonical_user_id if resolved_identity else None
        cid_prefix = canonical_uid[:8] if canonical_uid else learner_id[:8]

        topics = data.get("topics", {})
        for topic_name, tp in topics.items():
            total_json_topics += 1

            # Map topic to canonical competency
            canon_comp, comp_status, _ = competency_service.map_p3_topic_to_canonical(topic_name)
            # Try fuzzy/prefix match if unresolved
            if not canon_comp:
                clean_prefix = topic_name.split()[0] if topic_name else ""
                if clean_prefix:
                    canon_comp, _, _ = competency_service.map_p3_topic_to_canonical(clean_prefix)

            comp_id = canon_comp.competency_id if canon_comp else None
            comp_name = canon_comp.name if canon_comp else None

            # Calibrated mastery score (1.0 - 5.0)
            rec_acc = float(tp.get("recent_accuracy", tp.get("accuracy", 0.0)))
            mastery_score = round(1.0 + (rec_acc / 100.0) * 4.0, 2)
            mastery_score = min(5.0, max(1.0, mastery_score))

            deterministic_id = f"lp_{cid_prefix}_{slugify(topic_name)}"

            records_to_upsert.append((
                deterministic_id,
                canonical_uid,
                learner_id,
                topic_name,
                comp_id,
                comp_name,
                int(tp.get("attempts", 0)),
                int(tp.get("questions_attempted", 0)),
                int(tp.get("correct_answers", 0)),
                int(tp.get("incorrect_answers", 0)),
                float(tp.get("accuracy", 0.0)),
                rec_acc,
                mastery_score,
                str(tp.get("status", "LEARNING")),
                str(tp.get("trend", "INSUFFICIENT_DATA")),
                tp.get("first_seen_at") or tp.get("first_attempt_at"),
                tp.get("last_practiced_at") or tp.get("last_attempt_at"),
                json.dumps(tp.get("history", [])),
                json.dumps({"source": "P3_JSON_MIGRATION", "file": f_path.name})
            ))

    sql = """
        INSERT INTO learner_progress (
            id, canonical_user_id, learner_id, topic, competency_id, competency_name,
            attempts, questions_attempted, correct_answers, incorrect_answers,
            accuracy, recent_accuracy, mastery_score, mastery_state, trend,
            first_attempt_at, last_attempt_at, history, metadata, updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, NOW()
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
    """
    if records_to_upsert:
        execute_batch(cur, sql, records_to_upsert)
        pg_conn.commit()

    cur.close()
    logger.info(f"Successfully migrated {len(records_to_upsert)} topic progress records to Supabase.")
    return total_json_topics


def verify_migration(pg_conn, expected_count: int):
    """Compares migrated records count and checks data integrity."""
    cur = pg_conn.cursor()
    cur.execute("SELECT count(*) FROM learner_progress;")
    pg_count = cur.fetchone()[0]

    cur.execute("""
        SELECT id, canonical_user_id, learner_id, topic, competency_name, mastery_state, accuracy, recent_accuracy, mastery_score
        FROM learner_progress
        ORDER BY learner_id, topic;
    """)
    rows = cur.fetchall()

    print("\n" + "=" * 100)
    print(f"{'Topic':35} | {'Learner':8} | {'Canonical User':36} | {'State':12} | {'Score':5} | {'Acc %':6}")
    print("=" * 100)
    for r in rows:
        c_uid = str(r[1]) if r[1] else "None"
        print(f"{r[3]:35} | {r[2]:8} | {c_uid:36} | {r[5]:12} | {float(r[8]):5.2f} | {float(r[6]):6.2f}")
    print("=" * 100)
    print(f"JSON Source Topics : {expected_count}")
    print(f"Supabase Rows      : {pg_count}")
    print(f"Difference         : {pg_count - expected_count}")
    print(f"Status             : {'MATCH' if pg_count == expected_count else 'DIFF'}")
    print("=" * 100 + "\n")

    cur.close()
    return pg_count == expected_count


def run():
    logger.info("Starting Step 7B-4 Learner Progress Migration...")
    conn = psycopg2.connect(PG_URL)
    try:
        ensure_topic_schema(conn)
        expected = migrate_json_progress(conn)
        matched = verify_migration(conn, expected)
        if not matched:
            logger.error("Count mismatch in learner progress migration!")
            sys.exit(1)
        logger.info("Step 7B-4 migration completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    run()
