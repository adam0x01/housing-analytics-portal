# Housing Model API

Python 3.12+, FastAPI, and scikit-learn linear regression. From the repository root:

```bash
docker compose up --build -d --wait housing-model-api
```

Open [Swagger](http://localhost:8000/docs). The Docker build trains the model; startup loads the artifact once.

## API contract

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| POST | `/predict` | One feature object or an array of 1–500 objects; results preserve order |
| GET | `/model-info` | Coefficients, intercept, feature ranges, cross-validation/baseline metrics, provenance |
| GET | `/health` | Readiness and model version |

All seven inputs are required: positive `square_footage` and `bathrooms`; non-negative `lot_size`, `distance_to_city_center`, and `school_rating`; integer `bedrooms` ≥ 0 and `year_built` between 1 and 9999. Fractional bathrooms are supported. Numeric strings, unknown fields, missing/non-finite values, and booleans as numbers return 422.

From this service directory, with the API running:

```bash
curl --fail --json @examples/predict-single.json http://localhost:8000/predict
curl --fail --json @examples/predict-batch.json http://localhost:8000/predict
```

The batch example contains the ten supplied samples. Responses always contain `model_version`, `price_unit`, and a `predictions` array of `{price, warnings}` objects. Out-of-range values and non-positive predictions produce warnings. Currency and several source units are unspecified; no confidence percentage is claimed.

## Native development

Use Python 3.12+ and keep port 8000 free. Stop a running Docker model with `docker compose stop housing-model-api`. For native startup, run from the repository root:

```bash
cd services/housing-model-api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip install --no-deps -e .
python -m housing_model_api.training --data ../../data/house-prices.csv --output artifacts/model.joblib
uvicorn housing_model_api.main:app --host 127.0.0.1 --port 8000
```

Open [Swagger](http://localhost:8000/docs); stop with Ctrl+C. Run subsequent training, server, and test commands from this service directory.

Runtime/test dependencies are pinned in `requirements*.txt`. Training writes ignored model and JSON metadata artifacts. `MODEL_PATH` can select another trusted artifact; missing or incompatible artifacts fail startup. Only load artifacts created by this project's training process because joblib uses pickle-based deserialization.

See [model service notes](../../docs/model-evaluation.md) for the model lifecycle and demo scope.

## Verify

```bash
ruff check .
ruff format --check .
pytest -q
```
