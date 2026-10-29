import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    ("environment", "expected"),
    [("production", 404), ("staging", 404), ("Produccion", 404), ("development", 200), ("local", 200)],
)
def test_docs_are_only_served_outside_production(monkeypatch, environment, expected):
    import core.config
    import main

    monkeypatch.setenv("ENVIRONMENT", environment)
    try:
        importlib.reload(core.config)
        reloaded = importlib.reload(main)
        client = TestClient(reloaded.app)
        assert client.get("/docs").status_code == expected
        assert client.get("/openapi.json").status_code == expected
    finally:
        monkeypatch.setenv("ENVIRONMENT", "test")
        importlib.reload(core.config)
        importlib.reload(main)
