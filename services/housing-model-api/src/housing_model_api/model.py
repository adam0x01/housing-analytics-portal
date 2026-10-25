"""Load a trusted artifact and apply one model consistently to single or batch inputs."""

from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LinearRegression

from housing_model_api.schema import (
    FEATURES,
    ModelInfo,
    Prediction,
    PredictionResponse,
    PropertyFeatures,
)
from housing_model_api.training import ARTIFACT_FORMAT, library_versions


class ModelService:
    """Load one compatible artifact per process and preserve input order during inference."""

    def __init__(self, artifact_path: Path):
        if not artifact_path.is_file():
            raise RuntimeError(
                f"Model artifact not found at {artifact_path}. Run the training command first."
            )
        # This file must come from our own training/build process, never from a user upload.
        bundle = joblib.load(artifact_path)
        self.info = ModelInfo.model_validate(bundle["info"])
        self.model = bundle["model"]
        if (
            self.info.artifact_format != ARTIFACT_FORMAT
            or self.info.feature_names != list(FEATURES)
            or not isinstance(self.model, LinearRegression)
            or self.model.n_features_in_ != len(FEATURES)
            or self.info.library_versions != library_versions()
        ):
            raise RuntimeError("Incompatible model artifact; retrain with the current runtime.")

    def predict(self, properties: list[PropertyFeatures]) -> PredictionResponse:
        """Return prices with per-property warnings, without mutating or retraining the model."""
        features = np.asarray([item.feature_vector() for item in properties], dtype=np.float64)
        prices = self.model.predict(features)
        if not np.isfinite(prices).all():
            raise ValueError(
                "Inputs produced non-finite predictions; use less extreme feature values."
            )
        predictions = []
        for property_features, price in zip(properties, prices, strict=True):
            warnings = []
            for name in FEATURES:
                value = getattr(property_features, name)
                bounds = self.info.feature_ranges[name]
                if value < bounds.minimum or value > bounds.maximum:
                    warnings.append(
                        f"{name} is outside the training range "
                        f"[{bounds.minimum}, {bounds.maximum}]; "
                        "prediction extrapolates beyond observed data."
                    )
            if price <= 0:
                warnings.append("Model returned a non-positive price; this estimate is unreliable.")
            predictions.append(Prediction(price=round(float(price), 2), warnings=warnings))
        return PredictionResponse(
            model_version=self.info.model_version,
            price_unit=self.info.price_unit,
            predictions=predictions,
        )
