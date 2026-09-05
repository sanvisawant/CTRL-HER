"""
Comprehensive end-to-end test suite for StatSaksham Module P1 API.
Tests all required endpoints against live database models and services.
"""

import logging
from fastapi.testclient import TestClient
from main import app

logger = logging.getLogger("statsaksham.test")
client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "healthy"
    print("Health check passed.")


def test_master_competencies():
    response = client.get("/api/v1/competencies")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total_competencies"] == 33
    categories = data["categories"]
    assert "Statistical" in categories and len(categories["Statistical"]) == 10
    assert "Technical" in categories and len(categories["Technical"]) == 12
    assert "Digital Governance" in categories and len(categories["Digital Governance"]) == 5
    assert "Behavioural & Managerial" in categories and len(categories["Behavioural & Managerial"]) == 6
    print("GET /api/v1/competencies passed with all 33 competencies.")


def test_profile_lifecycle_and_competency_intelligence():
    # 1. Ingest Profile via POST /api/v1/profile/create
    payload = {
        "full_name": "Ramesh Chandra Sharma",
        "designation": "Junior Statistical Officer",
        "department": "National Sample Survey Office (NSSO), MoSPI",
        "job_role": "Junior Statistical Officer",
        "current_assignment": "Field Operations Division - Annual Survey of Industries",
        "education": "M.Sc. in Applied Statistics, University of Delhi",
        "experience_years": 4,
        "previous_training": [
            "National Statistical Systems & SDMX Standards Workshop",
            "Python for Statistical Analysis & Data Scrutiny",
            "Cybersecurity & Data Privacy in Governance (MoSPI-NIC)"
        ],
        "career_objective": "Advance into Senior Statistical Officer role specializing in National Accounts macro-aggregation.",
        "self_assessments": [
            {"competency_id": 1, "rating": 4.5, "notes": "Extensive experience in survey sampling during field inspections."},
            {"competency_id": 2, "rating": 4.2, "notes": "Solid understanding of multistage stratified sampling."},
            {"competency_id": 3, "rating": 4.8, "notes": "Read national accounts manuals."},  # Should be calibrated due to tenure
            {"competency_id": 11, "rating": 3.8, "notes": "Regularly write pandas scripts for ASI data scrutiny."},
            {"competency_id": 13, "rating": 3.5, "notes": "Moderate SQL query proficiency."},
            {"competency_id": 23, "rating": 3.0, "notes": "Basic government security guidelines."},
            {"competency_id": 28, "rating": 3.0, "notes": "Supervised small field investigator teams."}
        ]
    }

    create_res = client.post("/api/v1/profile/create", json=payload)
    assert create_res.status_code == 201, create_res.text
    create_data = create_res.json()
    assert "official_id" in create_data
    assert create_data["scores_evaluated"] == 33
    official_id = create_data["official_id"]
    print(f"POST /api/v1/profile/create passed. Created official ID: {official_id}")

    # 2. Retrieve Profile via GET /api/v1/profile/{official_id}
    profile_res = client.get(f"/api/v1/profile/{official_id}")
    assert profile_res.status_code == 200, profile_res.text
    profile_data = profile_res.json()
    assert profile_data["full_name"] == "Ramesh Chandra Sharma"
    assert len(profile_data["scores"]) == 33
    print(f"GET /api/v1/profile/{official_id} passed. Retrieved 33 evaluated scores.")

    # 3. Compute Skill Gaps via GET /api/v1/competency/gaps/{official_id}
    gap_res = client.get(f"/api/v1/competency/gaps/{official_id}")
    assert gap_res.status_code == 200, gap_res.text
    gap_data = gap_res.json()
    assert gap_data["total_competencies"] == 33
    assert len(gap_data["gaps"]) == 33
    assert len(gap_data["critical_gaps_rationale"]) > 0
    # Verify priority sorting: all HIGH priorities appear before MEDIUM, then LOW
    seen_priorities = [item["priority"] for item in gap_data["gaps"]]
    high_indices = [i for i, p in enumerate(seen_priorities) if p == "HIGH"]
    med_indices = [i for i, p in enumerate(seen_priorities) if p == "MEDIUM"]
    low_indices = [i for i, p in enumerate(seen_priorities) if p == "LOW"]
    if high_indices and med_indices:
        assert max(high_indices) < min(med_indices), "Gaps must be sorted with critical/HIGH priorities first!"
    if med_indices and low_indices:
        assert max(med_indices) < min(low_indices), "Gaps must be sorted with MEDIUM before LOW!"
    print(f"GET /api/v1/competency/gaps/{official_id} passed. High: {gap_data['high_priority_count']}, Med: {gap_data['medium_priority_count']}, Low: {gap_data['low_priority_count']}.")
    print(f"  AI Critical Gap Rationale Sample: {gap_data['critical_gaps_rationale'][0][:120]}...")

    # 4. Fetch Radar Chart Data via GET /api/v1/competency/radar/{official_id}
    radar_res = client.get(f"/api/v1/competency/radar/{official_id}")
    assert radar_res.status_code == 200, radar_res.text
    radar_data = radar_res.json()
    assert len(radar_data["competency_radar"]) == 33
    sample_pt = radar_data["competency_radar"][0]
    assert "category" in sample_pt
    assert "competency" in sample_pt
    assert "current" in sample_pt
    assert "required" in sample_pt
    assert len(radar_data["category_radar"]) == 4
    print(f"GET /api/v1/competency/radar/{official_id} passed. Recharts-formatted data verified.")

    # 5. Fetch Competency Digital Twin via GET /api/v1/competency/digital-twin/{official_id}
    twin_res = client.get(f"/api/v1/competency/digital-twin/{official_id}")
    assert twin_res.status_code == 200, twin_res.text
    twin_data = twin_res.json()
    assert 0.0 <= twin_data["overall_readiness_pct"] <= 100.0
    assert len(twin_data["category_breakdown"]) == 4
    assert len(twin_data["timeline_milestones"]) >= 33
    print(f"GET /api/v1/competency/digital-twin/{official_id} passed. Readiness: {twin_data['overall_readiness_pct']}%.")
    print(f"  Status: {twin_data['status_summary']}")


