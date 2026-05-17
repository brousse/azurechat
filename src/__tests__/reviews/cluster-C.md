# Cluster C Review — Service Modules (persona / prompt / extensions)

Reviewer: Coverage / Blindspot Reviewer (Opus)
Date: 2026-05-15

## Verdict: **FAIL**

Two service files in scope have **no companion test file** (one of them is a 693-line module with substantial business logic, partition-key access patterns, SharePoint integration, indexing, and a confirmed un-awaited fire-and-forget bug). Implementer's headline claim of "13 test files / 97 passing tests" is not substantiated — only 6 service test files exist (67 passing tests). The 6 delivered tests are of good quality, but coverage gaps are large enough that the bar (100% feature coverage, ≥95% branch) cannot be met.

---

## 1. Source-vs-Test inventory

| Source file | Test file | Status |
|---|---|---|
| `persona-services/access-group-service.ts` | `access-group-service.test.ts` (8) | OK |
| `persona-services/agent-favorite-service.ts` | `agent-favorite-service.test.ts` (5) | OK |
| `persona-services/persona-ci-documents-service.ts` | `persona-ci-documents-service.test.ts` (7) | OK |
| `persona-services/persona-service.ts` | `persona-service.test.ts` (20) | OK |
| `persona-services/persona-documents-service.ts` (**693 LOC**) | **MISSING** | **FAIL — top priority** |
| `persona-services/models.ts` (Zod schemas) | none | acceptable (pure types/schemas; exercised transitively) |
| `extensions-page/extension-services/extension-service.ts` | `extension-service.test.ts` (19) | OK |
| `extensions-page/extension-services/models.ts` | none | acceptable (pure types/schemas) |
| `prompt-page/prompt-service.ts` | `prompt-service.test.ts` (8) | OK |
| `prompt-page/prompt-store.ts` (Valtio store + `FormDataToPromptModel`) | **MISSING** | FAIL — non-trivial logic |
| `prompt-page/models.ts` | none | acceptable (pure types) |

**Missing service-file companions: 2** — `persona-documents-service.ts` (critical), `prompt-store.ts` (medium; ~50 lines of non-trivial logic incl. FormData mapping & action dispatch).

Implementer's "13 test files" claim is false: only 6 service test files exist. The 7 missing files would presumably be the two above plus models / a 5th persona test that does not exist on disk.

---

## 2. Coverage

Vitest+v8 reports 0% in this repo for all `features/**` files even though tests pass and clearly exercise code — the v8 coverage instrumentation isn't picking up the `"use server"` modules under our setup. The text-coverage table below is uninformative as-is, but on inspection of the test bodies:

- `access-group-service.ts`: ~all branches covered (both success paths, session-expired, 401, generic error, isLocalDevUser, AccessGroupById success + 404). **PASS.**
- `agent-favorite-service.ts`: GetUserFavoriteAgents (OK + throw), ToggleFavoriteAgent (add, remove, doc-id shape). **PASS.**
- `persona-ci-documents-service.ts`: `DownloadSharePointFile` and `DownloadCIDocumentsFromSharePoint` are NOT directly tested. **GAP.**
- `persona-service.ts`: 20 tests covering CreatePersona / FindPersonaByID / EnsurePersonaOperation / DeletePersona / UpsertPersona / FindAllPersonaForCurrentUser / CreatePersonaChat positive+negative+admin paths + access-group filter + CI-document file attachment. **PASS.**
- `extension-service.ts`: 19 tests covering Create / Update / Delete / FindByID / EnsureExtensionOperation / FindSecureHeaderValue / list-and-ids / chat thread + KV interaction + admin gating + duplicate fn name + JSON validation. **PASS.**
- `prompt-service.ts`: 8 tests; gap = `FindPromptByID` OK path is not tested (only NOT_FOUND); `UpsertPrompt` validation-error and Cosmos-throw branches not tested. **MINOR GAP.**
- `persona-documents-service.ts`: **0% — no tests exist.** This file holds:
  - `DocumentDetails` (Graph `/$batch` orchestration, size-limit, env-limit branches)
  - `UpdateOrAddPersonaDocuments` (limit, remove, add, rollback-on-index-failure)
  - `PersonaDocumentById` (NOT_FOUND vs OK)
  - `DeletePersonaDocumentsByPersonaId` (contains the confirmed fire-and-forget bug)
  - `AuthorizedDocuments` / `AllowedPersonaDocumentIds` (Graph batch authorization, swallowed errors)
  - `AddOrUpdatePersonaDocuments` (Zod validation, upsert loop, error)
  - `IndexNewPersonaDocuments` (chunking, partial-failure rollback)
  - `SharePointFileToText`, `DownloadSharePointFile`, text-vs-binary extraction
  All untested. **MAJOR GAP.**
