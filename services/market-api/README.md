# Property Market Analysis API

Java **21** and Spring Boot **3.4.4** service for housing market analysis. It reads the versioned housing CSV, calculates segment statistics, caches aggregate responses, exports filtered data, and calls the shared model service for what-if scenarios.

## Run with Docker (without Compose)

Start Docker Desktop. Run all Docker commands below from the **repository root**, the directory containing `apps/`, `services/`, and `data/`. The final `.` in `docker build` is the root build context, which includes the shared CSV.

Start the [model container](../housing-model-api/README.md#run-with-docker-without-compose), named `housing-model-api`, first and wait for it to become healthy. The market service can serve dataset analysis without the model, but what-if requests require it. Docker does not start dependencies automatically.

Before starting, make sure host port 8002 is free. If an earlier container, including a Compose-managed one, uses it, find its name with `docker ps` and stop it with `docker stop CONTAINER_NAME`, using its actual name.

### Build and start

```bash
docker network inspect housing-analytics-net >/dev/null 2>&1 || docker network create housing-analytics-net
docker build -f services/market-api/Dockerfile -t housing-market-api:local .
```

The image supplies Maven and JDK 21, runs the Java tests, and packages the service and CSV. No host Java or Maven installation is required.

Start a new container:

```bash
docker run -d \
  --name housing-market-api \
  --network housing-analytics-net \
  --init \
  --read-only \
  --tmpfs /tmp \
  -p 127.0.0.1:8002:8002 \
  -e MODEL_API_URL=http://housing-model-api:8000 \
  -e MODEL_TIMEOUT_MS=10000 \
  -e DATASET_PATH=/app/data/house-prices.csv \
  -e PORT=8002 \
  housing-market-api:local
```

`-d` returns before the Java application is ready. Check until the container reports `healthy`, then inspect the dataset health and market overview:

```bash
docker inspect --format '{{.State.Health.Status}}' housing-market-api
curl --fail http://127.0.0.1:8002/health
curl --fail http://127.0.0.1:8002/market/overview
```

The model URL resolves through the shared Docker network. The web app uses `http://housing-market-api:8002` on that network; your browser or host terminal uses `http://127.0.0.1:8002`. The market health check verifies its dataset, rather than the availability of the model.

### Stop, start again, and view logs

Run the command you need:

```bash
# Stop the Java service, keeping its container.
docker stop housing-market-api

# Start the existing container again.
docker start housing-market-api

# Follow logs; Ctrl+C exits the viewer without stopping the server.
docker logs -f housing-market-api
```

### Apply code, dataset, or environment changes

For code or CSV changes, rebuild the image and remove the old container:

```bash
docker build -f services/market-api/Dockerfile -t housing-market-api:local .
docker stop housing-market-api
docker rm housing-market-api
```

Repeat the `docker run` command above. For environment-only changes, skip the build, stop/remove the container, and repeat `docker run` with the updated `-e` values. `docker start` and `docker restart` keep the existing image and environment.

If `housing-market-api` already exists, start it with `docker start` or remove it before reusing its name with `docker run`.

## Run locally

Native development requires JDK 21; the Maven wrapper downloads Maven 3.9.11. Stop the standalone container with `docker stop housing-market-api` to free port 8002. From this service directory:

```bash
./mvnw spring-boot:run
```

Configure `MODEL_API_URL` (default `http://127.0.0.1:8000`), `MODEL_TIMEOUT_MS` (10000), `DATASET_PATH` (`../../data/house-prices.csv`), and `PORT` (8002) as environment variables. Building the service requires JDK 21; Docker supplies it independently of the host.

## HTTP contract

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| GET | `/health` | Dataset readiness, record count, and dataset fingerprint |
| GET | `/market/overview` | Filtered properties, statistics, bedroom segments, and fixed price bands |
| POST | `/market/what-if` | Evaluate reference/scenario together using the model's batch endpoint |
| GET | `/market/export.csv` | Download all properties matching segment filters |
| GET | `/market/export.pdf` | Download a paginated report with matching data, filters, and provenance |

Overview and exports accept the same query parameters: `bedrooms`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, and `minSchoolRating`. Bounds are inclusive; absent parameters apply no constraint. Invalid numbers, negative bounds, or inverted ranges return 422. For example:

```bash
curl 'http://localhost:8002/market/overview?bedrooms=3&minPrice=200000'
curl 'http://localhost:8002/market/export.csv?bedrooms=3' -o market.csv
```

JSON responses and feature payloads use `snake_case`. Query parameters use the camel-case names listed above.

What-if requests provide `baseline` and `scenario` objects with the same seven fields as the [model API](../housing-model-api/README.md#api-contract). For example, to compare two bathroom counts while keeping other features fixed:

```bash
curl --fail --json @- http://localhost:8002/market/what-if <<'JSON'
{
  "baseline": {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6
  },
  "scenario": {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6
  }
}
JSON
```

Both predictions are produced by one model batch request. The response includes `baseline`, `scenario`, absolute `change`, `change_percent`, model version, price units, and warnings. The percentage is unavailable when the reference prediction is zero. Reference predictions are model estimates, distinct from observed dataset prices.

## Data, caching, and exports

The CSV is read and validated once on startup, including BOM, exact columns, numeric values, and unique IDs. Missing/corrupt data fails startup. Its SHA-256 matches the model's dataset fingerprint. The dataset is immutable for a process lifetime. Restart a native process after changing its CSV; rebuild the Docker image when changing the CSV copied into it.

Caffeine caches equivalent overview filter records, with a maximum of 128 entries and a five-minute expiry. It avoids recomputing aggregates; the cache is local to the service and is discarded on restart. The source cannot change beneath cached results. Model predictions are not cached. Dataset-only analysis and exports remain available if model serving stops.

Empty segments return zero records and null summary metrics, rather than misleading zero prices. CSV uses standard escaping and the original nine columns. PDFBox produces landscape A4 tables with repeated page headers and a Hong Kong time generation stamp. Exports honour segment filters. Browser-only table searching/sorting does not change the export set; the UI explains this.

Model timeouts return 504, connection failures return 503, and invalid model responses return 502. Numeric strings, missing features, and unexpected JSON fields are rejected. Currency, distance units, lot-size units, and rating scale are unspecified in the source, so exports retain source units. No sale dates or geography are present; the service does not invent time trends or regional analysis.

## Tests

```bash
./mvnw verify
```

Tests load the actual dataset and use a local HTTP model stub. They cover filtered/empty results, cache reuse, invalid requests, batch request/response mapping, scenario deltas, CSV filtering, and readable multipage PDF output. Docker runs these tests as part of its build.
