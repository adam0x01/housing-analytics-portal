# Housing Analytics Web Portal

Next.js 16 App Router, TypeScript, React, Tailwind CSS 4, and shadcn/ui components using Radix primitives. One shared navigation/layout connects both application backends. The portal supports light/dark/system appearance, responsive navigation, accessible labels/focus handling, loading skeletons, validation, empty states, and retryable errors.

## Run

Full stack, from the repository root:

```bash
docker compose up --build -d --wait
```

Open [localhost:3000](http://localhost:3000). For native development, start the three backend containers, then from this directory:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Node 22 is used in Docker and CI. Dependencies are locked in `package-lock.json`.

## Routes

| Route | User workflow |
| --- | --- |
| `/` | Dataset overview, entry points, charts, and recent estimates |
| `/estimator` | Validated seven-feature form, saved prediction, table and context chart |
| `/estimator/history` | Paginated persistent history, detail drawer, comparison selection |
| `/estimator/compare` | Compare 2–4 saved properties, features, warnings, and price chart |
| `/market` | Segment filters, price/area charts, bedroom aggregates, sortable/searchable/paginated table, CSV/PDF downloads |
| `/market/what-if` | Select a reference property, change features, and compare model predictions |
| `/model` | Model coefficients, observed ranges, validation scores, provenance, and limitations |

Comparison links can retain explicit selected UUIDs in `?ids=uuid,uuid`; the what-if view accepts `?property=2`. Saved estimates persist in the Python backend, while transient comparison selection is kept in React context. The recent-estimate picker offers the newest 100 estimates; history pagination can select older records for comparison.

## API configuration and data flow

| Variable | Default for native development | Purpose |
| --- | --- | --- |
| `ESTIMATOR_API_URL` | `http://127.0.0.1:8001` | Python application API, read at runtime on the server |
| `MARKET_API_URL` | `http://127.0.0.1:8002` | Java application API, read at runtime on the server |
| `API_TIMEOUT_MS` | `15000` | Timeout for API requests |
| `MODEL_DOCS_URL` | `http://localhost:8000/docs` | Browser-accessible model Swagger link |

Compose supplies internal service-name addresses. For native development, use loopback addresses. Change these variables and restart the web process/container; no frontend rebuild is needed for server URL changes. No `NEXT_PUBLIC_*` service URLs are baked into browser JavaScript.

Server components load initial data directly from the configured application APIs. Client forms, charts, sorting, filters, downloads, and comparison controls use client components. Browser requests use same-origin `/api/estimator/...` and `/api/market/...` route handlers with an explicit path allowlist. Those handlers forward only required headers, enforce a payload-size limit, preserve download headers, and return clear connection/timeout errors. The browser never calls internal container addresses. The Python and Java backends both own their required model integrations.

Route `loading.tsx` files provide skeletons during navigation/data loading. Actions have their own pending skeletons/spinners, disabled submit controls, and live status/error announcements. `useApiAction` cancels obsolete requests so a late filter/comparison response cannot overwrite a newer action. The root error boundary's retry action refetches the affected route. Reduced-motion preferences are respected.

React Hook Form and Zod implement client validation, independently of server validation. Recharts renders actual API data with explanatory chart labels and semantic tables alongside key results. Prices use source units, with no invented currency. An observed source price, a model reference prediction, and a scenario prediction are labelled separately. A model R² is never presented as a confidence percentage.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

Contract tests cover invalid features, fractional bathrooms, filter/query handling, configurable URLs, route allowlisting, validation errors, export forwarding, and timeouts. The repository's [stack smoke check](../../scripts/smoke-stack.py) exercises real HTTP integrations. Browser verification should cover both themes and desktop/mobile layouts as well as form, history, comparison, filter, export, scenario, and error recovery flows.

Primary references: [Next.js server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [loading UI](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [shadcn/ui](https://ui.shadcn.com/docs), [Tailwind CSS](https://tailwindcss.com/docs).
