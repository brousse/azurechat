# Prompt Cache Hit-Rate Analysis — Bühler Chat

**Branch:** `cache-analysis` (based on `main` @ `5d1069b`)
**Models in scope:** GPT-5.5, GPT-5.4, GPT-5.4-mini, GPT-5.3-chat (Azure OpenAI Responses API)
**Scope:** chat completions through `responses.create()` in the conversation pipeline

---

## 1. Background — How Azure OpenAI prompt caching works

Azure OpenAI prompt caching is **automatic** and free on the input side, but only fires when:

| Requirement | Notes |
|---|---|
| Input ≥ 1024 tokens | Cache lookup keyed on the **first 1024 tokens** of the assembled input |
| **Exact** prefix match | Byte-for-byte match against a previously seen prefix |
| Cache extends in 128-token chunks | 1024, 1152, 1280, … |
| TTL ~5–10 min (up to ~1h off-peak) | Stale prefixes evict |
| Per-deployment + per-region | Different deployments do not share caches |
| Cache reported via `usage.input_tokens_details.cached_tokens` | The app already reads this — see §4 |

**Cost upside is large.** All four models price cached input at ~10 % of standard input:

| Model | Input $/M | Cached $/M | Discount |
|---|---:|---:|---:|
| GPT-5.5 | 5.00 | 0.50 | 90 % |
| GPT-5.4 | 2.50 | 0.25 | 90 % |
| GPT-5.4-mini | 0.75 | 0.075 | 90 % |
| GPT-5.3-chat | 1.75 | 0.175 | 90 % |

(Source: `src/features/chat-page/chat-services/models.ts:46-100`.)

A second-turn request in a chat is the easy case — **everything before the new user message is identical and should hit the cache**. Anything that prevents that is a defect against unit economics.

---

## 2. Where the prompt is assembled

Single hot-path file: `src/features/chat-page/chat-services/chat-api/chat-api-response.ts`.

The final `input` array sent to `openaiInstance.responses.create` is built like this (line 324-349):

```
[
  { role: "system",  content: personaMessage },   // ← see §3 for what's in here
  ...history.reverse(),                            // older → newer
  { role: "user",    content: props.message }     // current turn
]
```

History items: `mapOpenAIChatMessages` in `src/features/chat-page/chat-services/utils.ts:5-54` — deterministic, no per-request mutation. ✅

`history.reverse()` of a CosmosDB `ORDER BY createdAt DESC` query (`chat-message-service.ts:13-47`) → stable order. ✅

Continuation requests (after a tool call) re-use the same `requestOptions` + appended `function_call` / `function_call_output` items (`conversation-manager.ts:101-115, 160-172`) — append-only, so prefix is preserved. ✅

The bad news lives in the **system message** and the **tools array**.

---

## 3. Cache-busting patterns found

Ranked by impact. Line numbers are on `cache-analysis @ 5d1069b`.

