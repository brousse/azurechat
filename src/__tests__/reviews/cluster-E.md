# Cluster E Review — Coverage / Blindspot Reviewer (Opus)

Scope: React component (`.tsx`) files under
`features/chat-page` (excl. `chat-services`), `features/persona-page` (excl. `persona-services`),
`features/prompt-page` (excl. `prompt-service.ts`/`prompt-store.ts`), `features/extensions-page` (excl. `extension-services`),
`features/reporting-page`, `features/main-menu`, `features/chat-home-page`, `features/auth-page/login.tsx`.

Tests run (Cluster E only, 20 files): **82/82 passing.** Coverage gathered with `--coverage.include='features/**/*.tsx'`.

## Verdict: FAIL

**60 of 78** in-scope `.tsx` files have **no test companion at all** (0% stmt/branch/func/lines). The implementer covered 18 files (well — 9 at 100%, 9 partial) but silently skipped roughly three-quarters of the surface. Several high-impact, user-visible components are missing: `chat-page.tsx`, `chat-store.tsx`, `message-content.tsx`, `extension-page.tsx`, `persona-page.tsx`, `prompt-page.tsx`, `reporting-page.tsx`, `reporting-chat-page.tsx`, `agent-list.tsx`, `persona-card.tsx`, `prompts.tsx`, `prompt-card-context-menu.tsx`, `chat-context-menu.tsx`, `chat-menu-item.tsx`, `chat-group.tsx`, `new-chat.tsx`, `temporary-chat.tsx`, `file-chips.tsx`, `code-interpreter-file-input.tsx`, `tool-call-history-sidebar.tsx`, `tool-call-history-dialog.tsx`, `citation-action.tsx`, `chat-image-display.tsx`, `chat-header.tsx`, `chat-reset.tsx`, `document-detail.tsx`, `extension-detail.tsx`, `persona-detail.tsx`, `token-usage-display.tsx`, `prompt-slider.tsx`, plus all of `persona-documents/*`, `persona-access-group/*`, `extension-hero/*`, `add-extension/{add-function,endpoint-header,error-messages}.tsx`, the entire `reporting-page` (4 files), `menu-tray*`, `menu-link`, `menu-store`, `prompt-hero`, `persona-hero`, `persona-view`, `persona-visibility-info`, `start-new-persona-chat`, `start-new-extension-chat`, `copy-to-clipboard-button`, `extension-card`. None of these were documented as "pure passthrough."

No nonsense tests were found; quality of the delivered 82 is generally good and they pin **current** behavior on the two flagged a11y bugs (`UserProfile` does not assert visible name in trigger; `ContextWindowIndicator` asserts the current `toFixed(0)` aria-label). Two existing tests have **fragile selectors** and one missing-coverage gap is a real branch.

---

## Step 1 — Component-vs-test inventory

Total in-scope `.tsx`: **78.** Test companions delivered: **18 component test files** (+ 2 hook/util-adjacent files, total 20).

### Component coverage table (covered files)

