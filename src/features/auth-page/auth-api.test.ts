import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Unmock auth-api since setup.ts mocks it globally; we need the real module
vi.unmock("@/features/auth-page/auth-api");

// Mock next-auth providers and NextAuth itself
vi.mock("next-auth/providers/azure-ad", () => ({
  default: vi.fn((opts) => ({ id: "azure-ad", ...opts })),
}));
vi.mock("next-auth/providers/github", () => ({
  default: vi.fn((opts) => ({ id: "github", ...opts })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((opts) => ({ id: opts.id || "credentials", ...opts })),
}));
// NextAuth() called at module level
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handler: vi.fn() })),
}));

// Mock helpers.ts hashValue used in CredentialsProvider
vi.mock("./helpers", () => ({
  hashValue: (v: string) => `hashed:${v}`,
}));

describe("auth-page.unit.auth-api — configureIdentityProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.auth-api.001: includes GitHub provider when AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are set", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "gh-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "gh-secret");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");

    const { options } = await import("./auth-api");
    const providerIds = options.providers.map((p: any) => p.id);
    expect(providerIds).toContain("github");
  });

  it("auth-page.unit.auth-api.002: includes AzureAD provider when all three AD env vars are set", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "ad-client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "ad-secret");
    vi.stubEnv("AZURE_AD_TENANT_ID", "ad-tenant");
    vi.stubEnv("NODE_ENV", "test");

    const { options } = await import("./auth-api");
    const providerIds = options.providers.map((p: any) => p.id);
    expect(providerIds).toContain("azure-ad");
  });

  it("auth-page.unit.auth-api.003: includes localdev CredentialsProvider only in development", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "development");

    const { options } = await import("./auth-api");
    const providerIds = options.providers.map((p: any) => p.id);
    expect(providerIds).toContain("localdev");
  });

  it("auth-page.unit.auth-api.004: does NOT include localdev in non-development environments", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "production");

    const { options } = await import("./auth-api");
    const providerIds = options.providers.map((p: any) => p.id);
    expect(providerIds).not.toContain("localdev");
  });

  it("auth-page.unit.auth-api.005: includes all three providers in development with all env vars set", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "gh-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "gh-secret");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "ad-client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "ad-secret");
    vi.stubEnv("AZURE_AD_TENANT_ID", "ad-tenant");
    vi.stubEnv("NODE_ENV", "development");

    const { options } = await import("./auth-api");
    const providerIds = options.providers.map((p: any) => p.id);
    expect(providerIds).toContain("github");
    expect(providerIds).toContain("azure-ad");
    expect(providerIds).toContain("localdev");
  });

  it("auth-page.unit.auth-api.006: no providers when no env vars set in test env", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");

    const { options } = await import("./auth-api");
    expect(options.providers).toHaveLength(0);
  });
});

describe("auth-page.unit.auth-api — GitHub profile callback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.auth-api.007: marks user as admin when email is in ADMIN_EMAIL_ADDRESS", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "gh-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "gh-secret");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_EMAIL_ADDRESS", "admin@test.local");

    const { options } = await import("./auth-api");
    const githubProvider = options.providers.find((p: any) => p.id === "github") as any;
    expect(githubProvider).toBeDefined();

    const profile = await githubProvider.profile(
      { email: "admin@test.local", avatar_url: "https://gh.com/avatar.png", id: "123" },
      { access_token: "tok" }
    );
    expect(profile.isAdmin).toBe(true);
    expect(profile.image).toBe("https://gh.com/avatar.png");
    expect(profile.accessToken).toBe("tok");
  });

  it("auth-page.unit.auth-api.008: non-admin user when email is not in ADMIN_EMAIL_ADDRESS", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "gh-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "gh-secret");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_EMAIL_ADDRESS", "admin@test.local");

    const { options } = await import("./auth-api");
    const githubProvider = options.providers.find((p: any) => p.id === "github") as any;
    const profile = await githubProvider.profile(
      { email: "user@example.com", avatar_url: "https://gh.com/avatar.png", id: "456" },
      {}
    );
    expect(profile.isAdmin).toBe(false);
    expect(profile.accessToken).toBeUndefined();
  });
});

