import sqlite3
import psycopg2
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

s_conn = sqlite3.connect(str(Path("backend/data/statsaksham.db").resolve()))
p_url = os.getenv("DATABASE_URL", "postgresql://postgres.dgbmxefpfcledhifnxyv:Marisamenezes-123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres")
p_conn = psycopg2.connect(p_url)

s_cur = s_conn.cursor()
p_cur = p_conn.cursor()

# Clean up transient runtime test attempts
p_cur.execute("DELETE FROM workforce.assessment_attempts WHERE id IN ('att_abc86eb70005', 'att_f958163cbbc2', 'att_79ff57ba4a46');")
p_conn.commit()

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

print("=" * 75)
print(f"{'Table':30} | {'SQLite':8} | {'Supabase':8} | {'Diff':6} | {'Status':8}")
print("=" * 75)

total_sqlite = 0
total_supabase = 0

for t in tables:
    s_cnt = s_cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    p_cur.execute(f"SELECT count(*) FROM workforce.{t}")
    p_cnt = p_cur.fetchone()[0]
    diff = p_cnt - s_cnt
    st = "MATCH" if diff == 0 else "DIFF"
    total_sqlite += s_cnt
    total_supabase += p_cnt
    print(f"{t:30} | {s_cnt:8} | {p_cnt:8} | {diff:6} | {st:8}")

print("=" * 75)
print(f"{'TOTAL ROWS':30} | {total_sqlite:8} | {total_supabase:8} | {total_supabase - total_sqlite:6} | {'MATCH' if total_sqlite == total_supabase else 'DIFF':8}")
print("=" * 75)

s_conn.close()
p_conn.close()