| Component | stmt % | branch % | func % | lines % | Bar met? |
|---|---|---|---|---|---|
| `auth-page/login.tsx` | 100 | 100 | 100 | 100 | YES |
| `chat-home-page/changelog.tsx` | 72 | 64 | 100 | 72 | **NO** (stmt+branch) |
| `chat-home-page/chat-home.tsx` | 66 | 50 | 43 | 66 | **NO** |
| `chat-home-page/news-article.tsx` | 100 | 100 | 100 | 100 | YES |
| `chat-page/chat-header/context-window-indicator.tsx` | 95 | 75 | 100 | 95 | **NO** (stmt<100, branch<95) |
| `chat-page/chat-header/model-selector.tsx` | 96 | 79 | 100 | 96 | **NO** (stmt<100, branch<95) |
| `chat-page/chat-input/reasoning-effort-selector.tsx` | 100 | 100 | 100 | 100 | YES |
| `chat-page/chat-input/tool-toggles.tsx` | 100 | 43 | 40 | 100 | **NO** (branch+func) |
| `chat-page/chat-menu/chat-menu.tsx` | 100 | 100 | 100 | 100 | YES |
| `extensions-page/add-extension/add-new-extension.tsx` | 98 | 100 | 75 | 98 | **NO** (stmt<100, func<100) |
| `extensions-page/extension-card/extension-context-menu.tsx` | 69 | 67 | 40 | 69 | **NO** |
| `main-menu/main-menu.tsx` | 100 | 100 | 100 | 100 | YES |
| `main-menu/theme-toggle.tsx` | 100 | 100 | 100 | 100 | YES |
| `main-menu/user-profile.tsx` | 94 | 75 | 50 | 94 | **NO** |
| `main-menu/user-usage.tsx` | 56 | 65 | 83 | 56 | **NO** |
| `persona-page/add-new-persona.tsx` | 83 | 47 | 40 | 83 | **NO** |
| `persona-page/persona-card/favorite-agent-button.tsx` | 100 | 100 | 100 | 100 | YES |
| `persona-page/persona-card/persona-card-context-menu.tsx` | 65 | 67 | 40 | 65 | **NO** |
| `prompt-page/add-new-prompt.tsx` | 91 | 67 | 75 | 91 | **NO** |
| `prompt-page/prompt-card.tsx` | 100 | 100 | 100 | 100 | YES |

9 files at 100%/100%/100%/100%. 9 partial. 60 at 0%.

---

## Step 2 — Missing component test files (the 60)

Grouped by feature area, only "real" UI files (everything reachable from a user click is listed; pure type files / re-exports are not in scope and there are none here).

### chat-page (24 missing)
**High-impact user-flow:** `chat-page.tsx`, `chat-store.tsx` (Valtio store with `loading`, `submitChat`, `updateChat`, etc. — drives the entire chat surface), `message-content.tsx` (renders all assistant/user messages with markdown, citations, tool calls), `tool-call-history-sidebar.tsx`, `tool-call-history-dialog.tsx`, `citation-action.tsx` (renders citation chips that open document detail), `chat-image-display.tsx`.
**Chat header (live UI):** `chat-header.tsx` (composes the others), `chat-reset.tsx` (the "new chat" button — directly mutates server-side thread), `document-detail.tsx`, `extension-detail.tsx`, `persona-detail.tsx`, `token-usage-display.tsx`.
**Chat menu (sidebar):** `chat-context-menu.tsx`, `chat-group.tsx`, `chat-menu-header.tsx`, `chat-menu-item.tsx`, `new-chat.tsx`, `temporary-chat.tsx`.
**Chat input:** `code-interpreter-file-input.tsx`, `file-chips.tsx`, `prompt/prompt-slider.tsx`.

### persona-page (14 missing)
`persona-page.tsx`, `agent-list.tsx`, `persona-access-group/persona-access-group-selector.tsx`, `persona-access-group/persona-access-group.tsx`, `persona-card/copy-to-clipboard-button.tsx`, `persona-card/persona-card.tsx`, `persona-card/persona-view.tsx`, `persona-card/persona-visibility-info.tsx`, `persona-card/start-new-persona-chat.tsx`, `persona-documents/code-interpreter-documents.tsx`, `persona-documents/code-interpreter-file-picker.tsx`, `persona-documents/persona-documents.tsx`, `persona-documents/sharepoint-file-picker.tsx`, `persona-hero/persona-hero.tsx`.

### prompt-page (4 missing)
`prompt-card-context-menu.tsx`, `prompt-page.tsx`, `prompts.tsx`, `prompt-hero/prompt-hero.tsx`.

### extensions-page (9 missing)
`add-extension/add-function.tsx`, `add-extension/endpoint-header.tsx`, `add-extension/error-messages.tsx`, `extension-card/extension-card.tsx`, `extension-card/start-new-extension-chat.tsx`, `extension-hero/ai-search-issues.tsx`, `extension-hero/bing-search.tsx`, `extension-hero/extension-hero.tsx`, `extension-hero/new-extension.tsx`, `extension-page.tsx`.

