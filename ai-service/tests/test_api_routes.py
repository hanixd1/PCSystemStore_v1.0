import os
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from core import security
from main import app


# Set by conftest.py before main is imported.
client = TestClient(app, headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]})
anonymous = TestClient(app)


def test_health_endpoint_is_available():
    response = anonymous.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pcsystemstore-ai-service"}


def test_old_statistics_routes_are_gone():
    assert client.get("/statistics/health").status_code == 404
    assert client.get("/stock-prediction/health").status_code == 404
    assert client.post("/predict-stock", json={"products": []}).status_code == 404


@pytest.mark.parametrize("headers", [{}, {"X-Internal-API-Key": "wrong"}])
def test_internal_routes_reject_requests_without_the_shared_key(headers):
    assert anonymous.get("/forecast/overview", headers=headers).status_code == 401
    assert anonymous.post("/chat", json={"message": "hola"}, headers=headers).status_code == 401


@pytest.mark.parametrize("environment", ["production", "staging", ""])
def test_any_non_development_environment_without_a_key_rejects_everything(monkeypatch, environment):
    unset = replace(security.settings, environment=environment, internal_api_key="")
    monkeypatch.setattr(security, "settings", unset)
    assert client.get("/forecast/overview").status_code == 503


def test_no_cors_headers_for_browser_origins():
    response = client.get("/health", headers={"Origin": "https://www.pcsystemstore.com"})
    assert "access-control-allow-origin" not in response.headers


def test_forecast_month_returns_quantiles_and_probabilities():
    overview = client.get("/forecast/overview").json()
    month = overview["lastForecastMonth"]
    response = client.get("/forecast/month", params={"month": month, "threshold": 10})
    assert response.status_code == 200
    body = response.json()
    total = body["total"]
    assert body["month"] == month
    assert body["horizon"] == overview["maxHorizon"]
    assert body["reliability"] == "extrapolation"
    assert body["model"] == "ses"
    assert total["p10"] <= total["median"] <= total["p90"]
    assert 0 <= total["requested"]["probability"] <= 1
    assert len(body["path"]) == body["horizon"]
    assert body["categories"] and body["products"]


def test_forecast_rejects_months_outside_the_range():
    overview = client.get("/forecast/overview").json()
    response = client.get("/forecast/month", params={"month": overview["lastObservedMonth"]})
    assert response.status_code == 422


def test_stock_coverage_maps_web_categories():
    response = client.post(
        "/forecast/stock-coverage",
        json={"categories": [{"category": "KEYBOARD", "stock": 1}, {"category": "MOUSE", "stock": 2}, {"category": "NOT_A_CATEGORY", "stock": 9}]},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["category"] for item in items] == ["keyboard_mouse"]
    assert items[0]["stock"] == 3
    assert 0 <= items[0]["stockoutProbability"] <= 1


def test_research_summary_reads_the_snapshot_and_the_versioned_freeze():
    response = client.get("/forecast/research")
    assert response.status_code == 200
    body = response.json()
    assert body["accuracy"]["rows"] and body["inventory"]["rows"]
    assert body["freeze"]["tag"] == "synthetic-freeze"
    assert {p["pattern"] for p in body["patterns"]} <= {"smooth", "intermittent"}
    assert {h["id"] for h in body["hypotheses"]} == {"HG", "HE1", "HE2", "HE3"}


def test_research_summary_is_503_when_its_data_is_missing(monkeypatch):
    from pcsforecast.service import router

    def missing(*_args):
        raise FileNotFoundError("profile.parquet")

    monkeypatch.setattr(router, "research_summary", missing)
    monkeypatch.setattr(router.get_engine(), "_research", None)
    assert client.get("/forecast/research").status_code == 503


def test_research_and_product_rows_are_computed_once(monkeypatch):
    from pcsforecast.service import router

    engine = router.get_engine()
    monkeypatch.setattr(engine, "_research", None)
    calls = []
    original = router.research_summary

    def counted(*args):
        calls.append(1)
        return original(*args)

    monkeypatch.setattr(router, "research_summary", counted)
    assert client.get("/forecast/research").status_code == 200
    assert client.get("/forecast/research").status_code == 200
    assert len(calls) == 1

    month = client.get("/forecast/overview").json()["defaultMonth"]
    first = client.get("/forecast/month", params={"month": month}).json()["products"]
    monkeypatch.setattr(engine, "_all_product_rows", lambda: pytest.fail("recomputed"))
    again = client.get("/forecast/month", params={"month": month, "threshold": 3}).json()
    assert again["products"] == first


def test_stock_coverage_answers_at_once_while_the_warm_up_runs():
    from pcsforecast.service import router

    router._build_engine.cache_clear()
    router._warming_up.set()
    try:
        response = client.post("/forecast/stock-coverage", json={"categories": []})
        assert response.status_code == 503
        assert response.headers["retry-after"] == str(router.WARM_UP_RETRY_SECONDS)
    finally:
        router._warming_up.clear()
    assert client.post("/forecast/stock-coverage", json={"categories": []}).status_code == 200


def test_chat_rejects_oversized_state_sent_directly():
    oversized = {"message": "mas barato", "conversationState": {"lastSearchQuery": "x" * 600}}
    assert client.post("/chat", json=oversized).status_code == 422
    too_many = {"message": "hola", "conversationState": {"mentionedProducts": ["a"] * 21}}
    assert client.post("/chat", json=too_many).status_code == 422


def test_month_and_overview_answer_at_once_while_the_warm_up_runs():
    from pcsforecast.service import router

    router._build_engine.cache_clear()
    router._warming_up.set()
    try:
        assert client.get("/forecast/overview").status_code == 200
        response = client.get("/forecast/month")
        assert response.status_code == 503
        assert "retry-after" in response.headers
    finally:
        router._warming_up.clear()
    assert client.get("/forecast/month").status_code == 200


def test_derived_tables_are_built_once_under_concurrency():
    import threading
    import time

    from pcsforecast.service import router

    engine = router.get_engine()
    engine._products = None
    calls = []
    original = engine._all_product_rows

    def slow():
        calls.append(1)
        time.sleep(0.05)
        return original()

    engine._all_product_rows = slow
    try:
        threads = [threading.Thread(target=engine._product_rows, args=(5,)) for _ in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
    finally:
        del engine._all_product_rows
    assert len(calls) == 1