### 🔴 P0 — `Today's Date` baked into the system prompt
```ts
// chat-api-response.ts:125
currentChatThread.personaMessage = `${CHAT_DEFAULT_SYSTEM_PROMPT} \n\nToday's Date: ${new Date().toLocaleDateString()}${documentHint}\n\n${currentChatThread.personaMessage}`;
```
The static `CHAT_DEFAULT_SYSTEM_PROMPT` (`src/features/theme/theme-config.ts:5-10`) is ~70 tokens — already too short to cache on its own. The date is appended **before** the persona body, so the cache prefix mutates **at every locale-midnight**. Every conversation that crosses midnight re-pays full price for the whole prefix.

Side effect: `toLocaleDateString()` with no args follows the **server process locale**. If pods land in different regions or a node bounces with a different `LANG`, the string format drifts and breaks the cache mid-day too.

### 🔴 P0 — `documentHint` mutates the system message retroactively
```ts
// chat-api-response.ts:113-122
let documentHint = "";
if (hasAnyDocuments) {
  const documentNames = hasChatDocuments
    ? documentsResponse.response.map((doc) => doc.name).join(", ")
    : "";
  …
  documentHint = `\n\nDOCUMENT CONTEXT: The user has attached the following document(s) to this conversation: ${documentNames}. … MANDATORY BEHAVIOR …`;
}
```

Two cache busters bundled here:
1. **Filename list** is interpolated into the system prompt. Adding/removing a file mid-thread (or even renaming) silently invalidates cache for every following turn.
2. **Cosmos query order** for `FindAllChatDocuments` is not pinned. A new doc inserted between turns shifts every subsequent prefix.

### 🔴 P0 — `TOOLS AVAILABLE` list appended to system message
```ts
// chat-api-response.ts:282-293
const preferredToolNames = tools.map((t: any) => t?.name).filter(...);
const toolsHint = `\n\nTOOLS AVAILABLE: ${toolsList}.\nGUIDANCE: …`;
currentChatThread.personaMessage = `${currentChatThread.personaMessage}${toolsHint}`;
```
`tools` is assembled in registration order, which depends on:
- which conditional branches fired (`hasAnyDocuments`, `companyContentEnabled`, `subAgentIds.length > 0`, image gen, web search, code interpreter) — see lines 137-178, 273-278;
- iteration order over `chatThread.extension[]` and per-extension `extension.functions[]` (lines 495-567).

Toggling **any** of those settings rewrites the system prompt. Iteration order is stable today *if* the underlying arrays are stable — but we are putting the tool list inside the cache prefix anyway, which is needless coupling.

### 🟠 P1 — `tools[]` array entries: code interpreter container ID changes
```ts
// chat-api-response.ts:251-260
return {
  type: "code_interpreter",
  container: currentChatThread.codeInterpreterContainerId
};
```
The `tools` array participates in the cache key. The Code Interpreter tool definition embeds the **container id**, which changes whenever:
- attached files change (line 186 invalidates),
- the container expires (line 359 falls through to a new one),
- a new thread starts.

Each container rotation evicts cache for that tool slot. Acceptable cost when files change; not when the container simply expired.

### 🟠 P1 — `buildSubAgentTool` description is global mutable state
```ts
// function-registry.ts:700-704
const agentList = accessibleAgents.map(a => `- "${a.name}" (id: ${a.id}): ${a.description}`).join("\n");
const toolDescription = `Delegate a task … Available sub-agents:\n${agentList}`;
```
`FindAllPersonaForCurrentUser()` is fetched fresh on every turn (line 667). A persona edit anywhere in the tenant changes the description string, which changes the tools array, which busts cache for every active thread that uses sub-agents.

### 🟠 P1 — `store: false` + no `prompt_cache_key`
```ts
// chat-api-response.ts:272
store: false,
```
Two missing optimizations:
1. **`prompt_cache_key`** (Azure OpenAI now accepts it on Responses API) lets you pin a request to the same backend partition — important under load when prompts hash to multiple partitions and the cache is partition-local. Currently never set. With `store: false`, Azure has no implicit affinity hint either.
2. **`store: true` + `previous_response_id`** (the Responses API stateful flow) is the path Azure documents as best-of-class for caching: the server keeps the conversation, so the client only sends the new turn. Choosing `store: false` for privacy/data-residency is a defensible call, but it means we **must** keep the prefix lean (see fixes below).

No `cached_tokens` ever fires for the **first** request in a thread (cold prefix), so a new chat always pays full freight.

### 🟡 P2 — multimodal images in history
```ts
// utils.ts:16-25
mappedMessages.push({
  …
  content: [
    { type: "input_text", text: message.content },
    { type: "input_image", image_url: await getBase64ImageReference(message.multiModalImage || "") },
  ],
});
```
If `getBase64ImageReference` returns a fresh URL/data-URI on each call (e.g. signed URLs with rotating expiry), the cache prefix mutates inside history. Worth checking — out of scope for this pass, but flagged.

### 🟡 P2 — Reasoning encrypted content
`include: ["reasoning.encrypted_content"]` (line 301) plus `reasoningState` re-injection (`utils.ts:46-50`) appends per-turn unique blobs. They are at the **suffix**, after history, so they do not break the prefix — confirmed safe. ✅ Noting only because it inflates input tokens that won't cache.

---

## 4. What's already good

- `cached_tokens` is read and persisted: `openai-responses-stream.ts:319-330, 388-399`. Cost calc separates cached vs non-cached input (`:347-355`). Sub-agent usage rolls up cached tokens too (`:360`).
- A `usageData` SSE event ships `cachedTokens` to the client (`:371-386`), so we can wire a UI gauge without backend changes.
- History order, append-only function call extension, and reasoning suffix placement do not break cache.

The instrumentation is in place. **We can measure the impact of every fix below from day one.**

---

## 5. Recommendations (ranked)

### Tier 1 — pure wins, low risk (do first)

**(a) Move all dynamic text out of the system message.**
Refactor `chat-api-response.ts:113-126, 282-293` so the system message contains only the static `CHAT_DEFAULT_SYSTEM_PROMPT` + the **frozen** `currentChatThread.personaMessage`. Move `Today's Date`, `DOCUMENT CONTEXT`, and `TOOLS AVAILABLE` into a **separate developer/system message appended after history** (or fold the date into the user message header). The first 1024 tokens become invariant for the life of the persona → near-100 % hit rate from turn 2 onward.

