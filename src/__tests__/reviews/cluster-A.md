# Cluster A Review — Coverage / Blindspot Reviewer (Opus)

Scope: `src/features/auth-page/{helpers,logout-on-session-expired,auth-api}.ts` and `src/features/common/**` (util, schema-validation, navigation-helpers, server-action-response, services/cosmos, services/key-vault, services/usage-service plus any other module in scope).

Tests run: `npx vitest run features/auth-page features/common` → 38 tests across 8 files, all green.

## Verdict: FAIL

The implementer left two source files in scope (`auth-api.ts`, `logout-on-session-expired.ts`) with **no test companion at all** — 0% coverage. Six catalog cases are not implemented. `cosmos.ts`, `key-vault.ts`, `usage-service.ts` each sit below the 95% branch threshold. No nonsense tests were found.

---

## Coverage table (cluster A scope only)

| Source file | stmt % | branch % | func % | lines % | Below bar? |
|---|---|---|---|---|---|
| `features/auth-page/helpers.ts` | 100 | 100 | 100 | 100 | OK |
| `features/auth-page/auth-api.ts` | **0** | **0** | **0** | **0** | FAIL (no test) |
| `features/auth-page/logout-on-session-expired.ts` | **0** | **0** | **0** | **0** | FAIL (no test) |
| `features/common/util.ts` | 100 | 100 | 100 | 100 | OK |
| `features/common/schema-validation.ts` | 100 | 100 | 100 | 100 | OK |
| `features/common/navigation-helpers.ts` | 100 | 100 | 100 | 100 | OK |
| `features/common/server-action-response.ts` | 100 | 100 | 100 | 100 | OK |
| `features/common/services/cosmos.ts` | 88.23 | **60** | 100 | 88.23 | FAIL (stmt<100, branch<95) |
| `features/common/services/key-vault.ts` | 66.66 | **50** | 100 | 66.66 | FAIL (stmt<100, branch<95) |
| `features/common/services/usage-service.ts` | 80.25 | **77.77** | 100 | 80.25 | FAIL (stmt<100, branch<95) |

Out-of-cluster-A `features/common/**` source files with 0% coverage are listed under "Missing files" for completeness, but per the cluster split likely belong to a sibling cluster (storage / metrics / news / hooks / logger / openai / azure-default-credential / ai-search / changelog / chat-metrics / chat-token / document-intelligence / microsoft-graph-client / error-codes).

### Uncovered ranges (from `--coverage.reporter=text`)

- `cosmos.ts` lines 20-23 — `if (!endpoint) throw new Error(...)` branch in `CosmosInstance`. The "missing env" failure path is not tested.
- `key-vault.ts` lines 9-12 — `if (!keyVaultName) throw new Error(...)` branch. Same shape; not tested.
- `usage-service.ts` lines 145-146 (`if (!config) return {exceeded:false}` — unknown model) and 188-194 (`catch` branch in `CheckLimits` — Cosmos throw inside CheckLimits returns `{exceeded:false}`). `GetWeeklyUsage` catch (lines 131-136) is also unexercised: the negative-path `.011` test does not exist.

---

## Missing files (hard fail)

Two source files in cluster A have **no `.test.ts` companion**:

1. `src/features/auth-page/auth-api.ts` — catalog requires `auth-page.unit.auth-api.001` and `.002`. Not implemented. No test file exists.
2. `src/features/auth-page/logout-on-session-expired.ts` — catalog requires `auth-page.unit.logout.001` and `.002`. Not implemented. No test file exists.

The implementer's report omitted these. This alone forces a FAIL.

`features/common/error-codes.ts` (also in `common/**` scope) has 0% coverage and no test, but it is a single-export constants file (`SESSION_EXPIRED_ERROR_CODE = "SESSION_EXPIRED"`); a one-assert smoke test should be added so the constant value cannot drift unnoticed (any consumer test of `logout-on-session-expired` would pin it transitively, which makes the missing logout test doubly harmful).

---

## Blindspots — catalog cases without an implementing test

Grepped each test file for the case ID; the following catalog IDs in cluster A scope are **not present in any test file**:

