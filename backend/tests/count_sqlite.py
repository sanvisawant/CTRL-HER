import sqlite3

from pathlib import Path
db_path = Path(__file__).resolve().parent.parent / 'data' / 'statsaksham.db'
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()
print("TOTAL TABLES:", len(tables))
for (t,) in sorted(tables):
    cnt = cursor.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"{t:30}: {cnt}")
