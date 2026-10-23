import csv

import numpy as np
import pytest
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import KFold, cross_val_predict

from housing_model_api.model import ModelService
from housing_model_api.schema import EXAMPLE, FEATURES, PropertyFeatures
from housing_model_api.training import evaluate, read_training_data, train


def test_dataset_integrity_and_feature_exclusion(data_path):
    features, targets = read_training_data(data_path)
    assert features.shape == (50, 7)
    assert targets.shape == (50,)
    assert features[0].tolist() == [1250, 2, 1, 1985, 5200, 3.2, 7.1]
    assert targets[0] == 185000


def test_evaluation_matches_independent_held_out_predictions(data_path):
    features, targets = read_training_data(data_path)
    evaluation = evaluate(features, targets)
    splitter = KFold(n_splits=5, shuffle=True, random_state=42)
    for estimator, reported in (
        (LinearRegression(), evaluation.regression),
        (DummyRegressor(strategy="mean"), evaluation.baseline),
    ):
        held_out = cross_val_predict(estimator, features, targets, cv=splitter)
        assert reported.mae == pytest.approx(mean_absolute_error(targets, held_out))
    assert sum(fold.validation_rows for fold in evaluation.fold_metrics) == len(targets)
    assert all(fold.training_rows == 40 for fold in evaluation.fold_metrics)


def test_training_reproduces_version_metrics_and_predictions(data_path, tmp_path):
    first = tmp_path / "first.joblib"
    second = tmp_path / "second.joblib"
    first_info = train(data_path, first)
    second_info = train(data_path, second)
    assert first_info.model_version == second_info.model_version
    assert first_info.evaluation == second_info.evaluation
    sample = [PropertyFeatures.model_validate(EXAMPLE)]
    assert ModelService(first).predict(sample) == ModelService(second).predict(sample)
    assert first.with_suffix(".json").is_file()


@pytest.mark.parametrize(
    "problem", ["missing_column", "missing_value", "duplicate_id", "nan", "extra"]
)
def test_training_rejects_corrupt_csv(data_path, tmp_path, problem):
    with data_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        columns, rows = list(reader.fieldnames), list(reader)
    if problem == "missing_column":
        columns.remove("school_rating")
        for row in rows:
            del row["school_rating"]
    elif problem == "missing_value":
        rows[0]["bathrooms"] = ""
    elif problem == "duplicate_id":
        rows[1]["id"] = rows[0]["id"]
    elif problem == "nan":
        rows[0]["price"] = "NaN"
    elif problem == "extra":
        columns.append("unexpected")
        for row in rows:
            row["unexpected"] = "1"
    path = tmp_path / "corrupt.csv"
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    with pytest.raises(ValueError):
        read_training_data(path)


def test_feature_order_is_independent_of_request_key_order(artifact_path):
    service = ModelService(artifact_path)
    reordered = {key: EXAMPLE[key] for key in reversed(FEATURES)}
    first = PropertyFeatures.model_validate(EXAMPLE)
    second = PropertyFeatures.model_validate(reordered)
    assert np.array_equal(first.feature_vector(), second.feature_vector())
    assert service.predict([first]) == service.predict([second])
