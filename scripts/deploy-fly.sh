#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
: "${FLY_APP_PREFIX:?Set FLY_APP_PREFIX to the prefix of your four existing Fly apps.}"
if [[ ! "$FLY_APP_PREFIX" =~ ^[a-z][a-z0-9-]{0,39}$ ]] || [[ "$FLY_APP_PREFIX" == *- ]]; then
  echo "FLY_APP_PREFIX must contain 1-40 lowercase letters, digits or hyphens, starting with a letter and ending with a letter or digit." >&2
  exit 1
fi

# App-scoped tokens in CI; fall back to the local flyctl login outside CI.
deploy() {
  local service="$1" token_variable="$2"
  shift 2
  local token="${!token_variable:-${FLY_API_TOKEN:-}}"
  FLY_API_TOKEN="$token" flyctl deploy . \
    --app "${FLY_APP_PREFIX}-${service}" \
    --config "deploy/fly/${service}.toml" \
    --remote-only --ha=false --wait-timeout 180s --yes "$@"
}

# Flycast routes through Fly Proxy so sleeping private services can wake up.
deploy model FLY_MODEL_TOKEN --flycast --no-public-ips
deploy estimator FLY_ESTIMATOR_TOKEN --flycast --no-public-ips \
  --env "MODEL_API_URL=http://${FLY_APP_PREFIX}-model.flycast"
deploy market FLY_MARKET_TOKEN --flycast --no-public-ips \
  --env "MODEL_API_URL=http://${FLY_APP_PREFIX}-model.flycast"
deploy web FLY_WEB_TOKEN \
  --env "ESTIMATOR_API_URL=http://${FLY_APP_PREFIX}-estimator.flycast" \
  --env "MARKET_API_URL=http://${FLY_APP_PREFIX}-market.flycast" \
  --env "APP_VERSION=${GITHUB_SHA:-$(git rev-parse --short HEAD)}"

web_url="https://${FLY_APP_PREFIX}-web.fly.dev"
# Warm up the dependency chain before the existing read-only smoke check.
for endpoint in /api/health /api/estimator/model-info /api/market/health; do
  curl --fail --silent --show-error --output /dev/null \
    --retry 3 --retry-delay 5 --retry-all-errors --max-time 150 "${web_url}${endpoint}"
done
python3 scripts/smoke-stack.py --web-url "$web_url"
printf 'Deployment verified: %s\n' "$web_url"
