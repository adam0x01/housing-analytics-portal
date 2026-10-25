# Property Value Estimator API

Python 3.12+ / FastAPI backend. Validates property inputs, calls the separate model service, and saves successful predictions with their inputs, warnings, timestamps, and model versions in SQLite.

From the repository root:

```bash
docker compose up --build -d --wait estimator-api
```

Compose starts the model dependency. Open [Swagger](http://localhost:8001/docs).

## HTTP contract

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| GET | `/health` | Check local storage |
| GET | `/model-info` | Forward model metadata |
| POST | `/estimates` | Accept `{name, features}`, predict and save; returns 201 |
| GET | `/estimates?page=1&page_size=10` | Newest-first history; page size ≤ 100 |
| GET | `/estimates/{uuid}` | Retrieve a saved estimate |
| POST | `/estimates/compare` | Accept `{ids: [...]}` with 2–4 distinct saved UUIDs; preserve order |

`features` follows the [model contract](../housing-model-api/README.md#api-contract). Invalid inputs return 422; upstream timeouts 504, unavailable services 503, and malformed prediction responses 502. Failed predictions never create history records.

## Native development

Keep the [model API](../housing-model-api/README.md) running and port 8001 free. Stop a running Docker estimator with `docker compose stop estimator-api`. For native startup, run from the repository root:

```bash
cd services/estimator-api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip install --no-deps -e .
cp -n .env.example .env
uvicorn estimator_api.main:app --reload --host 127.0.0.1 --port 8001
```

Open [Swagger](http://localhost:8001/docs); stop with Ctrl+C.

Configuration: `MODEL_API_URL` (default `http://127.0.0.1:8000`), `MODEL_TIMEOUT_SECONDS` (10), and `DATABASE_PATH` (`storage/estimates.sqlite`). Service-local `.env` values are supported.

Compose persists history in the `estimator-data` volume across restarts/rebuilds. `docker compose down --volumes` deletes it. This is one shared workspace without user accounts; the deployed SQLite service runs as a single instance.

## Verify

```bash
ruff check .
ruff format --check .
pytest -q
```
