# Housing Analytics Web Portal

Next.js 16 App Router application serving the UI and Backend for Frontend (BFF). It uses TypeScript, React, Tailwind CSS 4, and shadcn/ui components built on Radix primitives. One shared navigation/layout connects the estimator and market workflows. The portal supports light/dark/system appearance, responsive navigation, accessible labels/focus handling, loading skeletons, validation, empty states, and retryable errors.

## Run with Docker (without Compose)

Start Docker Desktop. Run all Docker commands below from the **repository root**, the directory containing `apps/`, `services/`, and `data/`. The final `.` in `docker build` is the repository root, matching the paths copied by the Dockerfile.

First build/start the [model](../../services/housing-model-api/README.md#run-with-docker-without-compose), [estimator](../../services/estimator-api/README.md#run-with-docker-without-compose), and [market](../../services/market-api/README.md#run-with-docker-without-compose) containers using their README commands, and wait for each to become healthy. The web app's `docker run` command starts only the web container; it does not start those APIs.

Before starting, make sure host port 3000 is free. If an earlier container, including a Compose-managed one, uses it, find its name with `docker ps` and stop it with `docker stop CONTAINER_NAME`, using its actual name.

### Build and start

```bash
docker network inspect housing-analytics-net >/dev/null 2>&1 || docker network create housing-analytics-net
docker build -f apps/web/Dockerfile -t housing-web:local .
```

The image supplies Node 22, installs the locked dependencies, and builds the production Next.js server. No host Node installation is required.

Start a new container:

```bash
docker run -d \
  --name housing-web \
  --network housing-analytics-net \
  --init \
  --read-only \
  --tmpfs /tmp \
  -p 127.0.0.1:3000:3000 \
  -e ESTIMATOR_API_URL=http://housing-estimator-api:8001 \
  -e MARKET_API_URL=http://housing-market-api:8002 \
  -e API_TIMEOUT_MS=15000 \
  -e MODEL_DOCS_URL=http://127.0.0.1:8000/docs \
  -e APP_ENVIRONMENT=Testing \
  -e APP_VERSION=0.0.1 \
  housing-web:local
```

The API URLs use container names on the shared network. `MODEL_DOCS_URL` uses the host address because the user's browser opens that Swagger link. These are runtime settings passed explicitly with `-e`; `docker run` does not automatically load the repository's `.env` file.

`-d` returns before readiness. Check until the web container reports `healthy`, then check its endpoint:

```bash
docker inspect --format '{{.State.Health.Status}}' housing-web
curl --fail http://127.0.0.1:3000/api/health
```

Open the [portal](http://127.0.0.1:3000/). The web health check verifies the Next.js server; the API containers must also be running for estimates and market pages to work.

### Stop, start again, and view logs

Run the command you need:

```bash
# Stop the web server, keeping its container and the APIs running.
docker stop housing-web

# Start the existing web container again.
docker start housing-web

# Follow logs; Ctrl+C exits the viewer without stopping the server.
docker logs -f housing-web
```

### Apply code or environment changes

For code changes, rebuild the image and remove the old container:

```bash
docker build -f apps/web/Dockerfile -t housing-web:local .
docker stop housing-web
docker rm housing-web
```

Repeat the `docker run` command above. For environment-only changes, skip the build, stop/remove the container, and repeat `docker run` with the updated `-e` values. `docker start` and `docker restart` keep the old image and environment. Removing the web container does not remove saved estimates, which belong to the estimator's persistent volume.

If `housing-web` already exists, start it with `docker start` or remove it before reusing the name with `docker run`.

## Run locally

For native development, keep the three standalone API containers running and stop the standalone web container with `docker stop housing-web` to free port 3000. Then run from `apps/web/`:

```bash
npm ci
cp -n .env.example .env.local
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
| `APP_ENVIRONMENT` | `Testing` | Public deployment label in the sidebar footer |
| `APP_VERSION` | `0.0.1` | Public release label, displayed with a `v` prefix |

The standalone `docker run` command supplies internal container-name addresses on the shared network. For native development, use loopback addresses. After changing environment values, restart a native web process or stop/remove/recreate the standalone container with updated `-e` arguments as described above. No frontend rebuild is needed for server URL changes, and no `NEXT_PUBLIC_*` service URLs are baked into browser JavaScript.

The sidebar footer shows the deployment environment and release, independently of Next.js's production build mode. Its debug icon opens browser diagnostics on desktop and mobile: the actual user agent, viewport, language, time zone, and page path. Details are read when opened and can be copied for a bug report; no diagnostics request is sent to a backend.

Server components load initial data directly from the configured application APIs. Client forms, charts, sorting, filters, downloads, and comparison controls use client components. Browser requests use same-origin `/api/estimator/...` and `/api/market/...` route handlers with an explicit path allowlist. Those handlers forward only required headers, enforce a payload-size limit, preserve download headers, and return clear connection/timeout errors. Portal requests use the BFF; the Python and Java backends each call the shared model service themselves.

The BFF centralises browser-facing API calls. The Docker commands above and in the service READMEs also publish backend ports on loopback for direct local use, so API access is not exclusive to the BFF. Authentication and per-user authorization are not implemented.

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
