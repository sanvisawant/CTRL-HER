import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_skill_heatmap_full(client):
    response = client.get("/api/v1/admin/heatmap", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    
    assert len(data["departments"]) > 0
    assert len(data["competencies"]) > 0
    assert len(data["cells"]) > 0
    assert "summary" in data
    assert "legend" in data
    
    # Check sample cell structure
    cell = data["cells"][0]
    assert "indicator" in cell
    assert cell["indicator"] in ["🔴", "🟡", "🟢"]
    assert cell["status"] in ["critical", "moderate", "proficient"]

def test_skill_heatmap_domain_filter(client):
    response = client.get("/api/v1/admin/heatmap?domain=Technical", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    for comp in res["data"]["competencies"]:
        assert comp["domain"].lower() == "technical"