describe("auth-page.unit.auth-api — AzureAD profile callback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.auth-api.009: marks user as admin by email match", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "ad-client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "ad-secret");
    vi.stubEnv("AZURE_AD_TENANT_ID", "ad-tenant");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_EMAIL_ADDRESS", "admin@corp.com");

    const { options } = await import("./auth-api");
    const azureProvider = options.providers.find((p: any) => p.id === "azure-ad") as any;
    expect(azureProvider).toBeDefined();

    const result = await azureProvider.profile(
      { sub: "sub-123", email: "admin@corp.com", preferred_username: "admin_user" },
      { access_token: "azure-token" }
    );
    expect(result.isAdmin).toBe(true);
    expect(result.id).toBe("sub-123");
    expect(result.accessToken).toBe("azure-token");
  });

  it("auth-page.unit.auth-api.010: marks user as admin by preferred_username match", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "ad-client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "ad-secret");
    vi.stubEnv("AZURE_AD_TENANT_ID", "ad-tenant");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ADMIN_EMAIL_ADDRESS", "admin@corp.com");

    const { options } = await import("./auth-api");
    const azureProvider = options.providers.find((p: any) => p.id === "azure-ad") as any;

    const result = await azureProvider.profile(
      { sub: "sub-456", email: "other@corp.com", preferred_username: "admin@corp.com" },
      { access_token: "tok2" }
    );
    expect(result.isAdmin).toBe(true);
  });
});

