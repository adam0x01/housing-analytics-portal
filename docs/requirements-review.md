# Assignment and initial structure review

Reviewed on 2026-10-23 against the supplied three-page **Interview Tasks Fullstack.pdf**, both CSVs, and Adam's proposed repository structure. The email explains the review/submission process. The PDF defines assignment requirements; the repository structure and engineering decisions below are our implementation plan.

## Is the proposed structure suitable?

Yes. One `apps/web` portal and three independently runnable services match the assignment. `housing-model-api` clearly identifies Task 1. Keeping `estimator-api` separate from the model service preserves the Task 2 requirement for an application backend that calls the regression model container. `market-api` must likewise call the same model rather than implement a second regression model in Java.

The structure is a monorepo, not a single deployable. Add tests and dependency files inside each service, root orchestration, CI, and an explicit API contract. There is no need for a monorepo build framework, a message broker, Kubernetes, or a shared database at this stage.

The supplied initial text contains the folder tree and a heading for the Housing Model API. It is a suitable starting outline, but still needs API shapes, evaluation methodology, validation, run instructions, and acceptance criteria.

## Requirements checklist

This is the full assignment scope. Only Task 1 is the first implementation milestone.

| Area | Requirement | Delivery location / plan |
| --- | --- | --- |
| Model API | Single and batch housing price prediction | `POST /predict` in `services/housing-model-api` |
| Model API | Coefficients and performance metrics | `GET /model-info`, including evaluation method |
| Model API | Health endpoint | `GET /health` with model readiness |
| Model API | Python 3.12+, FastAPI, scikit-learn | Required technologies, service-local dependencies |
| Model API | Build, containerise, deploy; Dockerfile and live Swagger/OpenAPI demonstration | Root Compose; model service Dockerfile; local live demo first, hosting target undecided |
| Portal | Unified navigation and consistent shared layout/design | `apps/web`, Next.js App Router |
| Portal | Layout loading/error handling and transitions | Next.js loading and error boundaries |
| Estimator | All seven inputs, client validation, table and chart of results | Estimator portal route |
| Estimator | History and side-by-side comparison | Application state, explicit persistence decision before implementation |
| Estimator backend | Form submission, validation, error handling, model container calls | Separate Python 3.12+ / FastAPI `estimator-api` |
| Market | Interactive dashboard, segment filters, what-if model calls | Market portal route |
| Market | CSV/PDF exports; responsive sortable/filterable tables | Market application |
| Market backend | REST API, housing data aggregates, model calls, caching | Java 21 and **Spring Boot 3.4.4**, exactly as specified |
| Next.js | Server and client components used appropriately | Server components for initial data, client components for interaction |
| Next.js | Shared custom hooks and appropriate data fetching | Shared client functionality, explicit caching/refresh policy |
| UI | Tailwind, responsive design, accessible components following WCAG | Portal implementation and manual accessibility review |
| State | Form validation, client state, API error/loading states | Each application, with shared utilities where useful |
| Delivery | Source on GitHub and live interview demonstration | Local Git initialized first; publish when requested |

## Dataset findings

| Input | Finding | Consequence |
| --- | --- | --- |
| Training data | 50 rows; `id`, seven numeric features, and `price` | A small demonstration dataset; use a simple interpretable baseline |
| Prediction samples | 10 rows containing only the seven features | Use for prediction/demo, not accuracy measurement |
| Encoding | UTF-8 byte-order mark in both CSV headers | Read with `utf-8-sig` |
| Missing/duplicate data | Checked by the training validation code | Reject bad inputs rather than silently changing training data |
| `id` | Identifier in the labelled file only | Exclude from model inputs and prediction requests |
| `price` | Label available in the training file only | Never include in input features |
| Bathrooms | Includes `1.5` and `2.5` | Accept fractional bathrooms |
| Feature relationships | Most size, age, and rating values move together | Coefficients may be unstable; do not claim causation |
| Currency and measurement definitions | Currency, lot-size units, distance units, and rating scale are unspecified | Return prices in source units; do not invent USD/HKD, km, or a rating maximum |
| Time/geography | No sale date or location fields | Cannot make genuine time trends, neighbourhood comparisons, or a credible real-market generalisation claim |

Features, in model order: `square_footage`, `bedrooms`, `bathrooms`, `year_built`, `lot_size`, `distance_to_city_center`, `school_rating`.

## First milestone acceptance criteria

- Training is a separate, reproducible command using only the labelled CSV.
- Validation uses five shuffled folds with a fixed seed and reports out-of-fold MAE, RMSE, and R², alongside a mean-price baseline.
- A final model is fitted on all 50 labelled rows after evaluation.
- Single and batch requests use the same validation and model, preserving batch order.
- `/model-info` describes feature order, coefficients/intercept, dataset fingerprint, versions, training ranges, metrics, and limitations.
- `/health`, `/docs`, and `/openapi.json` work for a live demonstration.
- Missing or invalid features return HTTP 422; missing artifacts prevent the service from starting.
- Docker packaging, automated API/model tests, and runnable documentation accompany the implementation.

## Decisions still to confirm

1. Interview/submission deadline and whether a hosted URL is expected, or a live local container demonstration is sufficient. The PDF requests deployment and a live demo but gives no hosting provider.
2. Currency, distance/lot-size units, and school-rating scale. The implementation retains source values until these are supplied.
3. Whether estimate history must persist across devices/users. A database or authentication is not specified.
4. Scope of market analysis: the supplied data supports a cross-sectional segment dashboard, not historical price trends.

These do not block Task 1. They should be resolved before choosing hosting, history persistence, or market chart labels.
