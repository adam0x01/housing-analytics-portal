# Web portal

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, and Recharts. See the [root README](../../README.md) for the Docker setup.

## Native development

Use Node 22. From the repository root, start the APIs and free port 3000:

```bash
docker compose stop web
docker compose up --build -d --wait housing-model-api estimator-api market-api
```

Then enter the web application:

```bash
cd apps/web
npm ci
cp -n .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). `.env.example` documents server-side API URLs, timeouts, and deployment labels; restart the dev server after changing them.

Stop the dev server with Ctrl+C. To rebuild and run a production server from this directory, use `npm run build` followed by `npm start`.

## Routes and data flow

| Route | Workflow |
| --- | --- |
| `/` | Dataset overview and recent estimates |
| `/estimator` | Seven-feature form, prediction table/chart, save to history |
| `/estimator/history` | Paginated history, details, comparison selection |
| `/estimator/compare` | Compare 2–4 saved estimates; supports `?ids=uuid,uuid` |
| `/market` | Segment filters, charts, sortable/searchable table, CSV/PDF exports |
| `/market/what-if` | Reference/scenario predictions; supports `?property=2` |
| `/model` | Coefficients, validation metrics, ranges, and provenance |

Server Components fetch initial data; Client Components handle forms, charts, and interactions through same-origin API routes. `useApiAction` handles pending/errors and cancels obsolete requests. Saved history lives in the Python API; comparison selection lives in React context. Loading skeletons, route error recovery, and shared navigation cover both applications.

Prices use source units. What-if predictions and observed prices are labelled separately. Exports use server-side segment filters, independently of browser table search/sort. See [architecture](../../docs/architecture-overview.md) for service boundaries.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
