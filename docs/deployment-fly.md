# Deploy to Fly.io

The four configurations in `deploy/fly/` reuse the existing Dockerfiles and
build from the repository root. Dockerfile paths inside the TOML files are
relative to `deploy/fly/`, while the build context remains the repository root.
Only `<prefix>-web` has public IP addresses.
Model, estimator and market use Flycast on the organization's private network;
unlike direct `.internal` connections, Flycast can wake sleeping Machines.

Defaults are Singapore (`sin`), one shared-CPU Machine per service, and idle
autostop. Model and web have 512MB RAM, estimator 256MB, and Java market 1GB.
Cold starts can take time, so upstream timeouts allow for the dependency chain.
To keep the stack warm, set `auto_stop_machines = "off"` and
`min_machines_running = 1` in all four configurations. All configurations must
use the same region; change `primary_region` before creating storage elsewhere.

## Account and repository setup

1. Sign in to Fly.io and enable billing on the target organization. Sign in to
   GitHub locally if Codex should configure the repository settings for you:

   ```bash
   flyctl auth login
   gh auth login
   ```

2. Connect this checkout to the intended GitHub repository. Set the deployment
   branch in **both** `on.push.branches` and the `deploy` job guard in
   `.github/workflows/deploy-fly.yml`. Both are configured for `release`.
   Merge a reviewed pull request into `release` to trigger deployment. Because
   this uses a branch push event, a direct push to `release` also triggers it.
   Require pull requests in the repository's branch rules if merges must be the
   only way to update `release`.

3. Choose a globally unique app prefix and an existing organization slug.
   Substitute your values below; these are examples:

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

   Use new apps for the private services. The deployment script prevents public
   IP allocation and requests Flycast addresses, but does not remove public IPs
   from pre-existing apps. Check `flyctl ips list --app <name>` for each backend;
   release any public addresses before serving real traffic.

4. Configure the repository variable and four app-scoped deployment secrets.
   These commands pipe tokens directly into GitHub; do not paste tokens into
   chat or commit them. Tokens below expire after 90 days and must be rotated.

   ```bash
   gh variable set FLY_APP_PREFIX --body "$FLY_APP_PREFIX" --repo "$GITHUB_REPOSITORY"
   ```

   Run the following in Bash, with the variables above exported:

   ```bash
   set -euo pipefail
   for service in model estimator market web; do
     secret_name="FLY_$(printf '%s' "$service" | tr '[:lower:]' '[:upper:]')_TOKEN"
     flyctl tokens create deploy --app "${FLY_APP_PREFIX}-${service}" --expiry 2160h \
       | gh secret set "$secret_name" --repo "$GITHUB_REPOSITORY"
   done
   ```

## First deployment and continuous deployment

After the application checks pass, deploy once with the local Fly login:

```bash
bash scripts/deploy-fly.sh
```

The script deploys model, estimator, market and web in order, then checks the
public BFF and runs the existing read-only integration smoke test. The URL is
`https://<prefix>-web.fly.dev`. The model documentation link is hidden in cloud
deployments because Swagger remains on the private backend.

Commit and push the deployment files and application changes to a development
branch, then merge a pull request into `release`. Relevant release updates run
both existing verification workflows,
including the Docker Compose full-stack smoke check, before deploying.
The stack check uses `deploy/fly/compose.test.yml` to start the Fly estimator
image with its default command and a fresh root-owned volume, so it also covers
the volume permission initialization and privilege drop.
Changes limited to model code still run the whole stack verification. Manual
workflow dispatch is also allowed, but deployment is restricted to the configured
branch. Production deploys are serialized so they do not overlap. All four apps
are redeployed initially; this keeps the first setup simple.

## SQLite and operations

The estimator mounts `estimator_data` at `/app/storage`. Its Fly-specific image
prepares permissions and drops to UID/GID 10001 before starting Uvicorn. The
default Compose image still runs directly as that non-root user.

Keep estimator at **one Machine** while using a single SQLite volume. The script
passes `--ha=false` to avoid automatically creating spare Machines on the first
deploy; it does not reduce existing instance counts. A single Machine can have
brief deployment downtime. Multiple Machines require database replication or a
shared database such as PostgreSQL. Volume snapshots are retained for seven days;
important history also needs an independent backup. Do not destroy the volume
to reset or redeploy the application.

Idle autostop saves running CPU/RAM charges; volumes, snapshots, stopped-machine
root filesystems, network usage and builds can still incur charges. This is a
small demonstration configuration, not a highly available deployment. The portal
currently has shared history and no user authentication.

```bash
flyctl status --app "${FLY_APP_PREFIX}-web"
flyctl logs --app "${FLY_APP_PREFIX}-estimator"
flyctl checks list --app "${FLY_APP_PREFIX}-market"
```

A deployment is not atomic across apps. If a later service or the final smoke
check fails, already deployed services remain updated. Inspect the failed app,
fix it and rerun, or deploy a known-good commit. A future API change should keep
old and new service versions compatible during the rollout.

References: [GitHub Actions](https://fly.io/docs/launch/continuous-deployment-with-github-actions/),
[monorepos](https://fly.io/docs/launch/monorepo/),
[private app autostart](https://fly.io/docs/blueprints/autostart-internal-apps/),
[persistent volumes](https://fly.io/docs/volumes/overview/).