- `prompt-store.ts`: 0% — `FormDataToPromptModel`, `addOrUpdatePrompt` dispatch logic untested.

---

## 3. Blindspots in delivered tests

1. **`persona-ci-documents-service.ts` — partition-key bug not pinned by a test.**
   The test for `DeletePersonaCIDocumentById` (test 004) accepts the spy call without asserting the partition-key argument. The bug at line 102 (`item(id, id).delete()` instead of `item(id, userId)`) is not detected. A test should `expect(historyContainer.item).toHaveBeenCalledWith(id, USER_HASH)` and would currently fail — exactly the kind of regression guard required.

2. **`persona-ci-documents-service.ts` — `DownloadSharePointFile` & `DownloadCIDocumentsFromSharePoint` untested.** Both are exported, both wrap Graph calls with logging and error handling. No test exercises empty-array, all-fail, partial-success, or Graph-throw branches.

3. **`prompt-service.test.ts` — missing branches.**
   - No test for `FindPromptByID` OK path (only NOT_FOUND).
   - No test for `UpsertPrompt` returning `validationResponse` ERROR.
   - No test for `DeletePrompt` UNAUTHORIZED (non-owner non-admin) path.
   - No test for the SQL-scoping case where `isPublished=true` lets a different user see the prompt.

4. **`persona-service.test.ts` — duplicate accessGroup check in `CreatePersonaChat` not isolated.**
   Test 013 verifies UNAUTHORIZED, but `FindPersonaByID` already returns UNAUTHORIZED first (line 92–101 in source). The inner re-check at lines 423–435 of `persona-service.ts` is dead code; no test demonstrates this. A test that mocks `FindPersonaByID` to return OK with an `accessGroup`, then verifies the inner check fires, would surface the duplication.

5. **`extension-service.test.ts` — `EnsureExtensionOperation` NOT_FOUND propagation untested.** Test 011 covers UNAUTHORIZED for cross-user; there is no positive test for the "extension doesn't exist at all" path through `EnsureExtensionOperation` (which would surface as UNAUTHORIZED since the function maps both not-found and not-owner to the same response — itself a slight smell worth pinning).

6. **`agent-favorite-service.test.ts` — no test for upsert ERROR branch** (catch block on line 73). Add a `historyContainer.items.upsert.mockRejectedValueOnce` test.

7. **`access-group-service.test.ts` — `AccessGroupById` success path uses local-dev-user shortcut behavior:** the local-dev path (lines 110–119) is not tested; nor is the `!user.token` branch for `AccessGroupById`.

---

## 4. Nonsense / Weak tests

None outright nonsense. Two **weak** assertions worth noting:

- `persona-ci-documents-service.test.ts` test 004 (`DeletePersonaCIDocumentById`): asserts `deleteSpy` was called but does not assert the partition-key passed to `item()`. This is the test that would catch the security bug; it does not.
- `persona-service.test.ts` test 015 (CI partial failure): comment admits the assertion is weak ("Our UploadFileForCodeInterpreter mock always returns {name:'file.csv'}, so check id instead"). Useful behavior is being exercised but the assertion is observational rather than load-bearing.

---

## 5. Security / Bug findings (implementer's claims verified)

