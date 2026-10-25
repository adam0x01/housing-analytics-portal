# Property Value Estimator API

Python 3.12+ and FastAPI application backend. Validated submissions call the separate housing model container. Successful predictions are saved with their inputs, model version, warnings, and creation time in SQLite.

## Run with Docker (without Compose)

Start Docker Desktop and run all Docker commands below from the **repository root**, the directory containing `apps/`, `services/`, and `data/`. The final `.` in the build command must be the repository root.

First start the [model container](../housing-model-api/README.md#run-with-docker-without-compose), named `housing-model-api`, and wait for it to become healthy. Docker starts this estimator independently; it does not start the model automatically.

Before starting, make sure host port 8001 is free. If an earlier container, including a Compose-managed one, uses it, find its name with `docker ps` and stop it with `docker stop CONTAINER_NAME`, using its actual name.

### Build and start

Reuse the shared network and create the estimator's persistent database volume:

```bash
docker network inspect housing-analytics-net >/dev/null 2>&1 || docker network create housing-analytics-net
docker volume create housing-estimator-data
docker build -f services/estimator-api/Dockerfile -t housing-estimator-api:local .
```

Start a new container:

```bash
docker run -d \
  --name housing-estimator-api \
  --network housing-analytics-net \
  --init \
  --read-only \
  --tmpfs /tmp \
  -p 127.0.0.1:8001:8001 \
  -e MODEL_API_URL=http://housing-model-api:8000 \
  -e MODEL_TIMEOUT_SECONDS=10 \
  -e DATABASE_PATH=/app/storage/estimates.sqlite \
  --mount type=volume,src=housing-estimator-data,dst=/app/storage \
  housing-estimator-api:local
```

The image supplies Python 3.12 and installs its own dependencies. The model URL uses the model's container name on the shared network, rather than the host's loopback address.

`-d` returns before readiness. Check until the container reports `healthy`, then check local storage and the model integration:

```bash
docker inspect --format '{{.State.Health.Status}}' housing-estimator-api
curl --fail http://127.0.0.1:8001/health
curl --fail http://127.0.0.1:8001/model-info
```

Open [Swagger UI](http://127.0.0.1:8001/docs). Other containers, including the web app, use `http://housing-estimator-api:8001`. The health check verifies local storage; `/model-info` also exercises the upstream model connection.

### Stop, start again, and view logs

Run the command you need:

```bash
# Stop the server, keeping the container and saved estimates.
docker stop housing-estimator-api

# Start the existing container; keep the model running for predictions.
docker start housing-estimator-api

# Follow logs; Ctrl+C exits the viewer without stopping the server.
docker logs -f housing-estimator-api
```

### Apply code or environment changes

For code changes, rebuild the image, then stop and remove the old container:

```bash
docker build -f services/estimator-api/Dockerfile -t housing-estimator-api:local .
docker stop housing-estimator-api
docker rm housing-estimator-api
```

Repeat the `docker run` command above with the same database volume. Saved estimates survive container replacement. For environment-only changes, skip the build, stop/remove the container, and repeat `docker run` with the updated `-e` values. `docker start` and `docker restart` keep the old image and environment.

An existing `housing-estimator-api` container must be started with `docker start` or removed before its name can be reused by `docker run`.

## Run locally

For native development, stop the standalone container with `docker stop housing-estimator-api` to free port 8001. Keep the model service available, then run from this service directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pip install --no-deps -e .
cp -n .env.example .env
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

The standalone Docker commands mount the `housing-estimator-data` named volume at `/app/storage`. Stopping or removing the container preserves this volume and its history. This is a separate volume from the one used by Compose, so existing Compose history does not automatically appear in the standalone container. Do not remove the volume if you want to retain its estimates. Native database files are ignored by Git.

History belongs to one shared workspace; user accounts and record ownership are not implemented. SQLite provides persistence with no separate database server. Private per-user history requires authentication and ownership checks, and multiple service instances would need a shared database and migration strategy.

## Tests

```bash
pytest -q
```

Tests exercise forwarding, persistence across application restarts, pagination, comparison order, validation, upstream failures, and the rule that failures never save an estimate.
