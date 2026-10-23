# Housing Analytics Portal

Interview assignment: a housing price model API and a shared Next.js portal with a Python estimator application and a Java market analysis application.

## Implementation status

The housing model API is implemented: training/evaluation, single/batch inference, model metadata, health, Swagger, Docker packaging, and automated tests. The portal and its two application backends are planned next. See the [requirements review](docs/requirements-review.md) for the full assignment checklist and [architecture](docs/architecture-overview.md) for service boundaries.

## Run the first milestone

With Docker running, execute from this repository root:

```bash
docker compose up --build -d --wait
```

Open [Swagger UI](http://localhost:8000/docs). See the [model API README](services/housing-model-api/README.md) for native Python setup, examples, validation rules, and tests. The [evaluation report](docs/model-evaluation.md) explains the baseline and limitations.

## Repository structure

```text
apps/
  web/                         Next.js portal (planned)
services/
  housing-model-api/            FastAPI and scikit-learn model (first milestone)
  estimator-api/                Python application backend (planned)
  market-api/                   Java application backend (planned)
data/
  house-prices.csv              Original labelled data, renamed without editing
  prediction-samples.csv        Original unlabelled examples, renamed without editing
docs/                          Requirements, design, and interview notes
```

Each deployable owns its dependency files, tests, and Dockerfile. Root Docker builds use the repository as their build context so services can access the versioned dataset.

## Development approach

1. Review requirements and data, then define the model API contract.
2. Build, evaluate, test, and containerise the housing model API.
3. Implement the Python estimator backend and its portal journey.
4. Implement the Java market backend and market dashboard, including model integration.
5. Test the complete portal, exports, accessibility, failures, and interview demo.

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example `feat(model-api): support batch predictions`, `test(model-api): reject missing features`, and `docs: explain service boundaries`.

## Verified first milestone

Verified locally on 2026-10-23: 30 automated tests passed on Python 3.12, Ruff lint/format checks passed, the Docker image built, and Compose reported a healthy container running as a non-root user. Live HTTP checks covered health, model metadata, single prediction, all ten batch samples, invalid inputs, Swagger HTML, and OpenAPI. The first sample returned `250879.73` source price units. Both repository CSVs match their supplied originals byte-for-byte.

The GitHub Actions workflow is included but has not run on GitHub yet. The service is running locally; a hosted deployment and Task 2 are still pending.

The assignment PDF, email, and voice recording are reference material. The recording and its transcript are kept outside the repository. The two supplied CSV files are the implementation inputs. A public GitHub repository and a hosted deployment have not been created as part of initialization.
