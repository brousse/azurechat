import { encode } from "next-auth/jwt";
import fs from "node:fs/promises";
import path from "node:path";

const SECRET = process.env.NEXTAUTH_SECRET ?? "test-nextauth-secret-do-not-use-in-prod";
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type E2EUser = {
  name: string;
  email: string;
  image?: string;
  isAdmin?: boolean;
};

const DEFAULT_USER: E2EUser = {
  name: "Test User",
  email: "test@example.com",
  image: "",
  isAdmin: false,
};

export async function writeStorageState(user: E2EUser = DEFAULT_USER, file = "user.json") {
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      picture: user.image ?? "",
      sub: user.email,
      isAdmin: !!user.isAdmin,
      accessToken: "e2e-access-token",
      iat: now,
      exp: now + 60 * 60 * 24,
      jti: `e2e-${Date.now()}`,
    },
    secret: SECRET,
  });

  const url = new URL(BASE_URL);
  const cookieName = url.protocol === "https:"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: token,
        domain: url.hostname,
        path: "/",
        expires: now + 60 * 60 * 24,
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };

  const target = path.resolve(__dirname, ".auth", file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(storageState, null, 2), "utf8");
  return target;
}

// Next.js 16 picks the workspace root by walking up for the first lockfile.
// This repo has a stale parent-level `package-lock.json` that wins over the
// real one in `src/`, which then causes Next to skip `src/instrumentation.ts`
// (the hook that registers our in-memory service bindings for e2e). Hide it
// for the duration of the test run and restore it in teardown.
const STALE_PARENT_LOCKFILE = path.resolve(__dirname, "..", "..", "package-lock.json");
const STASH_SUFFIX = ".e2e-stash";

async function hideStaleParentLockfile() {
  try {
    await fs.access(STALE_PARENT_LOCKFILE);
    await fs.rename(STALE_PARENT_LOCKFILE, STALE_PARENT_LOCKFILE + STASH_SUFFIX);
    process.env.__E2E_LOCKFILE_STASHED = "1";
    console.log(`[e2e-setup] stashed ${STALE_PARENT_LOCKFILE}`);
  } catch (e) {
    console.log(`[e2e-setup] no parent lockfile to stash (${(e as Error).message})`);
  }
}

export default async function globalSetup() {
  await hideStaleParentLockfile();
  await writeStorageState(DEFAULT_USER, "user.json");
  await writeStorageState({ ...DEFAULT_USER, name: "Admin User", email: "admin@example.com", isAdmin: true }, "admin.json");
}
