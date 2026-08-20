"""Phase 2 smoke test: the API app imports and /health returns 200."""

from fastapi.testclient import TestClient

from api.main import app


def test_health_ok():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "receipt-intelligence"
