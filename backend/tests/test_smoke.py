import os
import sys
from pathlib import Path
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.chdir(str(backend_dir))

from main import app

endpoints = [
    ("Unified Root", "GET", "/", None),
    ("Unified Health (/api/health)", "GET", "/api/health", None),
    ("Top-level Health (/health)", "GET", "/health", None),
    ("P1 Competencies (/api/v1/competencies)", "GET", "/api/v1/competencies", None),
    ("P1 Competencies Alias (/api/competencies)", "GET", "/api/competencies", None),
    ("P2 iGOT Courses (/api/igot/courses)", "GET", "/api/igot/courses", None),
    ("P2 Competency Gaps (/api/learners/U001/competency-gaps)", "GET", "/api/learners/U001/competency-gaps", None),
    ("P3 Ingested Documents (/api/documents)", "GET", "/api/documents", None),
    ("P3 Semantic Search (/api/search)", "POST", "/api/search", {"query": "sample survey", "top_k": 2}),
    ("P4 Admin Dashboard (/api/v1/admin/dashboard)", "GET", "/api/v1/admin/dashboard", None),
    ("P4 Admin Departments (/api/v1/admin/departments)", "GET", "/api/v1/admin/departments", None),
    ("P4 Quest Home (/api/v1/quest/home)", "GET", "/api/v1/quest/home", None),
    ("P4 Heatmap Analytics (/api/v1/admin/heatmap)", "GET", "/api/v1/admin/heatmap", None),
]

passed = 0
failed = 0

print("=" * 60)
print("STAT-SAKSHAM UNIFIED MASTER BACKEND LIFESPAN SMOKE TEST")
print("=" * 60)

with TestClient(app) as client:
    for name, method, path, payload in endpoints:
        try:
            if method == "GET":
                res = client.get(path)
            else:
                res = client.post(path, json=payload)
            if res.status_code == 200:
                print(f"[PASS] {name:<45} -> {res.status_code}")
                passed += 1
            else:
                print(f"[FAIL] {name:<45} -> {res.status_code}")
                print(f"      Detail: {res.text[:120]}")
                failed += 1
        except Exception as e:
            print(f"[ERROR] {name:<45} -> {e}")
            failed += 1

print("=" * 60)
print(f"FINAL RESULTS: {passed}/{len(endpoints)} endpoints PASSED")
print("=" * 60)
if failed > 0:
    sys.exit(1)
