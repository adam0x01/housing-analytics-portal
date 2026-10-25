"""Estimation workflows: validate requests, call the model, then persist successful results."""

from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from estimator_api.config import Settings
from estimator_api.schema import (
    CompareRequest,
    Estimate,
    EstimateRequest,
    HistoryPage,
    ModelResponse,
)
from estimator_api.store import EstimateStore


def create_app(settings: Settings | None = None, transport: httpx.AsyncBaseTransport | None = None):
    """Keep storage and the reusable model HTTP client scoped to the application lifespan."""
    config = settings or Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.store = EstimateStore(config.database_path)
        async with httpx.AsyncClient(
            base_url=str(config.model_api_url).rstrip("/") + "/",
            timeout=config.model_timeout_seconds,
            transport=transport,
        ) as client:
            application.state.model_client = client
            yield

    application = FastAPI(title="Property Value Estimator API", version="0.1.0", lifespan=lifespan)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {key: item[key] for key in ("loc", "msg", "type")} for item in error.errors()
                ]
            },
        )

    async def upstream(request: Request, method: str, path: str, **kwargs) -> dict:
        """Translate model transport failures into the estimator's public error contract."""
        try:
            response = await request.app.state.model_client.request(method, path, **kwargs)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Expected a model response object")
            return payload
        except httpx.TimeoutException as error:
            raise HTTPException(
                504, "The prediction service timed out. Please try again."
            ) from error
        except httpx.HTTPStatusError as error:
            status = 422 if error.response.status_code == 422 else 503
            message = (
                "The model rejected these property features."
                if status == 422
                else "The prediction service is temporarily unavailable. Please try again."
            )
            raise HTTPException(status, message) from error
        except httpx.RequestError as error:
            raise HTTPException(
                503, "Cannot reach the prediction service. Please try again."
            ) from error
        except ValueError as error:
            raise HTTPException(
                502, "The prediction service returned an invalid response."
            ) from error

    @application.get("/health")
    def health(request: Request):
        request.app.state.store.history(1, 1)
        return {"status": "ok", "storage": "sqlite"}

    @application.get("/model-info")
    async def model_info(request: Request):
        return await upstream(request, "GET", "model-info")

    @application.post("/estimates", response_model=Estimate, status_code=201)
    async def estimate(payload: EstimateRequest, request: Request):
        raw = await upstream(request, "POST", "predict", json=payload.features.model_dump())
        try:
            result = ModelResponse.model_validate(raw)
            if len(result.predictions) != 1:
                raise ValueError("Expected exactly one prediction")
        except (ValidationError, ValueError) as error:
            raise HTTPException(
                502, "The prediction service returned an invalid response."
            ) from error
        # Validate the model response before saving; SQLite work must not block the event loop.
        return await run_in_threadpool(request.app.state.store.create, payload, result)

    @application.get("/estimates", response_model=HistoryPage)
    def history(
        request: Request,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    ):
        return request.app.state.store.history(page, page_size)

    @application.post("/estimates/compare", response_model=list[Estimate])
    def compare(payload: CompareRequest, request: Request):
        # Keep requested order and historical model versions; comparisons do not predict again.
        estimates = [request.app.state.store.get(str(identifier)) for identifier in payload.ids]
        if any(item is None for item in estimates):
            raise HTTPException(404, "One or more selected estimates could not be found.")
        return estimates

    @application.get("/estimates/{identifier}", response_model=Estimate)
    def get_estimate(identifier: UUID, request: Request):
        result = request.app.state.store.get(str(identifier))
        if result is None:
            raise HTTPException(404, "Estimate not found.")
        return result

    return application


app = create_app()
