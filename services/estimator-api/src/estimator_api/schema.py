from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator


class PropertyFeatures(BaseModel):
    """Wire contract shared over HTTP, without importing another service's implementation."""

    model_config = ConfigDict(extra="forbid", strict=True)
    square_footage: Annotated[FiniteFloat, Field(gt=0)]
    bedrooms: Annotated[int, Field(ge=0)]
    bathrooms: Annotated[FiniteFloat, Field(gt=0)]
    year_built: Annotated[int, Field(ge=1, le=9999)]
    lot_size: Annotated[FiniteFloat, Field(ge=0)]
    distance_to_city_center: Annotated[FiniteFloat, Field(ge=0)]
    school_rating: Annotated[FiniteFloat, Field(ge=0)]


class EstimateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(default="Untitled property", max_length=80)
    features: PropertyFeatures

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip() or "Untitled property"


class ModelPrediction(BaseModel):
    price: FiniteFloat
    warnings: list[str]


class ModelResponse(BaseModel):
    model_version: str
    price_unit: str
    predictions: list[ModelPrediction] = Field(min_length=1)


class Estimate(BaseModel):
    id: str
    name: str
    created_at: str
    features: PropertyFeatures
    price: FiniteFloat
    warnings: list[str]
    model_version: str
    price_unit: str


class HistoryPage(BaseModel):
    items: list[Estimate]
    total: int
    page: int
    page_size: int


class CompareRequest(BaseModel):
    ids: list[UUID] = Field(min_length=2, max_length=4)

    @field_validator("ids")
    @classmethod
    def distinct_ids(cls, values: list[UUID]) -> list[UUID]:
        if len(set(values)) != len(values):
            raise ValueError("Choose distinct estimates to compare")
        return values
