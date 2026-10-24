# Verification notes

Local verification on 2026-10-24. Docker supplies Python 3.12, Java 21, and Node 22. All four runtime images use non-root users; Compose gives them read-only root filesystems, temporary writable directories, and a dedicated SQLite storage volume.

## Automated checks

| Component | Result | Coverage |
| --- | --- | --- |
| Model API | 30 pytest tests passed | Feature contract, supplied examples, batch order, coefficient reconstruction, held-out metrics, repeatable training, invalid input and startup |
| Estimator API | 12 pytest tests passed | Model forwarding, persistence across app restarts, paginated history, comparison order, validation, timeout/connection/malformed-response handling, failed-request persistence |
| Market API | 4 Java integration tests passed during Docker build | Real CSV aggregates/filters, empty segments, cache reuse, model batch contract, scenario deltas, filtered CSV, readable multipage PDF |
| Web | 15 Vitest tests passed; TypeScript and production build passed | Input schemas, fractional bathrooms, years, filters, configurable URLs, route allowlist, error forwarding, export headers, timeouts |
| Containers | Build and readiness checks passed | Model, Python estimator, Java market, and production Next.js server |
| Real HTTP stack | `python3 scripts/smoke-stack.py` passed | Dataset/model identity, statistics, filters, actual scenario calls, CSV/PDF responses, validation, history, seven portal pages |

The Python TestClient currently emits an upstream HTTPX deprecation warning. Its assertions pass; the warning concerns the test adapter, rather than serving requests.

## Browser checks

- Checked desktop and 390px mobile layouts; opened the navigation drawer and followed an application link. Verified the mobile page did not overflow horizontally. Checked form labels, field errors, contrast, loading skeletons, and both light/dark palettes.
- Entered a zero floor area and verified the client field error before a model request.
- Created two real sample estimates through the browser. Their model outputs were `250879.73` and `303620.88` source price units. Verified successful-save feedback, persistent history, selection, and the comparison chart/table.
- Applied bedrooms = 3 and minimum price = 200000. The dashboard returned 21 properties with consistent summaries and charts.
- Downloaded CSV and PDF from the browser. Parsed the downloaded CSV to verify all 21 rows met the active filters. Rendered the generated PDF and checked headers, table alignment, legibility, and pagination.
- Selected reference Property 002 and changed bathrooms from 2 to 2.5. The Java service returned real model predictions of `285478.90` and `289197.37`, a difference of `3718.47`. The observed dataset price (`265000`) is labelled separately.

## Failure and persistence checks

- Stopped the model container: estimator and Java what-if requests returned 503 with useful messages. Dataset-only market analysis remained available. The browser displayed a request error. Restored model serving afterward.
- Restarted the estimator container and compared the complete history response before/after: both saved records and their values remained unchanged.
- Stopped the Java market service and loaded its portal page: the shared layout stayed usable and the route displayed a clear service-error fallback. Restored the service, clicked its retry control, and verified the complete market dashboard reloaded successfully.

## Scope and remaining delivery steps

GitHub Actions workflows are supplied, but their hosted runs are pending GitHub publication. The application is deployed locally with Compose; external hosting has not been selected. The project is a shared local workspace without accounts or per-user authorization. Tests establish implementation behaviour on the supplied sample, rather than independent valuation accuracy, measured production throughput, or a formal accessibility certification.

Personal interview preparation, recordings, transcripts, virtual environments, database files, model binaries, and environment secrets are excluded from commits. Sample estimates created during browser verification are real model results retained only in the local database volume.
