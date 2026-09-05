import sqlite3
import json
from pathlib import Path

# Paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(_BACKEND_DIR))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "learning"))
sys.path.insert(0, str(_BACKEND_DIR / "modules" / "workforce"))

from integrations.identity_mapping import identity_service
from integrations.supabase_persistence import get_all_identities

# 1. P4 SQLite Users
db_path = Path(__file__).resolve().parent.parent / 'data' / 'statsaksham.db'
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()
users = cursor.execute("SELECT id, name, email, designation, department_id, role, xp, level FROM users").fetchall()

print(f"=== P4 SQLite Users ({len(users)}) ===")
for u in users:
    print(f"ID: {u[0]:15} | Name: {u[1]:25} | Email: {u[2]:30} | Desig: {u[3]}")

# 2. Canonical identities in Supabase / identity_mapping
sb_identities = get_all_identities()
print(f"\n=== Canonical Identities in Supabase ({len(sb_identities)}) ===")
for ident in sb_identities:
    print(f"Canonical: {ident['canonical_user_id']} | Name: {ident['full_name']} | P4: {ident.get('p4_user_id')} | P2/P3: {ident.get('p2_learner_id')}")

# 3. Reconcile
print("\n=== Identity Reconciliation Matrix ===")
for u in users:
    p4_id, name, email, desig, dept_id, role, xp, level = u
    # Try match by p4_user_id
    matched = identity_service.get_by_p4(p4_id)
    confidence = "UNRESOLVED"
    canonical_id = None
    reason = "No matching canonical identity found in identity_mapping"

    if matched:
        canonical_id = matched.canonical_user_id
        confidence = "EXACT"
        reason = f"Explicitly registered in identity_mapping table (matches P4 ID {p4_id})"
    else:
        # Check by email
        for ident in sb_identities:
            if ident.get("email") and ident["email"].lower() == email.lower():
                canonical_id = ident["canonical_user_id"]
                confidence = "HIGH_CONFIDENCE"
                reason = f"Exact email match ({email}) with canonical identity {ident['full_name']}"
                break
        if not canonical_id:
            # Check by name similarity
            for ident in sb_identities:
                if ident.get("full_name") and ident["full_name"].lower() == name.lower():
                    canonical_id = ident["canonical_user_id"]
                    confidence = "REQUIRES_REVIEW"
                    reason = f"Name match only ('{name}') without explicit P4 mapping in identity_mapping"
                    break

    print(f"[{confidence:15}] P4: {p4_id:12} | Name: {name:20} -> Canonical: {str(canonical_id):36} | Reason: {reason}")
