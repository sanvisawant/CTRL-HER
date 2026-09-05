"""
StatSaksham AI — Module P4 Workforce & Analytics Test Suite
Tests 12 core workforce analytics, gamification, and quest endpoints against the unified backend.
"""
import sys
from pathlib import Path
from starlette.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "modules" / "learning"))
sys.path.insert(0, str(backend_dir / "modules" / "workforce"))

from main import app

def run_workforce_tests():
    print("=" * 60)
    print("RUNNING MODULE P4 WORKFORCE & ANALYTICS TESTS...")
    print("=" * 60)
    client = TestClient(app)
    admin_headers = {"x-user-role": "admin"}
    learner_headers = {"x-user-id": "usr_demo_001"}

    # 1. Admin Dashboard
    r = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert r.status_code == 200 and r.json()["success"] is True
    print("[PASS] 1. Admin Dashboard")

    # 2. Workforce KPIs
    r = client.get("/api/v1/admin/workforce", headers=admin_headers)
    assert r.status_code == 200 and r.json()["data"]["total_officials"] > 0
    print("[PASS] 2. Workforce KPIs")

    # 3. Training Effectiveness
    r = client.get("/api/v1/admin/training-effectiveness", headers=admin_headers)
    assert r.status_code == 200 and r.json()["data"]["overall_average_improvement_pct"] > 0
    print("[PASS] 3. Training Effectiveness")

    # 4. Emerging Skills
    r = client.get("/api/v1/admin/emerging-skills", headers=admin_headers)
    assert r.status_code == 200 and len(r.json()["data"]["skills"]) > 0
    print("[PASS] 4. Emerging Skills")

    # 5. Heatmap Matrix
    r = client.get("/api/v1/admin/heatmap", headers=admin_headers)
    assert r.status_code == 200 and len(r.json()["data"]["cells"]) > 0
    print("[PASS] 5. Heatmap Matrix")

    # 6. Heatmap Domain Filter
    r = client.get("/api/v1/admin/heatmap?domain=Technical", headers=admin_headers)
    assert r.status_code == 200 and r.json()["success"] is True
    print("[PASS] 6. Heatmap Domain Filter")

    # 7. Learner Analytics
    r = client.get("/api/v1/learner/analytics", headers=learner_headers)
    assert r.status_code == 200 and r.json()["data"]["user_name"] == "Sanvi Sharma"
    print("[PASS] 7. Learner Analytics")

    # 8. Learner Progress
    r = client.get("/api/v1/learner/progress", headers=learner_headers)
    assert r.status_code == 200 and "learning_hours" in r.json()["data"]
    print("[PASS] 8. Learner Progress Summary")

    # 9. Quest Home
    r = client.get("/api/v1/quest/home", headers=learner_headers)
    assert r.status_code == 200 and r.json()["data"]["current_xp"] > 0
    print("[PASS] 9. Quest Home & Gamification")

    # 10. Quest Data Detective
    r = client.get("/api/v1/quest/data-detective", headers=learner_headers)
    assert r.status_code == 200 and len(r.json()["data"]["questions"]) > 0
    print("[PASS] 10. Quest Data Detective")

    # 11. Quest Statistical Sudoku
    r = client.get("/api/v1/quest/statistical-sudoku", headers=learner_headers)
    assert r.status_code == 200 and r.json()["data"]["size"] == 4
    print("[PASS] 11. Quest Statistical Sudoku")

    # 12. What-If Simulator
    payload = {
        "competency_code": "AI_ML",
        "required_level": 4.0,
        "target_officials_count": 500,
        "department_code": None
    }
    r = client.post("/api/v1/admin/what-if/simulate", json=payload, headers=admin_headers)
    assert r.status_code == 200 and r.json()["data"]["target_officials_required"] == 500
    print("[PASS] 12. What-If Simulator Scenario")

    print("=" * 60)
    print("ALL 12 WORKFORCE & ANALYTICS TESTS PASSED!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    run_workforce_tests()
