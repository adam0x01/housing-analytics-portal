import csv
import json

import pytest
from fastapi.testclient import TestClient

from housing_model_api.main import create_app
from housing_model_api.schema import EXAMPLE, FEATURES

from .conftest import ROOT


def test_health_and_openapi_are_available(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["model_loaded"] is True
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert {"/predict", "/model-info", "/health"} <= schema["paths"].keys()
    assert (
        "single"
        in schema["paths"]["/predict"]["post"]["requestBody"]["content"]["application/json"][
            "examples"
        ]
    )


def test_single_matches_manual_coefficient_calculation(client):
    info = client.get("/model-info").json()
    result = client.post("/predict", json=EXAMPLE)
    assert result.status_code == 200
    body = result.json()
    expected = info["intercept"] + sum(info["coefficients"][key] * EXAMPLE[key] for key in FEATURES)
    assert body["predictions"][0]["price"] == pytest.approx(expected, abs=0.01)
    assert body["model_version"] == info["model_version"]
    assert "unspecified" in body["price_unit"]


def test_all_supplied_samples_match_single_predictions_in_batch_order(client):
    with (ROOT / "data/prediction-samples.csv").open(encoding="utf-8-sig", newline="") as source:
        samples = [
            {
                key: int(value) if key in {"bedrooms", "year_built"} else float(value)
                for key, value in row.items()
            }
            for row in csv.DictReader(source)
        ]
    response = client.post("/predict", json=samples)
    assert response.status_code == 200
    predictions = response.json()["predictions"]
    assert len(predictions) == 10
    for sample, prediction in zip(samples, predictions, strict=True):
        assert prediction == client.post("/predict", json=sample).json()["predictions"][0]
    # The supplied sixth sample exceeds observed build-year and school-rating ranges.
    assert any("year_built" in warning for warning in predictions[5]["warnings"])
    assert any("school_rating" in warning for warning in predictions[5]["warnings"])


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {key: value for key, value in EXAMPLE.items() if key != "bathrooms"},
        {**EXAMPLE, "price": 123},
        {**EXAMPLE, "id": 1},
        {**EXAMPLE, "square_footage": 0},
        {**EXAMPLE, "bedrooms": 2.5},
        {**EXAMPLE, "bedrooms": True},
        {**EXAMPLE, "lot_size": -1},
        {**EXAMPLE, "distance_to_city_center": "4.1"},
        [],
        [EXAMPLE, {}],
        [EXAMPLE] * 501,
    ],
)
def test_invalid_or_malformed_requests_return_422(client, payload):
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_non_finite_values_return_a_serializable_422(client, value):
    response = client.post(
        "/predict",
        content=json.dumps({**EXAMPLE, "lot_size": value}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["detail"]


def test_extreme_integer_input_returns_422_instead_of_server_error(client):
    response = client.post("/predict", json={**EXAMPLE, "bedrooms": 10**400})
    assert response.status_code == 422


def test_missing_artifact_fails_startup(tmp_path):
    with pytest.raises(RuntimeError, match="training command"):
        with TestClient(create_app(tmp_path / "missing.joblib")):
            pass


def test_model_info_reports_only_features_and_held_out_metrics(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    info = response.json()
    assert info["feature_names"] == list(FEATURES)
    assert set(info["coefficients"]) == set(FEATURES)
    assert info["training_rows"] == 50
    assert len(info["dataset_sha256"]) == 64
    assert info["evaluation"]["regression"]["mae"] < info["evaluation"]["baseline"]["mae"]
    assert info["limitations"]
