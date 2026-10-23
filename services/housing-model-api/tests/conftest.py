from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from housing_model_api.main import create_app
from housing_model_api.training import train

ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(scope="session")
def data_path():
    return ROOT / "data/house-prices.csv"


@pytest.fixture(scope="session")
def artifact_path(tmp_path_factory, data_path):
    path = tmp_path_factory.mktemp("model") / "model.joblib"
    train(data_path, path)
    return path


@pytest.fixture
def client(artifact_path):
    with TestClient(create_app(artifact_path)) as test_client:
        yield test_client
