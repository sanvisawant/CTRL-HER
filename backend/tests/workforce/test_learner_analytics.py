import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "StatSaksham AI" in data["platform"]

def test_learner_analytics(client):
    response = client.get("/api/v1/learner/analytics", headers={"x-user-id": "usr_demo_001"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["user_name"] == "Sanvi Sharma"
    assert data["overall_competency_score"] > 0
    assert "learning_hours" in data
    assert data["learning_hours"]["total"] >= 40.0
    assert len(data["course_progress"]) >= 3
    assert len(data["competency_improvements"]) > 0

def test_learner_progress_summary(client):
    response = client.get("/api/v1/learner/progress", headers={"x-user-id": "usr_demo_001"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "learning_hours" in res["data"]
