"""Shared model input and API response contract."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat

FEATURES = (
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
)

EXAMPLE = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}


class PropertyFeatures(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, json_schema_extra={"examples": [EXAMPLE]}
    )

    square_footage: Annotated[FiniteFloat, Field(gt=0)]
    bedrooms: Annotated[int, Field(ge=0)]
    bathrooms: Annotated[FiniteFloat, Field(gt=0)]
    year_built: Annotated[int, Field(ge=1, le=9999)]
    lot_size: Annotated[FiniteFloat, Field(ge=0, description="Units as supplied in the dataset")]
    distance_to_city_center: Annotated[
        FiniteFloat, Field(ge=0, description="Units as supplied in the dataset")
    ]
    school_rating: Annotated[
        FiniteFloat, Field(ge=0, description="Rating scale is unspecified in the source data")
    ]

    def feature_vector(self) -> list[float]:
        return [float(getattr(self, name)) for name in FEATURES]


BatchInput = Annotated[list[PropertyFeatures], Field(min_length=1, max_length=500)]


class Metrics(BaseModel):
    mae: float
    rmse: float
    r2: float


class FoldMetrics(BaseModel):
    fold: int
    training_rows: int
    validation_rows: int
    regression: Metrics
    baseline: Metrics


class Evaluation(BaseModel):
    method: str
    folds: int
    shuffle: bool
    seed: int
    regression: Metrics
    baseline: Metrics
    fold_metrics: list[FoldMetrics]


class FeatureRange(BaseModel):
    minimum: float
    maximum: float


class ModelInfo(BaseModel):
    model_version: str
    algorithm: str
    artifact_format: int
    trained_at: str
    training_rows: int
    dataset_sha256: str
    feature_names: list[str]
    coefficients: dict[str, float]
    intercept: float
    feature_ranges: dict[str, FeatureRange]
    evaluation: Evaluation
    library_versions: dict[str, str]
    price_unit: str
    limitations: list[str]


class Prediction(BaseModel):
    price: FiniteFloat
    warnings: list[str]


class PredictionResponse(BaseModel):
    model_version: str
    price_unit: str
    predictions: list[Prediction]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str
