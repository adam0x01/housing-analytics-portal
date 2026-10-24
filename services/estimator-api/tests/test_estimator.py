from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from estimator_api.config import Settings
from estimator_api.main import create_app

FEATURES = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}
RESULT = {
    "model_version": "test-v1",
    "price_unit": "source units",
    "predictions": [{"price": 250879.73, "warnings": []}],
}


def configured(tmp_path: Path, handler):
    return create_app(
        Settings(database_path=tmp_path / "history.sqlite", model_api_url="http://model.test"),
        httpx.MockTransport(handler),
    )


def test_prediction_is_forwarded_and_persists_across_restarts(tmp_path):
    calls = []

    def model(request):
        calls.append(request)
        return httpx.Response(200, json=RESULT)

    app = configured(tmp_path, model)
    with TestClient(app) as client:
        response = client.post("/estimates", json={"name": "  My property  ", "features": FEATURES})
        assert response.status_code == 201
        estimate = response.json()
        assert estimate["name"] == "My property"
        assert estimate["price"] == 250879.73
        assert calls[0].url.path == "/predict"
        assert client.get("/estimates").json()["total"] == 1
    with TestClient(configured(tmp_path, model)) as client:
        assert client.get(f"/estimates/{estimate['id']}").json() == estimate
        assert client.get("/health").status_code == 200


def test_history_pagination_and_comparison_preserve_requested_order(tmp_path):
    with TestClient(
        configured(tmp_path, lambda request: httpx.Response(200, json=RESULT))
    ) as client:
        estimates = [
            client.post("/estimates", json={"name": f"Property {i}", "features": FEATURES}).json()
            for i in range(3)
        ]
        history = client.get("/estimates?page=2&page_size=2").json()
        assert history["total"] == 3 and len(history["items"]) == 1
        ids = [estimates[0]["id"], estimates[2]["id"]]
        assert [
            item["id"] for item in client.post("/estimates/compare", json={"ids": ids}).json()
        ] == ids
        assert client.post("/estimates/compare", json={"ids": [ids[0], ids[0]]}).status_code == 422
        assert (
            client.post("/estimates/compare", json={"ids": [ids[0], str(uuid4())]}).status_code
            == 404
        )


@pytest.mark.parametrize(
    "problem,status",
    [
        ("timeout", 504),
        ("connection", 503),
        ("upstream", 503),
        ("invalid_json", 502),
        ("invalid_model", 502),
    ],
)
def test_failed_predictions_are_not_saved(tmp_path, problem, status):
    def model(request):
        if problem == "timeout":
            raise httpx.ReadTimeout("timeout", request=request)
        if problem == "connection":
            raise httpx.ConnectError("offline", request=request)
        if problem == "upstream":
            return httpx.Response(500)
        if problem == "invalid_json":
            return httpx.Response(200, text="not JSON")
        return httpx.Response(200, json={**RESULT, "predictions": []})

    with TestClient(configured(tmp_path, model)) as client:
        assert client.post("/estimates", json={"features": FEATURES}).status_code == status
        assert client.get("/estimates").json()["total"] == 0


@pytest.mark.parametrize(
    "features",
    [
        {},
        {**FEATURES, "bedrooms": True},
        {**FEATURES, "bathrooms": -1},
        {**FEATURES, "price": 1},
        {**FEATURES, "year_built": 0},
    ],
)
def test_invalid_features_do_not_call_model(tmp_path, features):
    def model(request):
        pytest.fail("Invalid input must not reach the model")

    with TestClient(configured(tmp_path, model)) as client:
        assert client.post("/estimates", json={"features": features}).status_code == 422
