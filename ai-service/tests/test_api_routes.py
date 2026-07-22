from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint_is_available():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pcsystemstore-ai-service"}


def test_stock_prediction_prefixes_keep_the_same_health_contract():
    canonical = client.get("/stock-prediction/health")
    legacy = client.get("/predict-stock/health")
    assert canonical.status_code == legacy.status_code == 200
    assert canonical.json() == legacy.json()


def test_stock_prediction_prefixes_keep_the_same_prediction_contract():
    payload = {"products": [{"id": "cpu-1", "name": "AMD Ryzen 7", "stock": 2, "price": 1200, "monthlySales": 4}]}
    canonical = client.post("/stock-prediction", json=payload)
    legacy = client.post("/predict-stock", json=payload)
    assert canonical.status_code == legacy.status_code == 200
    assert canonical.json() == legacy.json()
    assert canonical.json()["predictions"][0]["productId"] == "cpu-1"


def test_stock_prediction_rejects_invalid_payload_without_server_error():
    response = client.post("/stock-prediction", json={"products": [{"id": "cpu-1", "name": "", "stock": -1, "price": -10}]})
    assert response.status_code == 422
