# Property Market Analysis API

Java **21** and Spring Boot **3.4.4** service for housing market analysis. It reads the versioned housing CSV, calculates segment statistics, caches aggregate responses, exports filtered data, and calls the shared model service for what-if scenarios.

## Run with Docker Compose

From the repository root:

```bash
docker compose up --build -d --wait market-api
```

Health: [localhost:8002/health](http://localhost:8002/health).

Swagger UI: [localhost:8002/docs](http://localhost:8002/docs). The UI redirects to `/swagger-ui/index.html` and supports trying the market endpoints, segment filters, what-if requests, and downloads. The generated OpenAPI JSON is available at [localhost:8002/v3/api-docs](http://localhost:8002/v3/api-docs).

Swagger is provided by `springdoc-openapi-starter-webmvc-ui` **2.8.14**, from the [2.8.x line compatible with Spring Boot 3.4.x](https://springdoc.org/v2/#_what_is_the_compatibility_matrix_of_springdoc_openapi_with_spring_boot). This patch avoids a [later Swagger resource-path regression on Spring Boot 3.4.4](https://github.com/springdoc/springdoc-openapi/issues/3210). If the service is already running, rebuild/restart it to load the dependency. Native startup enables the same documentation endpoints.

Compose also starts the model service used by what-if requests. Stop the market service with `docker compose stop market-api`; see the [project setup guide](../../README.md) for the complete stack.

## Run directly with Maven

Use **JDK 21** and the checked-in `mvnw` script to run the Java API directly on your machine. The [Maven Wrapper](https://maven.apache.org/tools/wrapper/index.html) downloads the pinned Maven **3.9.11** on first use, so a separate Maven installation is unnecessary. First use also downloads dependencies and needs internet access. The wrapper does not install the JDK.

### Select JDK 21 on macOS

List installed JDKs:

```bash
/usr/libexec/java_home -V
```

If JDK 21 is missing, install it once using the official [Homebrew Temurin 21 cask](https://formulae.brew.sh/cask/temurin@21):

```bash
brew install --cask temurin@21
```

Select JDK 21 in the terminal where you will run Maven:

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

The output should show Java 21. These exports affect the current terminal; repeat them in a new terminal if its default Java is another version. JDK 17 cannot compile this project's Java 21 target.

### Start and stop the API

From the repository root, enter the Java sub-project and check which Java Maven uses:

```bash
cd services/market-api
./mvnw -v
```

Confirm that Maven also reports Java 21. Run all subsequent Maven and JAR commands from **`services/market-api/`**. This keeps the default CSV path, `../../data/house-prices.csv`, pointing to the supplied dataset.

If the Docker market service is running, free port 8002 with `docker compose stop market-api` **from the repository root**, or choose the alternative port below. Keep the model API available at `http://127.0.0.1:8000` for what-if predictions; see its [native/Docker instructions](../housing-model-api/README.md). Dataset analysis, health checks, and exports work without the model.

From `services/market-api/`, compile and launch using the [Spring Boot Maven plugin](https://docs.spring.io/spring-boot/3.4/maven-plugin/run.html):

```bash
./mvnw spring-boot:run
```

The API runs in the foreground and logs appear in that terminal. From another terminal, check:

```bash
curl --fail http://127.0.0.1:8002/health
curl --fail http://127.0.0.1:8002/market/overview
```

Stop the API with **Ctrl+C** in the Maven terminal. After code changes, stop the process, then rebuild and run again:

```bash
./mvnw clean spring-boot:run
```

Java changes do not automatically reload in this project. Repeat any custom environment settings when restarting.

### Configure the model, dataset, and port

Set environment variables in the terminal or inline for one invocation:

```bash
MODEL_API_URL=http://127.0.0.1:8000 \
MODEL_TIMEOUT_MS=10000 \
DATASET_PATH=../../data/house-prices.csv \
PORT=8002 \
./mvnw spring-boot:run
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODEL_API_URL` | `http://127.0.0.1:8000` | Model API used by what-if requests |
| `MODEL_TIMEOUT_MS` | `10000` | Model connection/read timeout, in milliseconds |
| `DATASET_PATH` | `../../data/house-prices.csv` | CSV file read from disk on startup |
| `PORT` | `8002` | Java HTTP server port |

For example, use another port without stopping the Docker market service:

```bash
PORT=8003 ./mvnw spring-boot:run
```

Then use `http://127.0.0.1:8003/health` and change any caller's market API URL accordingly. The Java application does not automatically read the repository's `.env` file; pass these environment variables explicitly.

### Build and run an executable JAR

From `services/market-api/`, run checks/tests and build the JAR, then launch it:

```bash
./mvnw clean verify
java -jar target/market-api-0.1.0.jar
```

Stop the JAR with **Ctrl+C**. The same environment variables apply. The CSV remains an external file, so keep it at the configured path when running the JAR. After Java code changes, rebuild the JAR and restart it.

### Common Maven commands

Run the command you need from `services/market-api/` with JDK 21 selected:

| Command | Purpose |
| --- | --- |
| `./mvnw -v` | Show the Maven and Java versions being used |
| `./mvnw clean` | Remove generated files in `target/` |
| `./mvnw clean compile` | Compile the application |
| `./mvnw test` | Run the automated tests |
| `./mvnw clean verify` | Run checks/tests and build the executable JAR |
| `./mvnw clean package -DskipTests` | Build the JAR while skipping test execution |
| `./mvnw spring-boot:run` | Compile and run the API in the foreground |

Tests use the supplied CSV and a local HTTP model stub; they do not need a running model API.

### Connect the portal to the native Java API

If Next.js also runs natively, set `MARKET_API_URL=http://127.0.0.1:8002` in `apps/web/.env.local` and restart its process.

If Next.js runs in Docker Desktop on macOS, use [`host.docker.internal`](https://docs.docker.com/desktop/features/networking/networking-how-tos/) to reach the host. From the repository root, recreate only the web container with that address:

```bash
MARKET_API_URL=http://host.docker.internal:8002 \
docker compose up -d --no-deps --wait web
```

`--no-deps` prevents Compose from starting the Docker market container again and competing for port 8002. Keep the other APIs running. Substitute port 8003 if you chose it above.

When returning to the usual Docker setup, stop the native Java process, restore the web setting to `http://market-api:8002`, and recreate the market/web containers using the project setup guide.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| `release version 21 not supported` or `invalid target release: 21` | Select JDK 21 with `JAVA_HOME`; check `java -version` and `./mvnw -v` |
| `Permission denied: ./mvnw` | From the service directory, run `chmod +x mvnw`, then retry |
| Port 8002 already in use | Stop the existing server, or use `PORT=8003 ./mvnw spring-boot:run` |
| CSV file not found | Run from `services/market-api/`, or set `DATASET_PATH` to the CSV's absolute path |
| What-if requests return 503 | Start the model API and check `MODEL_API_URL`; market `/health` checks the dataset, not the model connection |

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

Tests load the actual dataset and use a local HTTP model stub. They cover filtered/empty results, cache reuse, invalid requests, batch request/response mapping, scenario deltas, CSV filtering, readable multipage PDF output, and the Swagger/OpenAPI contract. Docker runs these tests as part of its build.
