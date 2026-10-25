# Fly.io deployment

Four apps reuse the repository Dockerfiles. Only `<prefix>-web` is public; model, estimator, and market use private Flycast addresses so sleeping services can wake on request.

Defaults: Singapore (`sin`), one shared-CPU Machine per service, idle autostop. Model/web use 512 MB RAM, estimator 256 MB, and market 1 GB. Keep all four apps in the same region. To avoid cold starts during a demo, set `auto_stop_machines = "off"` and `min_machines_running = 1` in all four TOML files before deploying.

## Initial setup

Requires Fly.io billing, `flyctl`, GitHub CLI, and existing Fly/GitHub login sessions. From the repository root, choose a unique prefix and organization:

```bash
export FLY_APP_PREFIX=housing-analytics-adam
export FLY_ORG=personal
export GITHUB_REPOSITORY=adam0x01/housing-analytics-portal

for service in model estimator market web; do
  flyctl apps create "${FLY_APP_PREFIX}-${service}" --org "$FLY_ORG"
done
flyctl volumes create estimator_data --app "${FLY_APP_PREFIX}-estimator" \
  --region sin --size 1 --snapshot-retention 7 --yes
```

Configure GitHub's app prefix and four app-scoped deployment secrets. Run in Bash; tokens are piped directly to GitHub and expire after 90 days:

```bash
set -euo pipefail
gh variable set FLY_APP_PREFIX --body "$FLY_APP_PREFIX" --repo "$GITHUB_REPOSITORY"
for service in model estimator market web; do
  secret_name="FLY_$(printf '%s' "$service" | tr '[:lower:]' '[:upper:]')_TOKEN"
  flyctl tokens create deploy --app "${FLY_APP_PREFIX}-${service}" --expiry 2160h \
    | gh secret set "$secret_name" --repo "$GITHUB_REPOSITORY"
done
```

Use new apps for private backends. The script prevents public IP allocation but does not remove existing public IPs; inspect `flyctl ips list --app <name>` when reusing apps.

## Deploy

With the prefix exported and local checks passing:

```bash
bash scripts/deploy-fly.sh
```

The script deploys model, estimator, market, then web; warms the APIs; and runs the read-only stack smoke test. The default address is `https://<prefix>-web.fly.dev`. Model Swagger remains private in the hosted deployment; use local Swagger for the interview.

GitHub Actions deploys pushes to **`release`** after model, application, and full-stack checks pass. Manual dispatch also requires that branch. If changing branches, update both `on.push.branches` and the deploy job guard in `.github/workflows/deploy-fly.yml`. Production deployments are serialized. The sidebar version comes from `apps/web/package.json`.

## Operations and limits

- Keep the estimator at **one Machine** for its single SQLite volume. Its Fly entrypoint prepares volume permissions before dropping to UID/GID 10001. `--ha=false` prevents an extra Machine on first deployment; it does not scale down existing apps.
- The CI stack check uses `deploy/fly/compose.test.yml` to test that entrypoint with a fresh root-owned volume.
- Volume snapshots are retained for seven days. Preserve the volume when redeploying; important history needs an independent backup.
- Idle autostop reduces running compute usage but storage and other charges can remain. This is a shared demo without accounts or high availability.
- Deployments are sequential, not atomic. If a later step fails, inspect the failed app and rerun or deploy a known-good commit; already updated apps remain updated.

```bash
flyctl status --app "${FLY_APP_PREFIX}-web"
flyctl logs --app "${FLY_APP_PREFIX}-estimator"
flyctl checks list --app "${FLY_APP_PREFIX}-market"
```
