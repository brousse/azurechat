#!/usr/bin/env bash
# Boots `next dev` in its own *process session* so the whole tree
# (Turbopack workers, PostCSS workers, etc.) can be killed wholesale.
#
# macOS's `setsid` does NOT support `-w` and does not run in foreground;
# it daemonizes. To get a foreground new-session process we use a tiny
# Node spawn with detached:true, then proxy its stdout/stderr and signals.
#
# The new session-leader PID is written to e2e/.dev-server.pid. Teardown
# kills via `kill -- -PID` (process-group / session kill).
set -euo pipefail

cd "$(dirname "$0")/.."

PIDFILE="e2e/.dev-server.pid"

# Note: previous single-instance lock used `flock`, which isn't installed
# on macOS by default — it caused this script to falsely report "already
# running" on every invocation. Instead we rely on the prior-run reap
# below + the explicit cleanup in run-one.sh / global-teardown.

# Reap any leftover dev server from a previous run.
if [[ -f "$PIDFILE" ]]; then
  OLD_LEADER="$(cat "$PIDFILE" 2>/dev/null || echo "")"
  if [[ -n "$OLD_LEADER" ]]; then
    kill -- "-$OLD_LEADER" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
fi
# Kill any lingering Turbopack/PostCSS workers from prior crashed runs.
pkill -9 -f "build/dev/build/postcss.js" 2>/dev/null || true
pkill -9 -f "next-server (v" 2>/dev/null || true

# Heap cap kept generous — Turbopack's first compile needs headroom or it
# OOMs and npm restarts it, which is what was piling up workers.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"

# Spawn `npm run dev` as the leader of a new process group via Node.
node -e '
  const { spawn } = require("node:child_process");
  // Use webpack dev (npm run dev:debug = `next dev` without --turbopack).
  // Turbopack on macOS leaks memory unboundedly under Playwright load via
  // its PostCSS worker spawning + MAP_JIT path (vercel/next.js#92052 et al).
  // Webpack dev is slower to compile but stays memory-bounded.
  const p = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:debug"], {
    stdio: "inherit",
    detached: true,   // becomes its own process group leader
  });
  // The PGID equals the child PID for a detached process on POSIX.
  require("node:fs").writeFileSync(process.argv[1], String(p.pid));
  const forward = (sig) => { try { process.kill(-p.pid, sig); } catch {} };
  process.on("SIGINT",  () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));
  process.on("SIGHUP",  () => forward("SIGTERM"));
  p.on("exit", (code) => process.exit(code ?? 0));
' "$PIDFILE"