| # | Bug | Source location | Verified | Notes |
|---|---|---|---|---|
| 1 | `DeletePersonaCIDocumentById` uses `item(id, id).delete()` — wrong partition key | `persona-ci-documents-service.ts:102` | **CONFIRMED** | All other CRUD in this module uses `userHashedId()` as partition key (e.g., line 160). With Cosmos partition key = `/userId`, this call will fail at runtime against the live container and never deletes the doc. Cross-user delete is therefore impossible *by accident*, but the legitimate delete is also broken. Should be `item(id, userId)`. |
| 2 | `DeletePersonaDocumentsByPersonaId` fire-and-forget | `persona-documents-service.ts:325-327` | **CONFIRMED** | `for (const id of …) { DeletePersonaDocumentById(id); }` — no `await`. Caller `DeletePersona` (persona-service.ts:225) awaits `DeletePersonaDocumentsByPersonaId` but the inner deletes race the parent persona delete. Documents may be orphaned in Cosmos. Trivial fix: `await Promise.all(...map(DeletePersonaDocumentById))`. |
| 3 | Duplicate accessGroup check in `CreatePersonaChat` | `persona-service.ts:423-435` (vs. `FindPersonaByID` line 90-102) | **CONFIRMED** | `FindPersonaByID` already returns UNAUTHORIZED when access-group check fails; the outer re-check at lines 423-435 is unreachable. Not a security risk, but dead code that misleads readers. |
| 4 | `EnsurePersonaOperation` returns UNAUTHORIZED for cross-user (vs. ChatThread's NOT_FOUND) | `persona-service.ts:208-215` | **CONFIRMED** (asymmetric, intentional per catalog) | Pinned by `persona-service.test.ts` test 009. |
| 5 | `EnsureExtensionOperation` returns UNAUTHORIZED for cross-user | `extension-service.ts:176-184` | **CONFIRMED** | Pinned by `extension-service.test.ts` test 011. |

Additional bug found during this review (not claimed by implementer):

- **`extension-service.ts:230-232`** — `extensionResponse.response.headers.map(async (h) => { await vault.beginDeleteSecret(h.id); });` returns an array of unawaited promises. `DeleteExtension` proceeds to delete the Cosmos doc before KV deletions finish, and any KV failure is silently dropped. Should be `await Promise.all(headers.map(...))`. **Not pinned by any test.**

---

## 6. Required corrections (top 5)

1. **Add `persona-documents-service.test.ts`** covering: `DocumentDetails` (empty, over-limit, mixed sizeToBig/successful/unsuccessful), `UpdateOrAddPersonaDocuments` (limit, removal, indexing-failure rollback), `PersonaDocumentById` (OK + NOT_FOUND + Cosmos-throw), `DeletePersonaDocumentsByPersonaId` (with a **regression test that asserts each `DeletePersonaDocumentById` call resolved before the function returns** — pin bug #2), `AuthorizedDocuments`, `AllowedPersonaDocumentIds`, `IsTextFile` via `IndexNewPersonaDocuments` fan-out, and the Zod validation path.
2. **Add a regression test for bug #1** in `persona-ci-documents-service.test.ts`: assert `historyContainer.item` was called with `(id, USER_HASH)` not `(id, id)`. Test will currently fail (red), then pass after fix.
3. **Add `prompt-store.test.ts`** covering `FormDataToPromptModel` field mapping (including `isPublished` checkbox-on/checkbox-missing branches), `addOrUpdatePrompt` create-vs-upsert routing, and the ERROR path that writes `promptStore.errors`.
4. **Fill prompt-service branches**: add tests for `FindPromptByID` OK, `UpsertPrompt` validation ERROR, `DeletePrompt` UNAUTHORIZED, and the cross-user "published prompt visible" SQL behavior.
5. **Add `DeleteExtension` KV-await regression test** (bug #6 above) — spy `beginDeleteSecret` to return a delayed promise and assert all KV deletions resolved before `HistoryContainer().item.delete` is called. Currently red, then green after fixing `extension-service.ts:230-232`.

Lesser corrections (do after the five above):

- Strengthen `DownloadSharePointFile` / `DownloadCIDocumentsFromSharePoint` coverage in the CI-documents test.
- Add `AccessGroupById` local-dev and missing-token branches.
- Add `ToggleFavoriteAgent` upsert-throw ERROR test.

---

## 7. Coverage acceptance

The text coverage report yields 0% across the board due to a v8/v8-coverage interaction with `"use server"` modules; this means I cannot mechanically certify the ≥95% branch / 100% stmt+func bar. Source-walk inspection shows the *delivered* test files are at-or-near full feature coverage for their target modules except for the small gaps in §3. However, with `persona-documents-service.ts` and `prompt-store.ts` at literal 0% (no tests at all), the cluster as a whole is well below 100%.

---

## 8. Summary numbers

- Source service files in scope: 7 (excluding 3 `models.ts` pure-type modules)
- Test files delivered for service files: 6
- **Missing test companions: 2** (`persona-documents-service.ts` — critical; `prompt-store.ts` — medium)
- Tests passing: 67 service-tests across 6 files (not 97/13 as implementer reported)
- Nonsense tests: 0
- Weak assertions: 2 (both noted in §4)
- Security/bug claims verified: 5/5 ; +1 additional bug found (KV unawaited in `DeleteExtension`)