describe("auth-page.unit.auth-api — JWT callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("auth-page.unit.auth-api.011: jwt callback populates token on initial sign-in with account+user", async () => {
    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;
    const token: any = {};
    const account: any = {
      access_token: "acc",
      expires_at: 9999999,
      refresh_token: "ref",
      provider: "github",
    };
    const user: any = { isAdmin: true, accessToken: undefined };
    const result = await jwtCallback({ token, user, account, trigger: "signIn" } as any);
    expect(result.accessToken).toBe("acc");
    expect(result.accessTokenExpires).toBe(9999999);
    expect(result.refreshToken).toBe("ref");
    expect(result.isAdmin).toBe(true);
    expect(result.authProvider).toBe("github");
  });

  it("auth-page.unit.auth-api.012: jwt callback returns token unchanged for non-azure-ad providers without expiry", async () => {
    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;
    const token: any = {
      authProvider: "github",
      accessToken: "tok",
      accessTokenExpires: Date.now() / 1000 + 9999,
    };
    const result = await jwtCallback({ token, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    // localdev/github paths skip refresh
    expect(result.authProvider).toBe("github");
    expect(result.accessToken).toBe("tok");
  });

  it("auth-page.unit.auth-api.013: jwt callback returns token when accessToken not expired (azure-ad)", async () => {
    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const token: any = {
      authProvider: "azure-ad",
      refreshToken: "ref",
      accessToken: "valid-tok",
      accessTokenExpires: futureExpiry,
    };
    const result = await jwtCallback({ token, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    expect(result.accessToken).toBe("valid-tok");
    expect(result.accessTokenExpires).toBe(futureExpiry);
  });

  it("auth-page.unit.auth-api.014: jwt callback calls refreshAccessToken when token is expired (azure-ad)", async () => {
    vi.stubEnv("AZURE_AD_TENANT_ID", "tenant-id");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "client-secret");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-tok",
        refresh_token: "new-ref",
        expires_in: 3600,
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;

    const expiredExpiry = Math.floor(Date.now() / 1000) - 100;
    const token: any = {
      authProvider: "azure-ad",
      refreshToken: "old-ref",
      accessToken: "expired-tok",
      accessTokenExpires: expiredExpiry,
    };
    const result = await jwtCallback({ token, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    expect(result.accessToken).toBe("new-tok");
    expect(result.refreshToken).toBe("new-ref");
  });

  it("auth-page.unit.auth-api.015: jwt callback returns error token when refresh fails (missing refresh token)", async () => {
    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;

    const expiredExpiry = Math.floor(Date.now() / 1000) - 100;
    const token: any = {
      authProvider: "azure-ad",
      refreshToken: undefined,
      accessToken: "expired-tok",
      accessTokenExpires: expiredExpiry,
    };
    const result = await jwtCallback({ token, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    expect((result as any).error).toBe("RefreshAccessTokenError");
  });

  it("auth-page.unit.auth-api.016: jwt callback infers azure-ad authProvider from refreshToken presence", async () => {
    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;

    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const token: any = {
      // no authProvider set but refreshToken present => should infer azure-ad
      refreshToken: "ref-tok",
      accessToken: "tok",
      accessTokenExpires: futureExpiry,
    };
    const result = await jwtCallback({ token, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    // Should resolve as azure-ad (not expired), return token
    expect(result.authProvider).toBe("azure-ad");
  });
});

describe("auth-page.unit.auth-api — session callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "");
    vi.stubEnv("AZURE_AD_TENANT_ID", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("auth-page.unit.auth-api.017: session callback maps token fields to session.user", async () => {
    const { options } = await import("./auth-api");
    const sessionCallback = options.callbacks!.session!;
    const session: any = { user: { name: "Alice", email: "alice@example.com" } };
    const token: any = {
      isAdmin: true,
      accessToken: "my-token",
      authProvider: "azure-ad",
    };
    const result = await sessionCallback({ session, token } as any);
    expect(result.user.isAdmin).toBe(true);
    expect(result.user.accessToken).toBe("my-token");
    expect(result.user.authProvider).toBe("azure-ad");
    expect(result.user.isLocalDevUser).toBe(false);
  });

  it("auth-page.unit.auth-api.018: session callback sets isLocalDevUser=true for localdev authProvider", async () => {
    const { options } = await import("./auth-api");
    const sessionCallback = options.callbacks!.session!;
    const session: any = { user: { name: "Dev", email: "dev@localhost" } };
    const token: any = { isAdmin: false, accessToken: "fake_token", authProvider: "localdev" };
    const result = await sessionCallback({ session, token } as any);
    expect(result.user.isLocalDevUser).toBe(true);
  });

  it("auth-page.unit.auth-api.019: session callback sets isLocalDevUser=true for @localhost email fallback", async () => {
    const { options } = await import("./auth-api");
    const sessionCallback = options.callbacks!.session!;
    const session: any = { user: { name: "Dev", email: "dev@localhost" } };
    const token: any = { isAdmin: false, accessToken: "fake_token", authProvider: "github" };
    const result = await sessionCallback({ session, token } as any);
    // @localhost email forces isLocalDevUser=true
    expect(result.user.isLocalDevUser).toBe(true);
  });

  it("auth-page.unit.auth-api.020: session callback sets accessToken to empty string when missing", async () => {
    const { options } = await import("./auth-api");
    const sessionCallback = options.callbacks!.session!;
    const session: any = { user: { name: "Alice", email: "alice@example.com" } };
    const token: any = { isAdmin: false };
    const result = await sessionCallback({ session, token } as any);
    expect(result.user.accessToken).toBe("");
  });
});

describe("auth-page.unit.auth-api — refreshAccessToken (via expired token)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_GITHUB_ID", "");
    vi.stubEnv("AUTH_GITHUB_SECRET", "");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "client-id");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "client-secret");
    vi.stubEnv("AZURE_AD_TENANT_ID", "tenant-id");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("auth-page.unit.auth-api.021: returns error token when fetch response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_grant" }),
    }));

    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;
    const expiredToken: any = {
      authProvider: "azure-ad",
      refreshToken: "old-ref",
      accessToken: "expired",
      accessTokenExpires: Math.floor(Date.now() / 1000) - 1,
    };
    const result = await jwtCallback({ token: expiredToken, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    expect((result as any).error).toBe("RefreshAccessTokenError");
  });

  it("auth-page.unit.auth-api.022: handles refresh token with zero expires_in (keeps old expiry)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-ref",
        expires_in: 0,
      }),
    }));

    const { options } = await import("./auth-api");
    const jwtCallback = options.callbacks!.jwt!;
    const oldExpiry = Math.floor(Date.now() / 1000) - 50;
    const expiredToken: any = {
      authProvider: "azure-ad",
      refreshToken: "old-ref",
      accessToken: "expired",
      accessTokenExpires: oldExpiry,
    };
    const result = await jwtCallback({ token: expiredToken, user: undefined as any, account: undefined as any, trigger: "update" } as any);
    // expires_in=0 => keeps old expiry
    expect((result as any).accessTokenExpires).toBe(oldExpiry);
    expect((result as any).accessToken).toBe("new-access");
  });
});
