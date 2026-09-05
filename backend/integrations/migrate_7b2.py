"""
StatSaksham AI — Step 7B-2 Migration Script
Creates learner_progress, quiz_sessions, and question_bank tables in Supabase,
then migrates existing JSON store records.

Safe to re-run idempotently.
"""
import sys
import json
import logging
from pathlib import Path

# Set up paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
_LEARNING_DIR = _BACKEND_DIR / "modules" / "learning"
if _LEARNING_DIR.exists() and str(_LEARNING_DIR) not in sys.path:
    sys.path.insert(0, str(_LEARNING_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_7b2")

from integrations.supabase_persistence import (
    create_7b2_tables,
    upsert_learner_progress,
    upsert_quiz_session,
    upsert_question_bank_item,
    get_learner_progress_row,
    get_quiz_session_row,
    get_question_bank_item_row,
    check_table_exists,
    _get_engine,
)
from integrations.identity_mapping import identity_service


def migrate_learner_progress() -> int:
    """Migrate all JSON learner progress profiles to Supabase."""
    progress_dir = _BACKEND_DIR / "data" / "learner_progress"
    if not progress_dir.exists():
        return 0

    count = 0
    for f in progress_dir.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fl:
                data = json.load(fl)
            learner_id = data.get("learner_id") or f.stem
            canonical_id = identity_service.resolve_to_canonical_id(learner_id)
            data["learner_id"] = learner_id
            data["canonical_user_id"] = canonical_id
            if upsert_learner_progress(data):
                count += 1
                logger.info(f"  [MIGRATED] Learner progress: {learner_id}")
        except Exception as e:
            logger.error(f"  [ERROR] Failed migrating learner progress '{f.name}': {e}")
    return count


def migrate_quizzes() -> int:
    """Migrate all JSON quiz sessions to Supabase."""
    quizzes_dir = _BACKEND_DIR / "data" / "quizzes"
    if not quizzes_dir.exists():
        return 0

    count = 0
    for f in quizzes_dir.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fl:
                data = json.load(fl)
            quiz_id = data.get("quiz_id") or f.stem
            learner_id = data.get("learner_id", "unknown")
            canonical_id = identity_service.resolve_to_canonical_id(learner_id)
            data["quiz_id"] = quiz_id
            data["canonical_user_id"] = canonical_id
            if data.get("result"):
                data["score"] = data["result"].get("score")
                data["percentage"] = data["result"].get("percentage")
            if upsert_quiz_session(data):
                count += 1
                logger.info(f"  [MIGRATED] Quiz session: {quiz_id}")
        except Exception as e:
            logger.error(f"  [ERROR] Failed migrating quiz '{f.name}': {e}")
    return count


def migrate_question_bank() -> int:
    """Migrate all JSON question bank items to Supabase."""
    qb_dir = _BACKEND_DIR / "data" / "question_bank"
    if not qb_dir.exists():
        return 0

    count = 0
    for f in qb_dir.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fl:
                data = json.load(fl)
            qid = data.get("question_id") or f.stem
            data["question_id"] = qid
            if "source" in data and isinstance(data["source"], dict):
                data["document_id"] = data["source"].get("document_id")
            if upsert_question_bank_item(data):
                count += 1
                logger.info(f"  [MIGRATED] Question bank item: {qid} (status: {data.get('status')})")
        except Exception as e:
            logger.error(f"  [ERROR] Failed migrating question '{f.name}': {e}")
    return count


def main():
    print("=" * 65)
    print("STATSAKSHAM AI — STEP 7B-2 SUPABASE MIGRATION RUNNER")
    print("=" * 65)

    print("\n1. Verifying / Creating Supabase Tables...")
    success = create_7b2_tables()
    if not success:
        print("[FAIL] Failed to create 7B-2 tables in Supabase.")
        sys.exit(1)
    print("   [OK] Tables created or already exist.")

    print("\n2. Migrating Learner Progress...")
    lp_migrated = migrate_learner_progress()
    print(f"   Migrated {lp_migrated} learner progress profile(s).")

    print("\n3. Migrating Quiz Sessions...")
    qs_migrated = migrate_quizzes()
    print(f"   Migrated {qs_migrated} quiz session(s).")

    print("\n4. Migrating Question Bank Items...")
    qb_migrated = migrate_question_bank()
    print(f"   Migrated {qb_migrated} question bank item(s).")

    print("\n5. Verifying Row Counts in Supabase...")
    from sqlalchemy import text
    engine = _get_engine()
    with engine.connect() as conn:
        lp_cnt = conn.execute(text("SELECT count(*) FROM learner_progress")).scalar()
        qs_cnt = conn.execute(text("SELECT count(*) FROM quiz_sessions")).scalar()
        qb_cnt = conn.execute(text("SELECT count(*) FROM question_bank")).scalar()
        print(f"   Supabase 'learner_progress' count: {lp_cnt}")
        print(f"   Supabase 'quiz_sessions' count:    {qs_cnt}")
        print(f"   Supabase 'question_bank' count:    {qb_cnt}")

    print("\n" + "=" * 65)
    print("STEP 7B-2 MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 65)


if __name__ == "__main__":
    main()
