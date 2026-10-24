# Property Market Analysis API

Java **21** and Spring Boot **3.4.4**, matching the assignment. The service reads the versioned housing CSV, calculates segment statistics, caches aggregate responses, exports filtered data, and calls the model container for what-if scenarios.

## Run

From the repository root:

```bash
docker compose up --build -d --wait market-api
```

Health: [localhost:8002/health](http://localhost:8002/health).

Native development requires JDK 21; the Maven wrapper downloads Maven 3.9.11. From this directory:

```bash
./mvnw spring-boot:run
```

Configure `MODEL_API_URL` (default `http://127.0.0.1:8000`), `MODEL_TIMEOUT_MS` (10000), `DATASET_PATH` (`../../data/house-prices.csv`), and `PORT` (8002) as environment variables. JDK 17 cannot build this assignment; the Docker build supplies JDK 21 independently of the host.

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

The what-if body is `{"baseline": {seven features}, "scenario": {seven features}}`, using the same seven fields as the model. Both predictions are produced by one model batch request. The response includes `baseline`, `scenario`, absolute `change`, `change_percent`, model version, price units, and warnings. The percentage is unavailable when the reference prediction is zero. Reference predictions are model estimates, distinct from observed dataset prices.

## Data, caching, and exports

The CSV is read and validated once on startup, including BOM, exact columns, numeric values, and unique IDs. Missing/corrupt data fails startup. Its SHA-256 matches the model's dataset fingerprint. The dataset is immutable for a process lifetime; restart/rebuild to load a new version.

Caffeine caches equivalent overview filter records, with a maximum of 128 entries and a five-minute expiry. It avoids recomputing aggregates; the cache is local to the service and is discarded on restart. The source cannot change beneath cached results. Model predictions are not cached. Dataset-only analysis and exports remain available if model serving stops.

Empty segments return zero records and null summary metrics, rather than misleading zero prices. CSV uses standard escaping and the original nine columns. PDFBox produces landscape A4 tables with repeated page headers and a Hong Kong time generation stamp. Exports honour segment filters. Browser-only table searching/sorting does not change the export set; the UI explains this.

Model timeouts return 504, connection failures return 503, and invalid model responses return 502. Numeric strings, missing features, and unexpected JSON fields are rejected. Currency, distance units, lot-size units, and rating scale are unspecified in the source, so exports retain source units. No sale dates or geography are present; the service does not invent time trends or regional analysis.

## Tests

```bash
./mvnw verify
```

Tests load the actual dataset and use a local HTTP model stub. They cover filtered/empty results, cache reuse, invalid requests, batch request/response mapping, scenario deltas, CSV filtering, and readable multipage PDF output. Docker runs these tests as part of its build.