| Catalog ID | Source | Description | Notes |
|---|---|---|---|
| `auth-page.unit.helpers.012` | helpers.ts | `userSession` flags admin when email matches `ADMIN_EMAIL_ADDRESS` | Requires re-importing `helpers` with the env stubbed BEFORE `auth-api` resolves. Currently the test mocks `auth-api` as `{ options: {} }`, which bypasses the admin parser — implementer must instead stub the env and use a real (non-mocked) `auth-api` for this case, OR more practically, drive admin behavior through a directly-mocked `getServerSession` that returns `user.isAdmin: true` (the catalog wording is loose enough to allow this). |
| `auth-page.unit.helpers.013` | helpers.ts | `isAdmin: false` when email NOT in list | Same setup pattern as .012. |
| `auth-page.unit.helpers.014` | helpers.ts | Tolerates `ADMIN_EMAIL_ADDRESS` missing entirely (no throw, `isAdmin:false`) | Same. |
| `auth-page.unit.helpers.015` | helpers.ts | `hashValue` rejects `undefined` input (TypeError surfaces) | Trivially add: `expect(() => hashValue(undefined as any)).toThrow()`. |
| `auth-page.unit.auth-api.001` | auth-api.ts | Admin parser splits/trims comma-separated `ADMIN_EMAIL_ADDRESS` | NO test file exists for `auth-api.ts`. |
| `auth-page.unit.auth-api.002` | auth-api.ts | `signIn` callback rejects when email empty | NO test file. (Note: the source's `callbacks` object does NOT define a `signIn` callback — see "Source discrepancy" below. Implementer must either add the callback to the source OR rewrite the catalog case to match what's actually exposed, e.g. the `jwt` callback's behavior on `account/user` absent.) |
| `auth-page.unit.logout.001` | logout-on-session-expired.ts | `signOut` called on `SESSION_EXPIRED` | NO test file. |
| `auth-page.unit.logout.002` | logout-on-session-expired.ts | No-op when no `SESSION_EXPIRED` code | NO test file. The source also has two earlier negative branches (status !== UNAUTHORIZED, missing `errors` array) — add them to reach 100% branch on this file. |
| `common.unit.util.005` | util.ts | `sortByTimestamp` defensive with missing `lastMessageAt` | Not implemented. |
| `common.unit.nav.005` | navigation-helpers.ts | `RedirectToChatThread("")` still calls `/chat/` | Not implemented. |
| `common.unit.usage.011` | usage-service.ts | `GetWeeklyUsage` returns `[]` on Cosmos throw | Not implemented. Covers lines 131-136. NOTE: the source returns `[]` on error, not a `{status:"ERROR"}` envelope as the catalog text suggests — assert the actual behavior (`result === []`). |
| `common.unit.usage.012` | usage-service.ts | `GetDailyUsage` error when `userHashedId()` throws | Not implemented. Current test mocks `userHashedId` to always resolve; this case needs it to reject. |
| `common.unit.usage.013` | usage-service.ts | `CheckLimits` `{exceeded:false}` with no limits but usage row present | Not implemented (.005 covers no-limits without a usage row; .013 wants the extra arrangement). |
| `common.unit.usage.014` | usage-service.ts | `CheckLimits` with unknown model returns `{exceeded:false}` | Not implemented. Covers lines 145-146. |

### Branch coverage that no test currently triggers

- `cosmos.ts` `CosmosInstance`: missing-endpoint throw. Add `cosmos.004`: stub `process.env.AZURE_COSMOSDB_URI` to `undefined`, expect throw.
- `key-vault.ts` `AzureKeyVaultInstance`: missing-`AZURE_KEY_VAULT_NAME` throw. Add `kv.002`.
- `usage-service.ts` `CheckLimits` catch: `GetOrCreateDailyUsage` throws inside CheckLimits. Add `usage.015`-style: have `HistoryContainer().item().read` reject AND make `models[model]` look like a hit so it falls past the first early-return — actually simpler: throw inside `GetOrCreateDailyUsage` then ensure the catch branch is hit. (The current `.002` test only exercises the inner try/catch of `GetOrCreateDailyUsage`; the outer one in `CheckLimits` is still untouched because `GetOrCreateDailyUsage` then returns a synthetic doc instead of throwing.) Force `HistoryContainer()` itself to throw to reach the outer catch.

### Source discrepancy worth flagging back to the user

`auth-api.ts` does **not** expose a `signIn` callback (only `jwt` and `session`). Catalog case `auth-page.unit.auth-api.002` cannot be implemented as written. Either:
- Add a `signIn` callback to `auth-api.ts` (behavior change, needs product confirmation), OR
- Rewrite the catalog case to test the `jwt` callback's `RefreshAccessTokenError` path (line 197-202) and/or the `session` callback's `isLocalDevUser` fallback (line 144-146), both of which are currently 0%-covered branches.

---

## Nonsense tests

None found. Each existing test makes at least one observable, non-mock-tautological assertion (digest equality, URL string equality, container name, redirect path, document arithmetic, partition key value). The only borderline case is `helpers.test.ts` `.010`, which inspects the `redirect` mock — but it does so to document a real source bug (`RedirectToPage` called without `await` in `helpers.ts:48`); the side-effect assertion is legitimate.

Worth raising back to the user as a **source bug to fix in product code, not in the test**: `helpers.ts:48` should `await RedirectToPage("chat")` so the `NEXT_REDIRECT` rejection becomes a thrown error visible to the caller instead of an unhandled promise rejection. Currently `redirectIfAuthenticated` resolves successfully even though it intends to redirect.

---

## Required corrections (concrete to-do list for the implementer)

1. **Create `src/features/auth-page/auth-api.test.ts`**. Cover at minimum:
   - `auth-page.unit.auth-api.001`: with `vi.stubEnv("ADMIN_EMAIL_ADDRESS", " a@x.com , b@y.com ")` then `vi.resetModules()` then dynamic-import `auth-api` and invoke the GitHub provider's `profile` (or AzureAD provider's `profile`) function with `{email: "B@Y.COM"}` and assert `isAdmin === true`. This exercises the `adminEmails?.split(",").map(toLowerCase().trim())` logic at lines 14-16.
   - Replacement for `.002`: call `options.callbacks.jwt({token:{refreshToken:"x", accessTokenExpires: Math.floor(Date.now()/1000)-10}, user: undefined, account: null})` with `fetch` mocked to reject; assert returned token has `error:"RefreshAccessTokenError"` (covers lines 197-202).
   - Call `options.callbacks.session({session:{user:{email:"u@localhost"}}, token:{}})` and assert `session.user.isLocalDevUser === true` (covers lines 144-146 `fallbackLocalDev`).
   - Call `options.callbacks.jwt({token:{}, user:{accessToken:"a", isAdmin:true}, account:{access_token:"acc", expires_at:123, refresh_token:"r", provider:"azure-ad"}})` and assert all token fields propagate (covers lines 104-118).
   - Negative for `signIn`: since no `signIn` callback exists, escalate to the user — see "Source discrepancy".

