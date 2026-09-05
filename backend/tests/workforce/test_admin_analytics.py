import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_admin_dashboard(client):
    response = client.get("/api/v1/admin/dashboard", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    # Verify KPIs
    assert data["kpis"]["total_officials"] > 0
    assert data["kpis"]["average_competency"] > 0
    assert data["kpis"]["training_completion_rate_pct"] > 0
    
    # Verify Domain Breakdown
    domains = [d["domain"] for d in data["domain_breakdown"]]
    assert "Statistical" in domains or "Technical" in domains
    
    # Verify Department summaries
    assert len(data["department_summary"]) >= 4
    
    # Verify Training Effectiveness
    eff = data["training_effectiveness_summary"]
    assert eff["overall_average_improvement_pct"] > 0
    assert len(eff["competency_breakdown"]) > 0

def test_workforce_kpis_endpoint(client):
    response = client.get("/api/v1/admin/workforce", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["total_officials"] > 0

def test_training_effectiveness_endpoint(client):
    response = client.get("/api/v1/admin/training-effectiveness", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["overall_average_improvement_pct"] > 0
