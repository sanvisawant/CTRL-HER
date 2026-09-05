import sqlite3
from pathlib import Path
import sys

_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "learning"))

from integrations.competency_mapping import competency_service

db_path = _BACKEND_DIR / "data" / "statsaksham.db"
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()
p4_comps = cursor.execute("SELECT id, code, name, domain, baseline_required_level, is_emerging FROM competencies").fetchall()

print(f"=== P4 SQLite Competencies ({len(p4_comps)}) ===")
for c in p4_comps:
    p4_id, code, name, domain, baseline, emerging = c
    comp, status, reason = competency_service.map_p4_to_canonical(p4_id)
    if not comp:
        comp, status, reason = competency_service.map_p4_to_canonical(name)
    if not comp:
        comp, status, reason = competency_service.map_p4_to_canonical(code)
    
    canonical_name = comp.name if comp else "UNMAPPED"
    canonical_id = comp.competency_id if comp else None
    status_str = status.value if hasattr(status, "value") else str(status)

    print(f"[{status_str:15}] P4 ID: {p4_id:15} | Code: {code:15} | Name: {name:30} -> Canonical: {canonical_name:25} (ID: {str(canonical_id):4}) | Reason: {reason}")
