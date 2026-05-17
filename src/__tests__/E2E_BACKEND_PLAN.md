# E2E backend stub strategy

## Problem

Cluster F's Playwright suite has 11 of 14 specs marked `test.fixme` because Next.js server components call Cosmos DB at SSR time, **before** `page.route(...)` can intercept anything. The current chain:

```
Browser → Next.js (server) → CosmosInstance() → @azure/cosmos TCP → ❌ AggregateAuthenticationError
```

Route interception only fires for browser-issued requests, not internal server-side data fetches. No amount of `page.route('**/api/...', ...)` will help here.

## Three viable approaches (pick one)

### A. Source-level test seam in `cosmos.ts` (smallest blast radius)

Add at the top of `features/common/services/cosmos.ts`:

```ts
if (process.env.AZURECHAT_TEST_BACKEND === "memory") {
  // dynamic import of an in-memory implementation
  module.exports = require("../../../__tests__/helpers/cosmos-in-memory");
}
```

Then `cosmos-in-memory.ts` exports the same `CosmosInstance`, `ConfigContainer`, `HistoryContainer` symbols backed by JSON files under `e2e/fixtures/`. Set `AZURECHAT_TEST_BACKEND=memory` in `playwright.config.ts`'s `webServer.env`.

Pros: no other code touched; emulator-free; deterministic.
Cons: source code knows about tests (a small ergonomic cost).

### B. Next.js webpack alias swap

In `next.config.js`:

```js
config.resolve.alias["@/features/common/services/cosmos"] =
  process.env.AZURECHAT_TEST_BACKEND === "memory"
    ? path.resolve(__dirname, "__tests__/helpers/cosmos-in-memory")
    : path.resolve(__dirname, "features/common/services/cosmos");
```

Pros: source untouched.
Cons: relies on aliasing matching every importer path; failure mode is silent (wrong file resolves).

### C. Azure Cosmos DB Linux Emulator in Docker

```yaml
# docker-compose.test.yml
cosmos:
  image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview
  ports: ["8081:8081"]
```

Set `AZURE_COSMOSDB_URI=https://localhost:8081` + seed data in `globalSetup`.

Pros: fidelity — actually exercises the SDK.
Cons: ~2GB image, slow start, requires Docker; complicates CI.

## Recommendation

**A** for local + CI, with **C** as an optional opt-in for deep integration runs. The seam touches one file (`cosmos.ts`) by six lines, gated by an env var; no production behavior changes.

For Azure OpenAI Responses streaming, also need a seam — `OpenAIV1Instance` should similarly check `AZURECHAT_TEST_BACKEND` and return a stub that serves canned SSE from `e2e/fixtures/streams/*.txt`.

## Required scope additions

If we proceed with A:

1. `__tests__/helpers/cosmos-in-memory.ts` — exports same symbols, backed by maps seeded from `e2e/fixtures/cosmos/*.json`.
2. `__tests__/helpers/openai-in-memory.ts` — canned streams.
3. `e2e/fixtures/` — seed JSON for threads/messages/personas/prompts/extensions.
4. Six lines in `cosmos.ts` + similar in `openai.ts`.
5. Env var `AZURECHAT_TEST_BACKEND=memory` in `playwright.config.ts` webServer.

After this lands, the 11 fixme'd specs can be un-fixme'd and should pass.

## Decision pending

Approve **A**, **B**, or **C** before I make the source change. Until then, e2e remains at 3 passing / 11 fixme.
