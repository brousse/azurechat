#!/usr/bin/env bash
# Boot a production `next start` for e2e instead of a dev server.
# Dev mode (Turbopack OR webpack) is unstable on this app: Turbopack
# leaks unbounded memory via PostCSS workers per HTTP request, and
# webpack can't bundle the @azure/monitor-opentelemetry tree cleanly.
# Production builds work for both bundlers and have rock-solid memory
# behavior (no compile-on-demand, no worker pool).
#
# Builds if `build/BUILD_ID` is missing (first run, or after a clean).
# Subsequent runs reuse the existing build for fast iteration. Force a
# rebuild with: `rm -rf build && npm run test:e2e`, or just `npm run build`.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f "build/BUILD_ID" ]; then
  echo "[start-prod-server] no build/BUILD_ID — running production build..."
  npm run build
else
  echo "[start-prod-server] reusing existing build/BUILD_ID"
fi

PORT="${E2E_PORT:-3000}"
exec npx next start -p "$PORT"
