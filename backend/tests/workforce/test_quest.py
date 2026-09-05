import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_quest_home(client):
    response = client.get("/api/v1/quest/home", headers={"x-user-id": "usr_demo_001"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert data["level"] >= 1
    assert data["current_xp"] > 0
    assert data["streak_days"] >= 1
    assert len(data["active_missions"]) > 0
    assert len(data["achievements"]) >= 5

def test_data_detective_challenge(client):
    response = client.get("/api/v1/quest/data-detective")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert len(data["columns"]) > 0
    assert len(data["rows"]) > 0
    assert len(data["questions"]) > 0
    assert len(data["anomaly_hints"]) > 0

def test_statistical_sudoku(client):
    response = client.get("/api/v1/quest/statistical-sudoku")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert data["size"] == 4
    assert len(data["grid"]) == 4
    assert len(data["row_constraints"]) > 0

def test_visualization_challenge(client):
    response = client.get("/api/v1/quest/visualization")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert len(data["options"]) >= 4
    assert len(data["dataset_sample"]) > 0

def test_missions(client):
    response = client.get("/api/v1/quest/missions")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert len(data) > 0
    assert len(data[0]["steps"]) >= 2

def test_quest_submission_and_xp(client):
    # Test submission on Visualization challenge
    payload = {
        "challenge_id": "qst_viz_01",
        "answers": "line"
    }
    response = client.post("/api/v1/quest/submit", json=payload, headers={"x-user-id": "usr_demo_001"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert data["is_correct"] is True
    assert data["score_pct"] == 100.0
    assert data["xp_earned"] > 0
    assert data["new_total_xp"] > 0
    assert len(data["detailed_feedback"]) > 10