Concretely:
```ts
const initialInput = [
  { role: "system", content: CHAT_DEFAULT_SYSTEM_PROMPT + "\n\n" + chatThread.personaMessage },
  ...history,
  { role: "system", content: dynamicContext },   // date + doc hint + tools hint
  { role: "user",   content: props.message },
];
```
The dynamic block lives at the suffix; the prefix stays cacheable across turns and across days.

**(b) Stop including filenames in the system prompt.**
Reduce `documentHint` to a boolean instruction (“documents are attached, you must call `search_documents` first”). The model already learns the names when `search_documents` returns. Cuts a P0 buster.

**(c) Sort the tools array deterministically.**
After assembling `tools` (line 273-278), sort by `name`. Costs nothing, eliminates ordering drift across conditional branches and extension iteration. Apply the same sort when generating the `TOOLS AVAILABLE` string.

**(d) Set `prompt_cache_key`.**
Add `prompt_cache_key: chatThread.id` to `requestOptions` (line 269). Per-thread partition affinity → fewer misses under load, no privacy impact (it's a hash partition hint, not a content key).

### Tier 2 — moderate effort

**(e) Pin sub-agent tool description.**
`buildSubAgentTool` (function-registry.ts:656-733) should snapshot the persona list onto the chat thread at thread-creation time, not resolve it per-turn. A persona edit elsewhere in the tenant should not invalidate every thread's cache.

**(f) Stabilize `Today's Date` formatting.**
If kept in the prompt at all, use `new Date().toISOString().slice(0, 10)` (`2026-04-29`) instead of `toLocaleDateString()` to remove locale drift. Better still: only inject when the model actually needs it (very few queries do).

**(g) Reuse Code Interpreter containers across expirations.**
On `Container is expired` (line 360), the retry rebuilds the tool with `useExistingContainer: false` — fine. But the container-id-in-tool pattern means each rotation costs a cache miss on the tools array. Consider passing only `{ type: "code_interpreter", container: { type: "auto" } }` and letting the API attach the container outside the cached portion (verify against current Responses API spec — Azure's Responses API has been moving on this).

### Tier 3 — strategic

**(h) Evaluate `store: true` + `previous_response_id`.**
For non-temporary, non-document-attached threads, statefully chaining via `previous_response_id` removes the need to resend history at all. Trade-off: data lives in Azure for 30 days. This is a policy/legal decision, not a code one — but the engineering uplift is meaningful (~50-90 % token reduction on long threads, and Azure docs explicitly call it the cache-friendly path).

**(i) Add a cache-hit-rate dashboard.**
The data is already in `IncrementUsage` and `UpdateChatThreadUsage` (`:390-399`). Surface `cached_tokens / input_tokens` per model and per-thread-length bucket. Without a baseline number we cannot defend the spend on the refactor; with one, the savings story writes itself.

### Tier 4 — measurement only (do *with* Tier 1)

**(j) Log first-1024-token hash per request.**
A single `logInfo("Prefix hash", { hash: sha256(prefix.slice(0,1024)).slice(0,12) })` before the API call lets us correlate prefix mutations with cache misses in App Insights. Five minutes of work, makes the rest of the analysis self-verifying.

---

## 6. Expected impact

Rough order-of-magnitude (assuming average thread = 6 turns, 4k context, GPT-5.4):

| State | Cached input fraction | $/M effective | Relative |
|---|---:|---:|---:|
| Today (estimated) | ~10–25 % | ~$2.05 | 1.00× |
| After Tier 1 (a-d) | ~70–85 % | ~$0.80 | **0.39×** |
| Plus Tier 2 (e-g)  | ~80–90 % | ~$0.60 | 0.30× |
| Plus Tier 3 (h)    | ~85–95 % | ~$0.40 | 0.20× |

Numbers are illustrative pending the §5(i) dashboard; the **direction** is robust because every Tier 1 item removes a known prefix mutation that fires on common user actions.

---

## 7. Suggested implementation order

1. Land §5(j) measurement first (1 PR, ~30 lines) — establish the baseline.
2. Land §5(a)+(b)+(c)+(d) together (1 PR, isolated to `chat-api-response.ts` + tests). This is the bulk of the win.
3. Watch the dashboard for 1 week; revisit Tier 2/3.

Each tier is independently shippable and instrumented. Nothing here changes the API contract, persona behaviour, or persisted message format.
