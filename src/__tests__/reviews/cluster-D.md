# Cluster D Review — Coverage / Blindspot Reviewer (Opus)

Scope: `src/app/**/route.ts` (all under `app/api` and `app/(authenticated)/api`), `src/app/health/route.ts`, `src/proxy.ts`.

Tests run: `npx vitest run app proxy --coverage` → **7 files, 30 tests, all green.**

## Verdict: FAIL

Three route files in scope have **no test companion at all**: `/api/models`, `/api/usage`, and the NextAuth catch-all `/api/auth/[...nextauth]`. The `/api/code-interpreter/file/[fileId]` test exercises only `GET` — the entire `DELETE` handler (lines 48-81) plus several branches of `GET` are uncovered, leaving that file at **39.68% stmt / 50% branch**. `src/proxy.ts` is **not in the vitest coverage include glob**, so the 11 proxy tests run but contribute nothing to the coverage roll-up (separate config bug — should be fixed in `vitest.config.ts`). No nonsense tests were found.

---

## Step 1 — Source enumeration vs. test companions

Source `route.ts` files found under cluster D scope (9 total):

| Source file | Test companion? |
|---|---|
| `app/health/route.ts` | YES — `route.test.ts` |
| `app/(authenticated)/api/chat/route.ts` | YES |
| `app/(authenticated)/api/code-interpreter/upload/route.ts` | YES |
| `app/(authenticated)/api/code-interpreter/file/[fileId]/route.ts` | YES (GET only — DELETE untested) |
| `app/(authenticated)/api/document/route.ts` | YES |
| `app/(authenticated)/api/images/route.ts` | YES |
| `app/(authenticated)/api/auth/[...nextauth]/route.ts` | **NO** |
| `app/(authenticated)/api/models/route.ts` | **NO** |
| `app/(authenticated)/api/usage/route.ts` | **NO** |
| `proxy.ts` (root) | YES — `proxy.test.ts` |

The implementer's report listed **7** test files but there are **9** source route files plus proxy — **3 route files were silently skipped**.

The NextAuth file is a 5-line re-export (`export { handlers as GET, handlers as POST }`); a minimal smoke test that asserts `GET === POST` and both are functions would still cost <10 lines and would catch a regression where someone changes the re-export shape. Skipping it without comment is not acceptable.

`/api/models` and `/api/usage` are non-trivial handlers (filtering MODEL_CONFIGS by env var, aggregating daily/weekly token totals, both with explicit try/catch → 500 paths). These are real features and need positive + negative cases.

---

## Step 2 — Cluster D coverage (from `coverage-summary.json`)

| Source file | stmt % | branch % | func % | lines % | Below bar? |
|---|---|---|---|---|---|
| `app/health/route.ts` | 100 | 100 | 100 | 100 | OK |
| `app/(authenticated)/api/chat/route.ts` | 100 | **50** | 100 | 100 | FAIL (branch < 95) |
| `app/(authenticated)/api/code-interpreter/upload/route.ts` | 96.92 | 83.33 | 100 | 96.92 | FAIL (stmt<100, branch<95) |
| `app/(authenticated)/api/code-interpreter/file/[fileId]/route.ts` | **39.68** | **50** | **50** | **39.68** | FAIL (DELETE handler entirely untested) |
| `app/(authenticated)/api/document/route.ts` | 100 | 100 | 100 | 100 | OK |
| `app/(authenticated)/api/images/route.ts` | 100 | 100 | 100 | 100 | OK |
| `app/(authenticated)/api/auth/[...nextauth]/route.ts` | 0 | 0 | 0 | 0 | FAIL (no test) |
| `app/(authenticated)/api/models/route.ts` | 0 | 0 | 0 | 0 | FAIL (no test) |
| `app/(authenticated)/api/usage/route.ts` | 0 | 0 | 0 | 0 | FAIL (no test) |
| `proxy.ts` | n/a | n/a | n/a | n/a | NOT INCLUDED in coverage glob |

