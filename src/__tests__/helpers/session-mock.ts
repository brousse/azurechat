import { vi } from "vitest";

export type TestSession = {
  user: {
    name: string;
    email: string;
    image?: string;
    isAdmin?: boolean;
    accessToken?: string;
  };
  expires: string;
} | null;

export const defaultSession: TestSession = {
  user: {
    name: "Test User",
    email: "test@example.com",
    image: "",
    isAdmin: false,
    accessToken: "test-access-token",
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

export const adminSession: TestSession = {
  user: {
    name: "Admin",
    email: "admin@test.local",
    image: "",
    isAdmin: true,
    accessToken: "admin-access-token",
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

export function withSession(session: TestSession) {
  const getServerSession = vi.fn(async () => session);
  return getServerSession;
}

export async function setSession(session: TestSession) {
  const mod = await import("next-auth");
  (mod as any).getServerSession.mockResolvedValue(session);
  const nextMod = await import("next-auth/next").catch(() => null);
  if (nextMod && (nextMod as any).getServerSession) {
    (nextMod as any).getServerSession.mockResolvedValue(session);
  }
}
