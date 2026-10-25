# Verification record

The automated baseline below was recorded locally on 2026-10-24, with subsequent UI checks summarised separately. Docker supplies Python 3.12, Java 21, and Node 22. All four runtime images use non-root users; Compose gives them read-only root filesystems, temporary writable directories, and a dedicated SQLite storage volume. Follow the [project verification instructions](../README.md#verification) to reproduce the checks against a running checkout.

## Automated checks

| Component | Result | Coverage |
| --- | --- | --- |
| Model API | 30 pytest tests passed | Feature contract, supplied examples, batch order, coefficient reconstruction, held-out metrics, repeatable training, invalid input and startup |
| Estimator API | 12 pytest tests passed | Model forwarding, persistence across app restarts, paginated history, comparison order, validation, timeout/connection/malformed-response handling, failed-request persistence |
| Market API | 4 Java integration tests passed during Docker build | Real CSV aggregates/filters, empty segments, cache reuse, model batch contract, scenario deltas, filtered CSV, readable multipage PDF |
| Web | 15 Vitest tests passed; TypeScript and production build passed | Input schemas, fractional bathrooms, years, filters, configurable URLs, route allowlist, error forwarding, export headers, timeouts |
| Containers | Build and readiness checks passed | Model, Python estimator, Java market, and production Next.js server |
| Real HTTP stack | `python3 scripts/smoke-stack.py` passed | Dataset/model identity, statistics, filters, actual scenario calls, CSV/PDF responses, validation, history, seven portal pages |

The recorded Python TestClient run emitted an upstream HTTPX deprecation warning. Its assertions passed; the warning concerned the test adapter.

## Browser checks

- Checked desktop and 390px mobile layouts; opened the navigation drawer and followed an application link. Verified the mobile page did not overflow horizontally. Checked form labels, field errors, contrast, loading skeletons, and both light/dark palettes.
- Entered a zero floor area and verified the client field error before a model request.
- Created two real sample estimates through the browser. Their model outputs were `250879.73` and `303620.88` source price units. Verified successful-save feedback, persistent history, selection, and the comparison chart/table.
- Applied bedrooms = 3 and minimum price = 200000. The dashboard returned 21 properties with consistent summaries and charts.
- Downloaded CSV and PDF from the browser. Parsed the downloaded CSV to verify all 21 rows met the active filters. Rendered the generated PDF and checked headers, table alignment, legibility, and pagination.
- Selected reference Property 002 and changed bathrooms from 2 to 2.5. The Java service returned real model predictions of `285478.90` and `289197.37`, a difference of `3718.47`. The observed dataset price (`265000`) is labelled separately.
- Checked the overview and sidebar at 1280px and the navigation drawer at 390px in both themes, with no horizontal overflow. TypeScript, the production Docker build, and the stack smoke check passed after the layout changes.
- Verified the deployment environment/version footer and browser diagnostics on desktop and mobile: actual user agent, page path, locale/time zone, viewport updates when reopened, copy-success feedback, and closing the nested popover/drawer. Chart containers clip hidden tooltip overflow when resizing. TypeScript, all 15 web tests, and the production Docker build passed after the addition.

## Failure and persistence checks

- Stopped the model container: estimator and Java what-if requests returned 503 with useful messages. Dataset-only market analysis remained available. The browser displayed a request error. Restored model serving afterward.
- Restarted the estimator container and compared the complete history response before/after: both saved records and their values remained unchanged.
- Stopped the Java market service and loaded its portal page: the shared layout stayed usable and the route displayed a clear service-error fallback. Restored the service, clicked its retry control, and verified the complete market dashboard reloaded successfully.

## Verification scope

The [GitHub Actions workflows](../.github/workflows/) run component checks, image builds, and full-stack integration checks. The results recorded here are local observations, not a statement about a particular hosted CI run.

These checks cover functionality, error recovery, and persistence on the supplied sample. They do not establish independent valuation accuracy, measured production throughput, or formal accessibility certification. The workspace has shared history and no accounts or per-user authorization.

Sample estimates created during browser verification are real model results retained only in the local database volume. A fresh installation starts with empty history.