Note on `proxy.ts`: `vitest.config.ts` `coverage.include` is `["features/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"]` — it does **not** include the root-level `proxy.ts`, so it is invisible to the roll-up. The 11 tests run and pass, but they contribute zero to the reported numbers. This is a config bug that masks any future regression in proxy coverage.

---

## Step 3 — Blindspots in existing tests

### `app/(authenticated)/api/chat/route.test.ts`
- **No assertion on `req.signal` propagation**: test 001 uses `expect.any(Object)` for the second arg. Should assert `req.signal` is forwarded exactly, since `maxDuration = 600` exists specifically so cancellations propagate.
- **Branch 50% gap**: the `error instanceof Error ? error.message : String(error)` ternary and the matching `stack` ternary are never exercised with a non-Error throw. Trivial to fix by making `ChatAPIEntry` reject with a string (`mockRejectedValue("plain string")`).
- **Test 005 ("FormData missing content")** accepts both `400 | 500` which is sloppy. The implementer's own comment correctly identifies the observable behavior is 500 (spread of null then ChatAPIEntry throws). Pin it.
- **No test for `content` field present but ChatAPIEntry returning a streaming Response** — the happy path uses a plain `Response("ok", 200)` rather than a `ReadableStream`. Acceptable since the route just forwards, but a one-liner stream-forward test would document intent.
- **No auth gate test** — the chat route relies on the matcher in `proxy.ts` (`/api/chat:path*`) for auth, and the route itself does no auth check. This is correct, but a comment in the test acknowledging that the gate lives in `proxy.test.ts` (006) would prevent a future implementer from "adding" a duplicate gate.

### `app/(authenticated)/api/code-interpreter/upload/route.test.ts`
- **Missing 401 case**: `mockedGetCurrentUser.mockResolvedValue(null)` is never set; the explicit `if (!user)` branch on line 10 is uncovered. This is THE auth-gate test for this route — its absence is the biggest single blindspot in cluster D. Add it.
- **No test for file at exactly 512MB** (the boundary `> maxSize`). Tests cover only "1 byte over". An equality test (`size === 512*1024*1024`) would document the >, not >=, semantics.
- **No assertion that `UploadFileForCodeInterpreter` is called with the actual `File`** (positional arg check missing).

### `app/(authenticated)/api/code-interpreter/file/[fileId]/route.test.ts`
- **DELETE handler entirely untested** — lines 48-81. This is half the file. Need:
  - 401 when `getCurrentUser` returns null
  - 400 when `fileId` is empty
  - 200 with `{success:true}` body on OK
  - 500 with error message on ERROR
  - 500 on outer catch
- **GET 401 case missing**: `getCurrentUser` null path on line 13 uncovered.
- **GET 400 case missing**: empty `fileId` path on line 19 uncovered.
- **GET 500 case missing**: outer catch on line 40 uncovered (e.g. `mockedDownload.mockRejectedValue(...)`).
- **No assertion on `Content-Disposition` header** in the happy-path GET test — the filename is sent verbatim to the client, this is the natural place to catch a filename-injection regression. Add `expect(res.headers.get("Content-Disposition")).toContain('"chart.png"')`.
- **No test for `Content-Length` header** correctness.

### `app/(authenticated)/api/document/route.test.ts`
- Both cases acceptable. The "throws → unhandled rejection" test documents the missing try/catch — that is a **source-code blindspot** worth a comment-level SOURCE BUG annotation similar to the proxy.test annotation, but the test itself is fine.

### `app/(authenticated)/api/images/route.test.ts`
- **No test that `req` is forwarded verbatim** beyond `toHaveBeenCalledWith(req)` — fine.
- **No negative test for `ImageAPIEntry` throwing**: the route has no try/catch, so an unhandled rejection would crash the request. Symmetric to the `document` route 002 test. Add it.
- **No test for query-param-less request** (`/api/images` with no `t` / `img`). Since the route just forwards, this is more of an `images-api.ts` concern, but a single passthrough assertion that mirrors what `document` does for null queries would be cheap insurance.

