# Verification

## Automated checks

Rechecked locally on **2026-10-25**. Results describe the local checkout; hosted CI applies to the commits pushed to GitHub.

| Component | Result | Main coverage |
| --- | --- | --- |
| Model API | 30 pytest tests passed; Ruff passed | Single/batch inference, supplied samples, validation, coefficients, held-out evaluation, repeatable training |
| Estimator API | 12 pytest tests passed; Ruff passed | Persistence, pagination, comparison, forwarding, upstream failures, failed-request handling |
| Market API | 7 Java integration tests passed | Aggregates/filters, caching, model contract, CSV/PDF, Swagger/OpenAPI |
| Web | 15 Vitest tests passed; lint, TypeScript, production build passed | Feature contracts, API routing, error handling, export forwarding, timeouts |
| Docker stack | Four images built; all services healthy; smoke check passed | Real service integration, ten batch samples, single inference, three Swagger UIs |

The model tests used Python 3.12, estimator tests Python 3.13, Java tests JDK 21, and web checks Node 22. Docker supplies Python 3.12 for both Python services. Test adapters emit upstream deprecation warnings; assertions pass.

## Reproduce

Install dependencies using each service README, then run from that component's directory:

| Directory | Command |
| --- | --- |
| `services/housing-model-api` | `ruff check . && ruff format --check . && pytest -q` |
| `services/estimator-api` | `ruff check . && ruff format --check . && pytest -q` |
| `services/market-api` | `./mvnw verify` (JDK 21) |
| `apps/web` | `npm run lint && npm run typecheck && npm test && npm run build` |

From the repository root, start the stack and check real HTTP integrations:

```bash
docker compose up --build -d --wait --wait-timeout 180
docker compose exec -T housing-model-api \
  python - --web-url http://web:3000 < scripts/smoke-stack.py
```

The smoke check covers health, dataset/model identity, filters, CSV/PDF exports, real what-if predictions, validation, history, and all seven portal routes. It does not save estimates. The hosted Fly.io demo passed this check on 2026-10-25; the custom domain also returned HTTP 200 with verified TLS using its public DNS address.

## Manual checks and scope

Earlier browser checks (2026-10-24) covered desktop/mobile layouts, both themes, invalid form inputs, saving/comparing estimates, filtered exports, and what-if results. Failure checks covered model/service outages, route retry, and history persistence after estimator restart. These are recorded observations, not a formal accessibility audit or production load test.

These checks verify software behaviour and service integration. See [model service notes](model-evaluation.md) for the model lifecycle and demo scope.
