# Housing Price Prediction Model API

Housing price prediction with Python 3.12+, FastAPI, and scikit-learn ordinary least-squares regression. The service supports single and batch inference and runs independently in Docker.

## Run with Docker

From the repository root, with Docker running:

```bash
docker compose up --build -d --wait housing-model-api
```

Open [Swagger UI](http://localhost:8000/docs). [OpenAPI JSON](http://localhost:8000/openapi.json) and [health](http://localhost:8000/health) are available on the same port. The image trains from the labelled CSV during its build and loads that artifact on startup. Port 8000 is bound to loopback for local access.

Stop this service with `docker compose stop housing-model-api` from the repository root. See the [project setup guide](../../README.md) to start or stop the complete stack.

## Run locally

Use Python 3.12 or newer. If the Docker model container is running, stop it first with `docker compose stop housing-model-api` from the repository root to free port 8000. Then, from this service directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip install --no-deps -e .
python -m housing_model_api.training --data ../../data/house-prices.csv --output artifacts/model.joblib
uvicorn housing_model_api.main:app --host 127.0.0.1 --port 8000
```

`requirements.txt` pins runtime dependencies and `requirements-dev.txt` adds pinned test/lint dependencies. `pyproject.toml` declares supported dependency ranges. Update the pins deliberately and re-run native tests and the container checks when upgrading. Docker uses Python 3.12; `.python-version` records that preferred development runtime.

The training command writes ignored `artifacts/model.joblib` and `artifacts/model.json`. Set `MODEL_PATH` to load a different trusted artifact. The default path is relative to the working directory, so run the server from this service directory. Missing artifacts fail startup with an instruction to train first.

## API contract

| Method | Route | Behaviour |
| --- | --- | --- |
| `POST` | `/predict` | Accept one feature object or an array of 1–500 feature objects |
| `GET` | `/model-info` | Coefficients, intercept, feature order/ranges, cross-validation metrics, baseline, and version metadata |
| `GET` | `/health` | Status, model readiness, and serving model version |

All seven feature fields are required. Numeric strings, booleans as numbers, missing values, non-finite values, and unknown fields are rejected with HTTP 422. `id` and `price` are not prediction inputs.

| Feature | Validation | Interpretation |
| --- | --- | --- |
| `square_footage` | Finite number, greater than zero | Floor area in square feet, as named in the source |
| `bedrooms` | Integer, at least zero | Allows zero-bedroom/studio inputs, with a range warning |
| `bathrooms` | Finite number, greater than zero | Fractional values such as 1.5 and 2.5 are supported |
| `year_built` | Integer, 1–9999 | Calendar year; unusual/future values receive training-range warnings |
| `lot_size` | Finite number, at least zero | Source units, unspecified |
| `distance_to_city_center` | Finite number, at least zero | Source units, unspecified |
| `school_rating` | Finite number, at least zero | Source scale, unspecified; no invented maximum |

From this service directory, with the API running:

```bash
curl --fail --json @examples/predict-single.json http://localhost:8000/predict
curl --fail --json @examples/predict-batch.json http://localhost:8000/predict
curl --fail http://localhost:8000/model-info
```

The batch example contains the ten supplied unlabelled samples in source order. Swagger's example selector also shows single and batch request shapes.

Single request:

```json
{
  "square_footage": 1550,
  "bedrooms": 3,
  "bathrooms": 2,
  "year_built": 1997,
  "lot_size": 6800,
  "distance_to_city_center": 4.1,
  "school_rating": 7.6
}
```

Responses always contain a `predictions` array, even for a single request, plus `model_version` and `price_unit`. Each prediction contains a rounded `price` and a `warnings` array. Batch results preserve input order. Structurally valid values outside the observed training range receive a warning instead of being rejected. A model's negative extrapolation is reported with a warning rather than silently clipped to zero. No prediction confidence percentage is claimed.

The original currency, distance/lot-size units, and rating scale are unspecified. The API preserves numeric source units. Two decimal places are a consistent display convention, not an assertion about the data's precision or currency.

## Evaluation and model lifecycle

1. Validate the labelled CSV, including BOM, column names, IDs, complete numeric rows, and exact duplicate labelled properties.
2. Exclude `id` and `price` from the seven-column feature matrix.
3. Produce out-of-fold predictions using shuffled five-fold cross-validation with seed 42. Compare a mean-price dummy model on the same splits.
4. Report pooled held-out MAE, RMSE, R² and individual-fold metrics. These are not training-set scores or independent test-set results.
5. Refit linear regression on all labelled rows, then save the model and metadata.
6. Load that artifact once on API startup; do not train during requests.

See the [evaluation notes](../../docs/model-evaluation.md) and [architecture notes](../../docs/architecture-overview.md). This is a small demonstration dataset with strong feature correlation and no dates/locations. Treat its metrics and coefficient signs accordingly.

Only load artifacts created by this project's trusted training/build process. Joblib's pickle-based loading is not safe for arbitrary uploaded files. There is no upload or public retraining endpoint.

## Verify

From this directory with the virtual environment active:

```bash
ruff check .
ruff format --check .
pytest -q
```

Tests cover supplied samples, raw-unit coefficient predictions, consistent batch ordering, invalid/non-finite inputs, model startup failure, explicit feature order, held-out evaluation against independently generated predictions, CSV corruption, and repeatable retraining.

The [model CI workflow](../../.github/workflows/model-api.yml) runs linting and tests, builds the container, and checks its health. Recorded local results are in the [verification notes](../../docs/verification.md).