### reporting-page (4 missing — entire feature)
`reporting-chat-page.tsx`, `reporting-hero.tsx`, `reporting-page.tsx`, `table-row.tsx`. The admin reporting surface has **zero** UI tests.

### main-menu (4 missing)
`menu-link.tsx`, `menu-store.tsx`, `menu-tray.tsx`, `menu-tray-toggle.tsx`.

### chat-home-page
All three present (`changelog`, `chat-home`, `news-article`) — but `chat-home.tsx` is at 66/50/43 (no test exercises favourite-toggle path beyond marker-presence, no test for the news/changelog presence-vs-absence branches, no test for `extensions` rendering).

### auth-page
`login.tsx` — done (100%). (`error/page.tsx` etc. are app-router pages, out of scope per task statement.)

---

## Step 3 — Blindspots inside the delivered tests

### Real branch/function gaps in covered files

1. **`tool-toggles.tsx` (branch 43, func 40):** test asserts only `webSearchEnabled=true→false` for *one* of the four toggles; the other three (image generation, company content, code interpreter) are clicked only at default state. Branch `image/company/code → false` is never traversed. Also: the `disabled when loading==='loading'` test doesn't verify each toggle independently goes back to enabled when loading transitions away. The button-by-index selection (`buttons[0]`) is also a robustness problem — see "fragile selectors" below.
2. **`extension-context-menu.tsx` (stmt 69, branch 67, func 40):** the menu is opened but **the actual Delete click path is never tested.** `DeleteExtension`, `RevalidateCache`, the toast/store-update flow — all uncovered. Same shape for `persona-card-context-menu.tsx` (stmt 65). These are the destructive actions that most need tests.
3. **`persona-card-context-menu.test.tsx` line 47** uses `screen.getByRole("button")` to find a unique trigger, but after the menu opens there are multiple buttons in the DOM — works by accident because the test only calls it before opening. The same pattern in `extension-context-menu.test.tsx` is fine only because the test orders the click before the assertion. Brittle. Use `screen.getByRole("button", { name: /open menu/i })` / aria-label.
4. **`add-new-persona.tsx` (branch 47, func 40):** the test renders the sheet and confirms the Publish-switch admin/non-admin branch, but the Submit-button path (form-action `addOrUpdatePersona`), the Documents/Extensions sub-panels and the "Access Groups" panel are never exercised. The component is the main authoring surface — needs at minimum a happy-path submit test and a validation-failure test.
5. **`user-usage.tsx` (stmt 56, lines 56):** only the dropdown trigger is asserted; nothing checks the inner usage bars or the formatter output.
6. **`changelog.tsx` (stmt 72, branch 64):** the empty-list and link-click branches are not covered.
7. **`chat-home.tsx` (func 43):** `AgentList` and `NewsArticle` are mocked away so the real composition (filtering admin-only, "extensions" tab) is invisible — the tests measure stubs.
8. **`context-window-indicator.tsx` (branch 75):** the color thresholds (`>80 red`, `>50 yellow`, default muted) are uncovered. The test pins the `toFixed(0)` aria-label (current behavior, correct per implementer's bug flag) but does not assert the value-prefix label visible in the dropdown content (`toFixed(1)`); add a positive test that opens the dropdown and reads "47.6% used".
9. **`user-profile.tsx` (branch 75, func 50):** the dropdown is opened by querying `[data-state]`, but the test does not exercise the `signOut` click path, and does not cover the `profilePicture` branch (always returns `null` in mock). Add a render with `useProfilePicture` returning a URL to hit the `AvatarImage` branch and the `alt={session?.user?.name!}` non-null assertion (latent bug if name is undefined).

### Fragile selectors / mock-coupled assertions

- `tool-toggles.test.tsx` indexes into `screen.getAllByRole("button")` — if the layout adds another `<button>` (e.g. a future "model selector") the test will silently mis-target. Use `aria-label`s on the buttons themselves and `getByRole("button", { name: /web search/i })`.
- `user-profile.test.tsx` uses `container.firstChild` and `container.querySelector("[data-state]")` — DOM-shape coupling, not behavior. Trigger should expose an accessible name.
- Several tests fire on mock-coupled callbacks (`mockToggleWebSearch.toHaveBeenCalledWith(true)`). Per the cluster brief, assertions should be on **observable behavior**. Since `tool-toggles` is a controlled component, the right assertion is to also check the `aria-pressed` / icon state after click via the store re-render. Acceptable as-is but should be paired with a state-driven assertion.

### Two flagged a11y/precision bugs — current behavior is pinned correctly

- **UserProfile:** the implementer flagged that the trigger has no accessible name (just an `<Avatar><User /></Avatar>` with no `aria-label`). The test asserts only `container.firstChild` truthy and `[data-state]` click — i.e. **does not assert a name**, which correctly pins current behavior. OK.
- **ContextWindowIndicator:** flagged for `aria-label` using `.toFixed(0)` while the dropdown body uses `.toFixed(1)`. The test reads `button.getAttribute("aria-label")` and checks it contains the `.toFixed(0)` value — correctly pins current behavior. OK.

---

## Nonsense tests

None. The 82 delivered tests are all meaningful. The closest to "nonsense" is `chat-home.test.tsx` test 001 ("renders both persona names") where `AgentList` is fully mocked — but it still asserts the parent passes the right `personas` prop down, so it's fine.

---

## Required corrections (top 5)

1. **Add component test files for the missing 60.** Prioritise (in order of user impact): `chat-page.tsx`, `chat-store.tsx`, `message-content.tsx`, `chat-header.tsx`+`chat-reset.tsx`+`token-usage-display.tsx`, `reporting-page.tsx`+`reporting-chat-page.tsx`+`table-row.tsx` (entire admin reporting surface), `persona-page.tsx`+`agent-list.tsx`+`persona-card.tsx`, `prompt-page.tsx`+`prompts.tsx`+`prompt-card-context-menu.tsx`, `extension-page.tsx`+`extension-card.tsx`+`extension-hero/*`, `persona-access-group/*`, `persona-documents/*` (esp. `sharepoint-file-picker.tsx` — talks to Graph).
2. **Cover the destructive click paths in the two context menus.** `extension-context-menu` and `persona-card-context-menu` must each have a test that (a) opens the menu, (b) clicks Delete, (c) asserts `DeleteExtension`/`DeletePersona` is called with the correct id, and (d) asserts a toast/store-update side effect — not just the menu items being present.
3. **`tool-toggles`: add per-toggle on→off tests for all four tools** (image generation, company content, code interpreter currently missing the `true→false` flip), and select buttons by accessible name rather than array index.
4. **`add-new-persona`: cover the submit path** (server action invoked with the form payload), at least one validation-failure case, and the Documents / Extensions / AccessGroups sub-panels (or document them as "rendered via sub-component, tested separately" once those test files exist).
5. **`context-window-indicator`: cover the three color-threshold branches** (>80, >50, ≤50) and the dropdown-content `.toFixed(1)` formatter. The branch% will move from 75 → ≥95.

Plus the smaller items: cover `user-usage` inner bars, `user-profile` profile-picture + signOut paths, `chat-home` non-empty news/extensions branches, `changelog` empty-state, and replace fragile `[data-state]` / `buttons[0]` selectors with accessible-name queries.

---

## Verdict criteria recap

- Every UI component in scope has a `.test.tsx` companion OR is documented as a pure passthrough: **FAIL — 60 missing, none documented.**
- ≥100% stmt/func, ≥95% branch on covered components: **FAIL — only 9/18 covered files meet the bar.**
- No nonsense tests: **PASS.**

Overall: **FAIL.** The delivered 20 files / 82 tests are high quality where they exist, but the cluster as a whole is roughly one-quarter complete.