### `app/health/route.test.ts`
- Acceptable. Single GET, single positive case is sufficient for a 4-line file.
- No negative case is reasonable here (no inputs, no auth, no errors), but adding a smoke assertion that the response is a `NextResponse` (`expect(res).toBeInstanceOf(Response)`) costs nothing.

### `proxy.test.ts`
- 11 cases cover the matrix well (logged-in, anonymous, admin/non-admin, `/`, `/chat`, `/api/chat`, `/api/images`, `/api/auth/...`, `/reporting`, `/persona`, `/health`).
- Implementer correctly documented the **SOURCE BUG** that `/api/auth` is not excluded from `requireAuth` in `proxy()`, and pinned the observable behavior. Good.
- **Missing case**: no test for `/unauthorized` itself — which IS in the matcher and IS in `requireAuth`. An anonymous user hitting `/unauthorized` directly should also be redirected to `/`, but that creates a redirect loop (the unauthorized page is meant to be reachable from a rewrite, not directly). Worth a test that pins this behavior.
- **Missing case**: no test for `/agent/*` and `/prompt/*` (both in `requireAuth` and `matcher`). Coverage-wise these collapse into the same branch as `/persona/*`, but a one-line existence test would prevent a future implementer from accidentally dropping them.

---

## Step 4 — Nonsense tests

**None.** All 30 tests assert observable behavior. The looser ones (chat 005's `[400, 500]`) are sloppy but pin a real ambiguity rather than testing the mock.

---

## Required corrections (ranked)

1. **Add tests for `/api/usage/route.ts`** (positive: returns `{daily, weekly}` shape with mocked `GetDailyUsage`/`GetWeeklyUsage`; negative: 500 when service throws; ensure `weeklyTotals` reduce is exercised by passing >0 days).
2. **Add tests for `/api/models/route.ts`** (positive: returns filtered `availableModels` when env vars set + `defaultModel` is first available; negative: empty env vars → falls back to `DEFAULT_MODEL`; 500 path if `MODEL_CONFIGS` access throws).
3. **Add minimal smoke test for `/api/auth/[...nextauth]/route.ts`** (`expect(GET).toBeDefined(); expect(GET).toBe(POST);` — protects against a regression where the re-export shape changes).
4. **Extend `[fileId]/route.test.ts` to cover DELETE** + GET's 401, 400, and 500 branches. This is the single largest coverage gap in cluster D.
5. **Add 401 test to `code-interpreter/upload/route.test.ts`** (`getCurrentUser` returns null → 401). Critical auth-gate assertion is missing.
6. **Fix `vitest.config.ts` `coverage.include`** to add `"proxy.ts"` (or `"./proxy.ts"` / `"*.ts"` with appropriate excludes) so `src/proxy.ts` shows up in the roll-up. Without this, the 11 proxy tests are invisible to coverage and a future regression in proxy logic could land at 0% coverage without anyone noticing.
7. Tighten chat-route test 005 to assert exactly 500 (not `[400, 500]`), and add a non-Error reject to cover the `instanceof Error` ternary branch (gets chat route to 100% branch).

---

## Source bugs confirmed (documented by tests)

1. **`proxy.ts` has no `/api/auth` exclusion** — proxy.test.ts case 010 documents this; production-safe only because the `matcher` excludes `/api/auth*`. Test correctly pins the current observable behavior (redirect to `/`).
2. **`document/route.ts` has no try/catch** — document.test.ts case 002 documents this by asserting `await expect(...).rejects.toThrow()`. Same applies to `images/route.ts` but is not yet asserted there (see correction list).

Implementer reported "two source bugs" — both confirmed, and the tests do pin observable behavior rather than aspirational behavior. Good.

---

## Verdict summary

- All cluster tests green: YES
- Every route file has test companion: **NO** (3 missing)
- Stmt/func ≥100%, branch ≥95% on every route: **NO** (4 files below bar)
- No nonsense tests: YES

**Overall: FAIL.** Cannot pass until corrections 1-5 are addressed at minimum; 6-7 are quality fixes.
