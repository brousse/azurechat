import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const STALE_PARENT_LOCKFILE = path.resolve(__dirname, "..", "..", "package-lock.json");
const STASH_SUFFIX = ".e2e-stash";
const PIDFILE = path.resolve(__dirname, ".dev-server.pid");

async function killDevServerGroup() {
  let pid = "";
  try {
    pid = (await fs.readFile(PIDFILE, "utf8")).trim();
  } catch {
    // No pid file means nothing to kill — start-dev-server.sh removes it on shutdown.
    return;
  }
  if (!pid) return;
  try {
    // Kill the entire process group (leader + postcss workers + any other forks).
    execSync(`kill -- -${pid}`, { stdio: "ignore" });
  } catch {
    /* already gone */
  }
  // Belt-and-braces: kill any stragglers that share the dev cwd.
  try {
    execSync(`pkill -9 -f "build/dev/build/postcss.js"`, { stdio: "ignore" });
  } catch {
    /* none left */
  }
  try {
    await fs.unlink(PIDFILE);
  } catch {
    /* already removed */
  }
  console.log(`[e2e-teardown] killed dev-server process group ${pid}`);
}

async function restoreLockfile() {
  if (process.env.__E2E_LOCKFILE_STASHED !== "1") return;
  try {
    await fs.rename(STALE_PARENT_LOCKFILE + STASH_SUFFIX, STALE_PARENT_LOCKFILE);
    console.log(`[e2e-teardown] restored ${STALE_PARENT_LOCKFILE}`);
  } catch (e) {
    console.log(`[e2e-teardown] could not restore parent lockfile: ${(e as Error).message}`);
  }
}

export default async function globalTeardown() {
  await killDevServerGroup();
  await restoreLockfile();
}
