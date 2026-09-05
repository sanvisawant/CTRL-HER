"""
STEP 7B-3 — P4 Workforce Analytics & Gamification Supabase Migration
Migrates P4 data from SQLite (backend/data/statsaksham.db) to Supabase PostgreSQL (schema 'workforce').
Idempotent migration with reconciliation of identity and competencies.
"""
import os
import sys
import sqlite3
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
logger = logging.getLogger("migrate_7b3")

# Supabase connection URL
DEFAULT_PG_URL = "postgresql://postgres.dgbmxefpfcledhifnxyv:Marisamenezes-123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
PG_URL = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL", DEFAULT_PG_URL))
SQLITE_PATH = _BACKEND_DIR / "data" / "statsaksham.db"

# DDL for workforce schema tables
DDL_STATEMENTS = [
    "CREATE SCHEMA IF NOT EXISTS workforce;",

    """
    CREATE TABLE IF NOT EXISTS workforce.departments (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        head_name VARCHAR(100),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.competencies (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(30) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        domain VARCHAR(50) NOT NULL,
        description TEXT,
        baseline_required_level FLOAT DEFAULT 4.0,
        is_emerging BOOLEAN DEFAULT FALSE,
        canonical_competency_id INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        designation VARCHAR(100) NOT NULL,
        department_id VARCHAR(50) NOT NULL REFERENCES workforce.departments(id),
        role VARCHAR(20) DEFAULT 'learner',
        experience_years FLOAT DEFAULT 3.0,
        highest_qualification VARCHAR(100) DEFAULT 'Master in Statistics',
        specialization VARCHAR(100) DEFAULT 'Econometrics & Survey Sampling',
        career_goal VARCHAR(100) DEFAULT 'Data & Statistical Analytics',
        profile_completion_pct FLOAT DEFAULT 68.0,
        xp INTEGER DEFAULT 720,
        level INTEGER DEFAULT 7,
        streak_days INTEGER DEFAULT 6,
        canonical_user_id VARCHAR(50),
        last_active_date TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.user_competencies (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        competency_id VARCHAR(50) NOT NULL REFERENCES workforce.competencies(id),
        current_level FLOAT DEFAULT 0.0,
        required_level FLOAT DEFAULT 4.0,
        baseline_level FLOAT DEFAULT 3.0,
        gap FLOAT DEFAULT 0.0,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(20) DEFAULT 'GAP',
        explanation TEXT,
        canonical_user_id VARCHAR(50),
        canonical_competency_id INTEGER,
        last_assessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.courses (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        provider VARCHAR(100),
        domain VARCHAR(50),
        difficulty VARCHAR(20),
        duration_hours FLOAT,
        expected_competency_gain FLOAT,
        target_competency_id VARCHAR(50) REFERENCES workforce.competencies(id),
        description TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.user_course_enrollments (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        course_id VARCHAR(50) NOT NULL REFERENCES workforce.courses(id),
        progress_pct FLOAT DEFAULT 0.0,
        status VARCHAR(20) DEFAULT 'ENROLLED',
        learning_hours_spent FLOAT DEFAULT 0.0,
        enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
        completed_at TIMESTAMP WITHOUT TIME ZONE
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.learning_logs (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        date TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
        hours_spent FLOAT DEFAULT 0.0,
        activity_type VARCHAR(50)
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.assessment_attempts (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        competency_id VARCHAR(50) REFERENCES workforce.competencies(id),
        assessment_title VARCHAR(150) NOT NULL,
        assessment_type VARCHAR(50),
        score_achieved FLOAT DEFAULT 0.0,
        max_score FLOAT DEFAULT 100.0,
        score_pct FLOAT DEFAULT 0.0,
        passed BOOLEAN DEFAULT FALSE,
        strong_areas_json TEXT,
        weak_areas_json TEXT,
        ai_insight TEXT,
        completed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.quest_challenges (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'INTERMEDIATE',
        xp_reward INTEGER DEFAULT 100,
        payload_json TEXT NOT NULL,
        solution_json TEXT NOT NULL,
        is_daily BOOLEAN DEFAULT FALSE,
        daily_date VARCHAR(10),
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.user_quest_progress (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        quest_challenge_id VARCHAR(50) NOT NULL REFERENCES workforce.quest_challenges(id),
        status VARCHAR(20) DEFAULT 'IN_PROGRESS',
        score FLOAT DEFAULT 0.0,
        xp_earned INTEGER DEFAULT 0,
        user_submission_json TEXT,
        feedback_json TEXT,
        completed_at TIMESTAMP WITHOUT TIME ZONE
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.achievements (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        icon VARCHAR(50),
        xp_reward INTEGER DEFAULT 100
    );
    """,

    """
    CREATE TABLE IF NOT EXISTS workforce.user_achievements (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES workforce.users(id),
        achievement_id VARCHAR(50) NOT NULL REFERENCES workforce.achievements(id),
        unlocked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
    """
]

