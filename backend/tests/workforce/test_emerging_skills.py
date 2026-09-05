import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_emerging_skills(client):
    response = client.get("/api/v1/admin/emerging-skills", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert "scoring_formula" in data
    assert len(data["skills"]) > 0
    
    top_skill = data["skills"][0]
    assert top_skill["demand_score"] > 0
    assert top_skill["priority_rank"] == 1
    assert "why_increasing" in top_skill
    assert len(top_skill["why_increasing"]) > 10
    
    # Check factor breakdown weights
    factors = top_skill["factors"]
    assert "historical_trend" in factors
    assert "department_requirement" in factors
    assert "training_demand" in factors
    assert "skill_gap_frequency" in factors