2. **Create `src/features/auth-page/logout-on-session-expired.test.ts`** covering all four branches:
   - `.001` happy path (`UNAUTHORIZED` + `SESSION_EXPIRED` code) → `vi.mock("next-auth/react", () => ({ signOut: vi.fn() }))`, expect called once with `{callbackUrl:"/"}` and function returns `true`.
   - `.002` wrong status → expect not called, returns `false`.
   - Add `.003`: `UNAUTHORIZED` but `errors` field missing → returns `false`, signOut not called (covers line 17-19).
   - Add `.004`: `UNAUTHORIZED` with errors but none has `SESSION_EXPIRED` code → returns `false` (covers line 25-27).

3. **Extend `features/auth-page/helpers.test.ts`** with `helpers.012`, `.013`, `.014`, `.015`. Easiest path: have the default `getServerSession` mock return `{user:{...,isAdmin:true}}` for `.012`, default-false session for `.013`/`.014` (env-stubbing variations), and a direct `expect(() => hashValue(undefined as any)).toThrow()` for `.015`.

4. **Extend `features/common/util.test.ts`** with `common.unit.util.005`: sort `[{lastMessageAt:undefined},{lastMessageAt:"2024-01-01T00:00:00Z"}]` and assert that array length is preserved and result documents NaN-stable order (the `new Date(undefined).getTime()` is `NaN` → comparator returns `NaN`, which V8 treats as 0 → stable). Hardcoding the actual observed output is fine; the assertion is "no silent corruption".

5. **Extend `features/common/navigation-helpers.test.ts`** with `common.unit.nav.005`: `await expect(RedirectToChatThread("")).rejects.toThrow("NEXT_REDIRECT:/chat/")`.

6. **Extend `features/common/services/cosmos.test.ts`** with `cosmos.004`: `vi.stubEnv("AZURE_COSMOSDB_URI", "")` (or delete env), `vi.resetModules()`, expect `CosmosInstance()` to throw `/endpoint is not configured/`. Brings `cosmos.ts` to 100% stmt / 100% branch.

7. **Extend `features/common/services/key-vault.test.ts`** with `kv.002`: `vi.stubEnv("AZURE_KEY_VAULT_NAME", "")`, `vi.resetModules()`, expect `AzureKeyVaultInstance()` to throw `/Azure Key vault is not configured/`. Brings `key-vault.ts` to 100% stmt / 100% branch.

8. **Extend `features/common/services/usage-service.test.ts`** with:
   - `.011`: `mockQueryFetchAll.mockRejectedValueOnce(new Error("kaboom"))`, assert `GetWeeklyUsage("u")` resolves to `[]`.
   - `.012`: override the mocked `userHashedId` for this test to throw, assert `GetDailyUsage()` rejects (current source does NOT swallow — it surfaces).
   - `.013`: model with no limits + usage row present → still `{exceeded:false}`.
   - `.014`: `CheckLimits("u", "gpt-unknown" as any)` → `{exceeded:false}` without any Cosmos call.
   - `.015` (new): force `HistoryContainer()` to throw to hit the outer catch in `CheckLimits` (lines 189-194).
   Brings `usage-service.ts` to ≥95% branch.

9. **(Recommended, not strictly required)** Add a tiny `error-codes.test.ts` pinning `SESSION_EXPIRED_ERROR_CODE === "SESSION_EXPIRED"` so the constant is regression-locked.

10. **(Source bug, raise to user)** Fix `helpers.ts:48` to `await RedirectToPage("chat")` and then simplify `auth-page.unit.helpers.010` to a straightforward `rejects.toThrow("NEXT_REDIRECT:/chat")`.

---

## Verdict

**FAIL** — 2 source files with no test companion, 14 catalog cases not implemented in cluster A, 3 source files below the 95% branch / 100% stmt bar. No nonsense tests. All 38 currently-implemented tests pass.

Re-review after corrections 1-8 land.