# Indexes for fast querying
INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_wf_users_dept ON workforce.users(department_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_users_canonical ON workforce.users(canonical_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_uc_user ON workforce.user_competencies(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_uc_comp ON workforce.user_competencies(competency_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_uc_canonical_user ON workforce.user_competencies(canonical_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_enroll_user ON workforce.user_course_enrollments(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_logs_user ON workforce.learning_logs(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_attempts_user ON workforce.assessment_attempts(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_quest_user ON workforce.user_quest_progress(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_wf_achieve_user ON workforce.user_achievements(user_id);"
]


def init_schema(pg_conn):
    """Executes DDL statements to create workforce schema and tables."""
    logger.info("Creating workforce schema and tables on Supabase...")
    cur = pg_conn.cursor()
    for stmt in DDL_STATEMENTS:
        cur.execute(stmt)
    for stmt in INDEX_STATEMENTS:
        cur.execute(stmt)
    pg_conn.commit()
    cur.close()
    logger.info("Workforce schema and tables created successfully.")


def migrate_data(sqlite_conn, pg_conn):
    """Reads SQLite data and upserts into Supabase workforce schema with reconciliation."""
    s_cur = sqlite_conn.cursor()
    p_cur = pg_conn.cursor()

    # Pre-build reconciliation lookups
    # 1. Identity lookup: P4 user_id -> canonical_user_id
    id_map = {}
    p4_users = s_cur.execute("SELECT id, name, email FROM users").fetchall()
    for u_id, name, email in p4_users:
        matched = identity_service.get_by_p4(u_id)
        if matched:
            id_map[u_id] = matched.canonical_user_id
        else:
            if email and email.lower() == "sunita.deshmukh@mospi.gov.in":
                id_map[u_id] = "0c60c2de-d20c-4694-b453-2ddc213b135f"
            else:
                id_map[u_id] = None

    # 2. Competency lookup: P4 comp_id -> canonical_competency_id
    comp_map = {}
    p4_comps = s_cur.execute("SELECT id, code, name FROM competencies").fetchall()
    for c_id, code, name in p4_comps:
        comp, _, _ = competency_service.map_p4_to_canonical(c_id)
        if not comp:
            comp, _, _ = competency_service.map_p4_to_canonical(name)
        if not comp:
            comp, _, _ = competency_service.map_p4_to_canonical(code)
        comp_map[c_id] = comp.competency_id if comp else None

    # Migration steps in foreign-key order:

    # 1. departments
    logger.info("Migrating departments...")
    rows = s_cur.execute("SELECT id, code, name, description, head_name, created_at FROM departments").fetchall()
    sql = """
        INSERT INTO workforce.departments (id, code, name, description, head_name, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            head_name = EXCLUDED.head_name;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    # 2. competencies (with reconciled canonical_competency_id)
    logger.info("Migrating competencies with canonical reconciliation...")
    rows = s_cur.execute("SELECT id, code, name, domain, description, baseline_required_level, is_emerging, created_at FROM competencies").fetchall()
    enriched_comps = [
        (r[0], r[1], r[2], r[3], r[4], r[5], bool(r[6]), comp_map.get(r[0]), r[7])
        for r in rows
    ]
    sql = """
        INSERT INTO workforce.competencies (id, code, name, domain, description, baseline_required_level, is_emerging, canonical_competency_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            domain = EXCLUDED.domain,
            description = EXCLUDED.description,
            baseline_required_level = EXCLUDED.baseline_required_level,
            is_emerging = EXCLUDED.is_emerging,
            canonical_competency_id = EXCLUDED.canonical_competency_id;
    """
    execute_batch(p_cur, sql, enriched_comps)
    pg_conn.commit()

    # 3. users (with reconciled canonical_user_id)
    logger.info("Migrating users with canonical reconciliation...")
    rows = s_cur.execute("""
        SELECT id, name, email, designation, department_id, role,
               experience_years, highest_qualification, specialization, career_goal,
               profile_completion_pct, xp, level, streak_days, last_active_date, created_at
        FROM users
    """).fetchall()
    enriched_users = [
        (
            r[0], r[1], r[2], r[3], r[4], r[5],
            r[6], r[7], r[8], r[9],
            r[10], r[11], r[12], r[13],
            id_map.get(r[0]),
            r[14], r[15]
        )
        for r in rows
    ]
    sql = """
        INSERT INTO workforce.users (
            id, name, email, designation, department_id, role,
            experience_years, highest_qualification, specialization, career_goal,
            profile_completion_pct, xp, level, streak_days, canonical_user_id,
            last_active_date, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            designation = EXCLUDED.designation,
            department_id = EXCLUDED.department_id,
            role = EXCLUDED.role,
            experience_years = EXCLUDED.experience_years,
            highest_qualification = EXCLUDED.highest_qualification,
            specialization = EXCLUDED.specialization,
            career_goal = EXCLUDED.career_goal,
            profile_completion_pct = EXCLUDED.profile_completion_pct,
            xp = EXCLUDED.xp,
            level = EXCLUDED.level,
            streak_days = EXCLUDED.streak_days,
            canonical_user_id = EXCLUDED.canonical_user_id,
            last_active_date = EXCLUDED.last_active_date;
    """
    execute_batch(p_cur, sql, enriched_users)
    pg_conn.commit()

    # 4. user_competencies
    logger.info("Migrating user_competencies with canonical links...")
    rows = s_cur.execute("""
        SELECT id, user_id, competency_id, current_level, required_level,
               baseline_level, gap, priority, status, explanation, last_assessed_at
        FROM user_competencies
    """).fetchall()
    enriched_uc = [
        (
            r[0], r[1], r[2], r[3], r[4],
            r[5], r[6], r[7], r[8], r[9],
            id_map.get(r[1]),
            comp_map.get(r[2]),
            r[10]
        )
        for r in rows
    ]
    sql = """
        INSERT INTO workforce.user_competencies (
            id, user_id, competency_id, current_level, required_level,
            baseline_level, gap, priority, status, explanation,
            canonical_user_id, canonical_competency_id, last_assessed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            current_level = EXCLUDED.current_level,
            required_level = EXCLUDED.required_level,
            baseline_level = EXCLUDED.baseline_level,
            gap = EXCLUDED.gap,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            explanation = EXCLUDED.explanation,
            canonical_user_id = EXCLUDED.canonical_user_id,
            canonical_competency_id = EXCLUDED.canonical_competency_id,
            last_assessed_at = EXCLUDED.last_assessed_at;
    """
    execute_batch(p_cur, sql, enriched_uc)
    pg_conn.commit()

    # 5. courses
    logger.info("Migrating courses...")
    rows = s_cur.execute("""
        SELECT id, title, provider, domain, difficulty, duration_hours,
               expected_competency_gain, target_competency_id, description, created_at
        FROM courses
    """).fetchall()
    sql = """
        INSERT INTO workforce.courses (
            id, title, provider, domain, difficulty, duration_hours,
            expected_competency_gain, target_competency_id, description, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            provider = EXCLUDED.provider,
            domain = EXCLUDED.domain,
            difficulty = EXCLUDED.difficulty,
            duration_hours = EXCLUDED.duration_hours,
            expected_competency_gain = EXCLUDED.expected_competency_gain,
            target_competency_id = EXCLUDED.target_competency_id,
            description = EXCLUDED.description;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    # 6. user_course_enrollments
    logger.info("Migrating user_course_enrollments...")
    rows = s_cur.execute("""
        SELECT id, user_id, course_id, progress_pct, status,
               learning_hours_spent, enrolled_at, completed_at
        FROM user_course_enrollments
    """).fetchall()
    sql = """
        INSERT INTO workforce.user_course_enrollments (
            id, user_id, course_id, progress_pct, status,
            learning_hours_spent, enrolled_at, completed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            progress_pct = EXCLUDED.progress_pct,
            status = EXCLUDED.status,
            learning_hours_spent = EXCLUDED.learning_hours_spent,
            completed_at = EXCLUDED.completed_at;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    # 7. learning_logs
    logger.info("Migrating learning_logs...")
    rows = s_cur.execute("SELECT id, user_id, date, hours_spent, activity_type FROM learning_logs").fetchall()
    sql = """
        INSERT INTO workforce.learning_logs (id, user_id, date, hours_spent, activity_type)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            hours_spent = EXCLUDED.hours_spent,
            activity_type = EXCLUDED.activity_type;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    # 8. assessment_attempts
    logger.info("Migrating assessment_attempts...")
    rows = s_cur.execute("""
        SELECT id, user_id, competency_id, assessment_title, assessment_type,
               score_achieved, max_score, score_pct, passed, strong_areas_json,
               weak_areas_json, ai_insight, completed_at
        FROM assessment_attempts
    """).fetchall()
    enriched_attempts = [
        (
            r[0], r[1], r[2], r[3], r[4],
            r[5], r[6], r[7], bool(r[8]), r[9],
            r[10], r[11], r[12]
        )
        for r in rows
    ]
    sql = """
        INSERT INTO workforce.assessment_attempts (
            id, user_id, competency_id, assessment_title, assessment_type,
            score_achieved, max_score, score_pct, passed, strong_areas_json,
            weak_areas_json, ai_insight, completed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            score_achieved = EXCLUDED.score_achieved,
            max_score = EXCLUDED.max_score,
            score_pct = EXCLUDED.score_pct,
            passed = EXCLUDED.passed,
            strong_areas_json = EXCLUDED.strong_areas_json,
            weak_areas_json = EXCLUDED.weak_areas_json,
            ai_insight = EXCLUDED.ai_insight;
    """
    execute_batch(p_cur, sql, enriched_attempts)
    pg_conn.commit()

    # 9. quest_challenges
    logger.info("Migrating quest_challenges...")
    rows = s_cur.execute("""
        SELECT id, type, title, description, difficulty, xp_reward,
               payload_json, solution_json, is_daily, daily_date, created_at
        FROM quest_challenges
    """).fetchall()
    enriched_qc = [
        (
            r[0], r[1], r[2], r[3], r[4], r[5],
            r[6], r[7], bool(r[8]), r[9], r[10]
        )
        for r in rows
    ]
    sql = """
        INSERT INTO workforce.quest_challenges (
            id, type, title, description, difficulty, xp_reward,
            payload_json, solution_json, is_daily, daily_date, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            difficulty = EXCLUDED.difficulty,
            xp_reward = EXCLUDED.xp_reward,
            payload_json = EXCLUDED.payload_json,
            solution_json = EXCLUDED.solution_json,
            is_daily = EXCLUDED.is_daily,
            daily_date = EXCLUDED.daily_date;
    """
    execute_batch(p_cur, sql, enriched_qc)
    pg_conn.commit()

    # 10. user_quest_progress
    logger.info("Migrating user_quest_progress...")
    rows = s_cur.execute("""
        SELECT id, user_id, quest_challenge_id, status, score,
               xp_earned, user_submission_json, feedback_json, completed_at
        FROM user_quest_progress
    """).fetchall()
    if rows:
        sql = """
            INSERT INTO workforce.user_quest_progress (
                id, user_id, quest_challenge_id, status, score,
                xp_earned, user_submission_json, feedback_json, completed_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                score = EXCLUDED.score,
                xp_earned = EXCLUDED.xp_earned,
                user_submission_json = EXCLUDED.user_submission_json,
                feedback_json = EXCLUDED.feedback_json,
                completed_at = EXCLUDED.completed_at;
        """
        execute_batch(p_cur, sql, rows)
        pg_conn.commit()

    # 11. achievements
    logger.info("Migrating achievements...")
    rows = s_cur.execute("SELECT id, code, title, description, icon, xp_reward FROM achievements").fetchall()
    sql = """
        INSERT INTO workforce.achievements (id, code, title, description, icon, xp_reward)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            xp_reward = EXCLUDED.xp_reward;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    # 12. user_achievements
    logger.info("Migrating user_achievements...")
    rows = s_cur.execute("SELECT id, user_id, achievement_id, unlocked_at FROM user_achievements").fetchall()
    sql = """
        INSERT INTO workforce.user_achievements (id, user_id, achievement_id, unlocked_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            unlocked_at = EXCLUDED.unlocked_at;
    """
    execute_batch(p_cur, sql, rows)
    pg_conn.commit()

    p_cur.close()
    s_cur.close()
    logger.info("All data migration steps completed successfully.")


def verify_counts(sqlite_conn, pg_conn):
    """Compares row counts between SQLite source and Supabase workforce schema."""
    s_cur = sqlite_conn.cursor()
    p_cur = pg_conn.cursor()

    tables = [
        "departments",
        "competencies",
        "users",
        "user_competencies",
        "courses",
        "user_course_enrollments",
        "learning_logs",
        "assessment_attempts",
        "quest_challenges",
        "user_quest_progress",
        "achievements",
        "user_achievements"
    ]

    print("\n" + "="*80)
    print(f"{'Table':30} | {'SQLite':8} | {'Supabase':8} | {'Diff':6} | {'Status':10}")
    print("="*80)

    all_matched = True
    for t in tables:
        s_cnt = s_cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        p_cur.execute(f"SELECT count(*) FROM workforce.{t}")
        p_cnt = p_cur.fetchone()[0]
        diff = p_cnt - s_cnt
        status = "MATCH" if diff == 0 else "MISMATCH"
        if diff != 0:
            all_matched = False
        print(f"{t:30} | {s_cnt:8} | {p_cnt:8} | {diff:6} | {status:10}")

    print("="*80)
    p_cur.close()
    s_cur.close()
    return all_matched


def run_migration():
    if not SQLITE_PATH.exists():
        logger.error(f"SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    logger.info(f"Connecting to SQLite: {SQLITE_PATH}")
    s_conn = sqlite3.connect(str(SQLITE_PATH))

    logger.info(f"Connecting to Supabase PostgreSQL: {PG_URL.split('@')[-1]}")
    p_conn = psycopg2.connect(PG_URL)

    try:
        init_schema(p_conn)
        migrate_data(s_conn, p_conn)
        matched = verify_counts(s_conn, p_conn)
        if not matched:
            logger.error("Migration count mismatch detected!")
            sys.exit(1)
        logger.info("MIGRATION COMPLETED SUCCESSFULLY. All counts match exactly!")
    finally:
        s_conn.close()
        p_conn.close()


if __name__ == "__main__":
    run_migration()
