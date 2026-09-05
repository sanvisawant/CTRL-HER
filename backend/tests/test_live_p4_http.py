import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

endpoints = [
    ("Health Check", "/api/health", "GET"),
    ("P1 Canonical Competencies", "/api/v1/competencies", "GET"),
    ("P4 Admin Dashboard", "/api/v1/admin/dashboard", "GET"),
    ("P4 Workforce KPIs", "/api/v1/admin/workforce", "GET"),
    ("P4 Skill Heatmap Matrix", "/api/v1/admin/heatmap", "GET"),
    ("P4 Learner Analytics", "/api/v1/learner/analytics", "GET"),
    ("P4 Learner Progress Summary", "/api/v1/learner/progress", "GET"),
    ("P4 Gamification Hub State", "/api/v1/quest/home", "GET"),
    ("P4 Daily Quest Challenge", "/api/v1/quest/daily-challenge", "GET"),
    ("Cross-Module Connected Flow", "/api/v1/integration/learner-flow/2b574d66-f752-4348-ab00-17587012f291", "GET"),
]

print("=" * 80)
print(f"{'Endpoint Description':35} | {'Path':32} | {'Status':8}")
print("=" * 80)

all_ok = True
for desc, path, method in endpoints:
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "StatSaksham-LiveTest/1.0", "X-User-Id": "usr_demo_001"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = resp.read()
            data = json.loads(body)
            # Basic validation
            status_text = f"HTTP {status}"
            print(f"{desc:35} | {path:32} | {status_text:8} [OK]")
    except Exception as e:
        all_ok = False
        print(f"{desc:35} | {path:32} | FAILED: {e}")

print("=" * 80)
if all_ok:
    print("ALL LIVE HTTP P4 ENDPOINTS VERIFIED SUCCESSFULLY!")
    sys.exit(0)
else:
    print("SOME ENDPOINTS FAILED!")
    sys.exit(1)
