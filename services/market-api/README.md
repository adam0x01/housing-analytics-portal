# Property Market Analysis API

Java **21** / Spring Boot **3.4.4**. Loads the housing CSV, computes segment statistics, caches overviews, exports CSV/PDF, and calls the shared model for what-if scenarios.

## Run

From the repository root:

```bash
docker compose up --build -d --wait market-api
```

Open [Swagger](http://localhost:8002/docs), [OpenAPI](http://localhost:8002/v3/api-docs), or [health](http://localhost:8002/health). Compose starts the model dependency.

## Native development

Requires **JDK 21**. The checked-in Maven wrapper downloads Maven on first use; it does not install Java.

### Select JDK 21 on macOS

List installed JDKs:

```bash
/usr/libexec/java_home -V
```

If JDK 21 is missing, install it with Homebrew:

```bash
brew install --cask temurin@21
```

Select it in the terminal where you will run Maven:

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

### Start the API

If the Docker market service is running, stop it from the repository root with `docker compose stop market-api`. For native startup, run from the repository root:

```bash
cd services/market-api
./mvnw -v
./mvnw spring-boot:run
```

Both `java -version` and `./mvnw -v` should report Java 21. Keep port 8002 free. Stop with Ctrl+C; restart after Java source changes. The default CSV path assumes Maven is run from `services/market-api/`.

From another terminal, check the running API:

```bash
curl --fail http://localhost:8002/health
curl --fail http://localhost:8002/market/overview
```

| Variable | Default |
| --- | --- |
| `MODEL_API_URL` | `http://127.0.0.1:8000` |
| `MODEL_TIMEOUT_MS` | `10000` |
| `DATASET_PATH` | `../../data/house-prices.csv` |
| `PORT` | `8002` |

Pass configuration as environment variables; Java does not load the root `.env`. Dataset analysis and exports work without the model, while what-if requests need the [model API](../housing-model-api/README.md) running.

For a fully native portal, use `MARKET_API_URL=http://127.0.0.1:8002` in `apps/web/.env.local`. A web container on Docker Desktop reaches the host at `http://host.docker.internal:8002`; recreate only that container from the repository root:

```bash
MARKET_API_URL=http://host.docker.internal:8002 docker compose up -d --no-deps --wait web
```

Use `PORT=8003 ./mvnw spring-boot:run` if port 8002 is occupied, and update the caller's market API URL to match.

## HTTP contract

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| GET | `/health` | Dataset readiness, row count, and fingerprint |
| GET | `/market/overview` | Filtered properties, statistics, bedroom segments, price bands |
| POST | `/market/what-if` | Accept `{baseline, scenario}` feature objects; evaluate in one model batch |
| GET | `/market/export.csv` | Download properties matching segment filters |
| GET | `/market/export.pdf` | Paginated report with filters and dataset provenance |

Overview and exports accept `bedrooms`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, and `minSchoolRating`. Bounds are inclusive. JSON bodies use `snake_case`; query parameters use the names above.

```bash
curl --fail 'http://localhost:8002/market/overview?bedrooms=3&minPrice=200000'
curl --fail 'http://localhost:8002/market/export.csv?bedrooms=3' -o market.csv
```

What-if features follow the [model contract](../housing-model-api/README.md#api-contract). Results include both predictions, absolute/percentage change, warnings, and model version. The percentage is null for a zero reference prediction. Observed prices remain distinct from model estimates.

## Behaviour and verification

Caffeine caches equivalent overview filters for five minutes, up to 128 entries; predictions are not cached. The dataset is validated and immutable until restart (rebuild when changing Docker's copied CSV). Empty segments return null price statistics. Exports apply segment filters; browser table search/sort does not alter them.

Invalid input returns 422, model timeouts 504, unavailable models 503, and malformed model responses 502. Currency and unspecified source units are preserved.

```bash
./mvnw verify
java -jar target/market-api-0.1.0.jar
```

Tests use the real CSV and a local model stub, covering aggregates, filters, cache reuse, validation, batch mapping, exports, and Swagger. A running model is not needed for tests.
