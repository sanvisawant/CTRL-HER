import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_whatif_simulator_aiml(client):
    payload = {
        "competency_code": "AI_ML",
        "required_level": 4.0,
        "target_officials_count": 500,
        "department_code": None
    }
    response = client.post("/api/v1/admin/what-if/simulate", json=payload, headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert data["target_officials_required"] == 500
    assert data["required_level"] == 4.0
    assert data["current_qualified_count"] == 127
    assert data["gap_officials_count"] == 373
    assert data["training_required_count"] == 373
    assert data["estimated_learning_hours_total"] > 0
    assert data["priority"] == "HIGH"
    assert len(data["recommended_training_strategy"]) > 20
    assert len(data["recommended_courses"]) > 0
    assert len(data["department_breakdown"]) > 0