def test_fallback_benchmark_for_unbenchmarked_role():
    # Test an official with an unbenchmarked novel role to verify default fallback required score (3.5)
    payload = {
        "full_name": "Ananya Sen",
        "designation": "Statistical Consultant",
        "department": "MoSPI Policy Innovation Cell",
        "job_role": "Emerging Tech Research Fellow",  # No explicit role benchmark exists for this
        "experience_years": 2,
        "self_assessments": [
            {"competency_id": 19, "rating": 4.5}  # AI/ML
        ]
    }
    create_res = client.post("/api/v1/profile/create", json=payload)
    assert create_res.status_code == 201
    off_id = create_res.json()["official_id"]

    gap_res = client.get(f"/api/v1/competency/gaps/{off_id}")
    assert gap_res.status_code == 200
    gap_data = gap_res.json()
    assert "Default MoSPI Fallback" in gap_data["benchmark_source"]
    # Check that required scores fall back to 3.5
    for item in gap_data["gaps"]:
        assert item["required_score"] == 3.5
    print("Fallback benchmark test passed: Unbenchmarked roles correctly fall back to default 3.5 benchmark.")


if __name__ == "__main__":
    print("\n========== RUNNING STATSAKSHAM MODULE P1 API TEST SUITE ==========\n")
    test_health()
    test_master_competencies()
    test_profile_lifecycle_and_competency_intelligence()
    test_fallback_benchmark_for_unbenchmarked_role()
    print("\n========== ALL API & COMPETENCY ENGINE TESTS PASSED SUCCESSFULLY! ==========\n")
