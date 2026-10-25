"""FastAPI entry point: uvicorn housing_model_api.main:app."""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from housing_model_api import __version__
from housing_model_api.model import ModelService
from housing_model_api.schema import (
    EXAMPLE,
    BatchInput,
    HealthResponse,
    ModelInfo,
    PredictionResponse,
    PropertyFeatures,
)


def create_app(artifact_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        # Fail startup when serving would be impossible, rather than accepting broken requests.
        path = artifact_path or Path(os.environ.get("MODEL_PATH", "artifacts/model.joblib"))
        application.state.model_service = ModelService(path)
        yield
        del application.state.model_service

    application = FastAPI(
        title="Housing Price Prediction Model API",
        version=__version__,
        description=(
            "Single and batch predictions from seven numeric housing features. "
            "Prices use source dataset units; currency is unspecified. "
            "See /model-info for held-out evaluation and limitations."
        ),
        lifespan=lifespan,
    )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, error: RequestValidationError):
        # Avoid echoing request data or non-JSON values such as NaN/Infinity in errors.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {key: item[key] for key in ("loc", "msg", "type")} for item in error.errors()
                ]
            },
        )

    @application.get("/health", response_model=HealthResponse, tags=["Operations"])
    def health(request: Request) -> HealthResponse:
        service: ModelService = request.app.state.model_service
        return HealthResponse(
            status="ok", model_loaded=True, model_version=service.info.model_version
        )

    @application.get("/model-info", response_model=ModelInfo, tags=["Model"])
    def model_info(request: Request) -> ModelInfo:
        return request.app.state.model_service.info

    @application.post("/predict", response_model=PredictionResponse, tags=["Model"])
    def predict(
        request: Request,
        payload: Annotated[
            PropertyFeatures | BatchInput,
            Body(
                openapi_examples={
                    "single": {"summary": "One property", "value": EXAMPLE},
                    "batch": {"summary": "Two properties, in order", "value": [EXAMPLE, EXAMPLE]},
                }
            ),
        ],
    ) -> PredictionResponse:
        properties = [payload] if isinstance(payload, PropertyFeatures) else payload
        try:
            return request.app.state.model_service.predict(properties)
        except (ValueError, OverflowError) as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return application


app = create_app()
