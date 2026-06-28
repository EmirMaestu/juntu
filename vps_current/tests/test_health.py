from fastapi.testclient import TestClient
import web

def test_health_ok():
    c = TestClient(web.app)
    r = c.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True
