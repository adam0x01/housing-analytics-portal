"""Validate labelled CSV data, evaluate without leakage, and save a serving artifact."""

import argparse
import csv
import hashlib
import json
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import KFold

from housing_model_api import __version__
from housing_model_api.schema import (
    FEATURES,
    Evaluation,
    FeatureRange,
    FoldMetrics,
    Metrics,
    ModelInfo,
    PropertyFeatures,
)

SEED = 42
FOLDS = 5
ARTIFACT_FORMAT = 1


def library_versions() -> dict[str, str]:
    return {name: version(name) for name in ("scikit-learn", "numpy", "scipy", "joblib")}


def read_training_data(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Reject malformed data rather than silently imputing, dropping, or reordering it."""
    expected = {"id", *FEATURES, "price"}
    features, targets = [], []
    seen_ids: set[int] = set()
    seen_rows: set[tuple[float, ...]] = set()
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if (
            reader.fieldnames is None
            or set(reader.fieldnames) != expected
            or len(reader.fieldnames) != len(expected)
        ):
            raise ValueError(f"Training CSV must contain exactly these columns: {sorted(expected)}")
        for line, row in enumerate(reader, start=2):
            try:
                if None in row or any(value is None or value == "" for value in row.values()):
                    raise ValueError("Missing or extra CSV values")
                identifier = int(row["id"])
                if identifier <= 0 or identifier in seen_ids:
                    raise ValueError("IDs must be positive and unique")
                values = {
                    name: int(row[name]) if name in {"bedrooms", "year_built"} else float(row[name])
                    for name in FEATURES
                }
                property_features = PropertyFeatures.model_validate(values)
                target = float(row["price"])
                if not np.isfinite(target) or target <= 0:
                    raise ValueError("Price must be finite and positive")
                vector = property_features.feature_vector()
                signature = (*vector, target)
                if signature in seen_rows:
                    raise ValueError("Duplicate labelled property row")
                seen_rows.add(signature)
                seen_ids.add(identifier)
                features.append(vector)
                targets.append(target)
            except (ValueError, TypeError) as error:
                raise ValueError(f"Invalid training row at CSV line {line}: {error}") from error
    if len(features) < FOLDS * 2:
        raise ValueError(f"Need at least {FOLDS * 2} labelled rows for five-fold R² evaluation")
    if len(set(targets)) < 2:
        raise ValueError("Training prices must vary for meaningful regression evaluation")
    return np.asarray(features, dtype=np.float64), np.asarray(targets, dtype=np.float64)


def score(actual: np.ndarray, predicted: np.ndarray) -> Metrics:
    return Metrics(
        mae=float(mean_absolute_error(actual, predicted)),
        rmse=float(root_mean_squared_error(actual, predicted)),
        r2=float(r2_score(actual, predicted)),
    )


def evaluate(features: np.ndarray, targets: np.ndarray) -> Evaluation:
    """Pooled metrics use predictions from models that never saw the corresponding label."""
    predictions = np.empty_like(targets)
    baseline_predictions = np.empty_like(targets)
    fold_metrics = []
    for fold, (train, validation) in enumerate(
        KFold(n_splits=FOLDS, shuffle=True, random_state=SEED).split(features), start=1
    ):
        regression = LinearRegression().fit(features[train], targets[train])
        baseline = DummyRegressor(strategy="mean").fit(features[train], targets[train])
        predictions[validation] = regression.predict(features[validation])
        baseline_predictions[validation] = baseline.predict(features[validation])
        fold_metrics.append(
            FoldMetrics(
                fold=fold,
                training_rows=len(train),
                validation_rows=len(validation),
                regression=score(targets[validation], predictions[validation]),
                baseline=score(targets[validation], baseline_predictions[validation]),
            )
        )
    return Evaluation(
        method="Pooled out-of-fold predictions from five-fold shuffled cross-validation",
        folds=FOLDS,
        shuffle=True,
        seed=SEED,
        regression=score(targets, predictions),
        baseline=score(targets, baseline_predictions),
        fold_metrics=fold_metrics,
    )


def train(data_path: Path, artifact_path: Path) -> ModelInfo:
    """Build a serving artifact and companion metadata from the versioned source dataset."""
    dataset_hash = hashlib.sha256(data_path.read_bytes()).hexdigest()
    features, targets = read_training_data(data_path)
    evaluation = evaluate(features, targets)
    model = LinearRegression().fit(features, targets)
    libraries = library_versions()
    # Include the implementation version and numerical stack in the serving identity.
    identity = json.dumps(
        {"data": dataset_hash, "api": __version__, "libraries": libraries, "algorithm": "ols-v1"},
        sort_keys=True,
    )
    fingerprint = hashlib.sha256(identity.encode()).hexdigest()[:12]
    info = ModelInfo(
        model_version=f"linear-regression-{fingerprint}",
        algorithm="sklearn.linear_model.LinearRegression (ordinary least squares)",
        artifact_format=ARTIFACT_FORMAT,
        trained_at=datetime.now(UTC).isoformat(),
        training_rows=len(targets),
        dataset_sha256=dataset_hash,
        feature_names=list(FEATURES),
        coefficients=dict(zip(FEATURES, model.coef_.tolist(), strict=True)),
        intercept=float(model.intercept_),
        feature_ranges={
            name: FeatureRange(
                minimum=float(features[:, i].min()), maximum=float(features[:, i].max())
            )
            for i, name in enumerate(FEATURES)
        },
        evaluation=evaluation,
        library_versions=libraries,
        price_unit="source dataset price units (currency unspecified)",
        limitations=[
            f"Only {len(targets)} supplied labelled records; "
            "validation does not establish real-market accuracy.",
            "Correlated features can make individual coefficients unstable; "
            "they are not causal effects.",
            "No independent labelled test set, sale dates, or locations are supplied.",
            "Currency, lot-size/distance units, and school-rating scale are unspecified.",
            "Out-of-range inputs can produce unreliable extrapolations, "
            "including non-positive prices.",
        ],
    )
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "info": info.model_dump()}, artifact_path)
    artifact_path.with_suffix(".json").write_text(
        info.model_dump_json(indent=2) + "\n", encoding="utf-8"
    )
    return info


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True, help="Labelled training CSV")
    parser.add_argument("--output", type=Path, default=Path("artifacts/model.joblib"))
    args = parser.parse_args()
    info = train(args.data, args.output)
    print(info.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
