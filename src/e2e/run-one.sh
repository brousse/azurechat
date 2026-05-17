#!/usr/bin/env bash
# Run exactly one Playwright spec with strict resource hygiene:
#   - kill any leftover Next/Turbopack/postcss workers before starting
#   - run the spec serially (workers=1)
#   - kill the dev-server process group after the spec exits, win or lose
#
# Usage: ./e2e/run-one.sh <path/to/spec.ts> [-- <extra playwright args>]
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path/to/spec.ts>" >&2
  exit 1
fi
SPEC="$1"
shift

cd "$(dirname "$0")/.."

cleanup() {
  # 1. Kill the dev-server process group via the pidfile.
  if [[ -f e2e/.dev-server.pid ]]; then
    PGID="$(cat e2e/.dev-server.pid 2>/dev/null || echo "")"
    if [[ -n "$PGID" ]]; then
      kill -TERM -- "-$PGID" 2>/dev/null || true
      sleep 1
      kill -KILL -- "-$PGID" 2>/dev/null || true
    fi
    rm -f e2e/.dev-server.pid
  fi
  # 2. Release the single-instance lock from start-dev-server.sh.
  rm -f e2e/.dev-server.lock
  # 3. Belt-and-braces by pattern.
  pkill -9 -f "build/dev/build/postcss.js" 2>/dev/null || true
  pkill -9 -f "next-server \(v" 2>/dev/null || true
  pkill -9 -f "next dev" 2>/dev/null || true
  pkill -9 -f "@playwright/test" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

cleanup  # start from a clean slate

echo "==> Running ${SPEC}"
npx playwright test --project=chromium --reporter=line --workers=1 "${SPEC}" "$@"
