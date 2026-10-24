# Property Value Estimator API

Python 3.12+ and FastAPI application backend. Validated submissions call the separate housing model container. Successful predictions are saved with their inputs, model version, warnings, and creation time in SQLite.

## Run

From the repository root:

```bash
docker compose up --build -d --wait estimator-api
```

Swagger: [localhost:8001/docs](http://localhost:8001/docs).

For native development, from this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip install --no-deps -e .
cp .env.example .env
uvicorn estimator_api.main:app --reload --host 127.0.0.1 --port 8001
```

Start the model separately. Configure `MODEL_API_URL`, `MODEL_TIMEOUT_SECONDS` (default 10), and `DATABASE_PATH` (default `storage/estimates.sqlite`) in the environment or service-local `.env`.

## HTTP contract

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| GET | `/health` | Verify local storage is readable |
| GET | `/model-info` | Retrieve model metadata from the model service |
| POST | `/estimates` | Predict and persist an estimate; returns 201 |
| GET | `/estimates?page=1&page_size=10` | Newest-first history, total count, pagination; maximum page size 100 |
| GET | `/estimates/{uuid}` | Retrieve a saved estimate, or 404 |
| POST | `/estimates/compare` | Retrieve 2–4 distinct estimates in requested order |

Example estimate request:

```json
{
  "name": "Property A",
  "features": {
    "square_footage": 1550, "bedrooms": 3, "bathrooms": 2,
    "year_built": 1997, "lot_size": 6800,
    "distance_to_city_center": 4.1, "school_rating": 7.6
  }
}
```

Comparison request: `{"ids": ["first-saved-uuid", "second-saved-uuid"]}`. UUIDs must exist, be distinct, and number between two and four.

The seven-feature schema matches the model contract, including fractional bathrooms and non-finite-value rejection. Invalid input returns 422. Upstream timeouts return 504, unavailable services return 503, and invalid upstream responses return 502. Failed predictions do not create history records. SQLite operations use parameterised statements and a separate connection per operation.

## Persistence and scope

Compose stores the database in the `estimator-data` named volume, so ordinary container rebuilds/restarts preserve history. `docker compose down` preserves this volume; adding `--volumes` deletes it. Native database files are ignored by Git.

This assignment is one shared local workspace, with no user accounts or authentication requirement. History is shared by its visitors. A multi-user deployment needs authentication and ownership checks before offering private per-user history. SQLite keeps this demonstration small; a shared multi-instance service would need a suitable database and migration strategy.

## Tests

```bash
pytest -q
```

Tests exercise forwarding, persistence across application restarts, pagination, comparison order, validation, upstream failures, and the rule that failures never save an estimate.
