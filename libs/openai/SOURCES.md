# Sources: openai ledger

Researched 2026-10-26. npm `latest` = **openai 7.43.0** (published 2026-10-22); `engines.node >=22`.

Abbreviations:
- TD  = the `openai@7.43.0` package itself: its `.d.ts` files (`@deprecated` tags, `resources/`, `lib/`, `client.d.ts`) and its packaged `CHANGELOG.md`. Fetched from the npm registry (`npm pack openai@7.43.0`).
- CL  = openai-node CHANGELOG (packaged copy in TD; upstream https://github.com/openai/openai-node/blob/master/CHANGELOG.md)
- MIG = https://github.com/openai/openai-node/blob/master/MIGRATION.md (read via raw.githubusercontent.com)
- RM  = https://github.com/openai/openai-node/blob/master/README.md
- D217 = https://github.com/openai/openai-node/discussions/217 (the official v3 to v4 guide)

| ID | Change | Source |
|---|---|---|
| O1 | v3 `Configuration` + `OpenAIApi` replaced by `import OpenAI from "openai"` and `new OpenAI({ apiKey })` | D217 ("Configuration" → `import OpenAI from 'openai'`; "OpenAIApi" → `new OpenAI({`) |
| O2 | v3 `openai.createChatCompletion` / `createCompletion` → `chat.completions.create` / `completions.create` (the ban names only the two v3 methods; the message points to Responses) | D217 |
| O3 | v4+ responses are not wrapped in `.data`; `chatCompletion.data.choices` → `chatCompletion.choices` | D217 |
| O4 | Assistants API deprecated in favour of the Responses API | TD: `@deprecated The Assistants API is deprecated in favor of the Responses API` on `resources/beta/threads/*.d.ts`, `resources/beta/threads/runs/*.d.ts`, `resources/beta/assistants.d.ts`; CL 6.17.0 "mark assistants as deprecated"; RM names the Responses API as "the primary API" |
| O5 | `client.beta.chat` removed; `beta.chat.completions.parse/stream/runTools` move to `chat.completions` | MIG "Beta namespace" ("`beta.chat` removed"); TD: `resources/beta/` has no `chat` directory and `chat.completions.parse` / `stream` / `runTools` are on `resources/chat/completions/completions.d.ts` |
| O6 | Beta Realtime API deprecated; Realtime is GA | TD: `@deprecated Realtime has now launched and is generally available. The old beta API is now deprecated.` on `resources/beta/realtime/realtime.d.ts` |
| O7 | Chat Completions `function_call` deprecated in favour of `tool_choice` | TD: `@deprecated Deprecated in favor of \`tool_choice\`.` on `function_call` in `resources/chat/completions/completions.d.ts` |
| O8 | Chat Completions `functions` deprecated in favour of `tools` | TD: `@deprecated Deprecated in favor of \`tools\`.` on `functions` (same file); `ChatCompletionCreateParams.Function` is `@deprecated` |
| O9 | `role: "function"` message (`ChatCompletionFunctionMessageParam`) is deprecated; reply to tool calls with `role: "tool"` | TD: `@deprecated` on `ChatCompletionFunctionMessageParam` (same file); `ChatCompletionToolMessageParam` is the current form |
| O10 | Chat Completions `max_tokens` deprecated in favour of `max_completion_tokens`; not compatible with o-series | TD: `@deprecated ... This value is now deprecated in favor of \`max_completion_tokens\`, and is not compatible with o-series models` (same file). Responses uses `max_output_tokens` (TD `resources/responses/responses.d.ts`) |
| O11 | `runFunctions()` removed; use `chat.completions.runTools()` | CL 5.0.0 "remove deprecated runFunctions method"; MIG "`runFunctions()` removed"; TD: no `runFunctions` anywhere in 7.43.0 |
| O12 | `OpenAI.fileFromPath()` removed; pass `fs.createReadStream(path)` | MIG "`OpenAI.fileFromPath()` removed"; TD: no `fileFromPath` in the 7.43.0 declarations |
| O13 | HTTP `del` methods renamed to `delete` (`client.files.del` → `client.files.delete`) | MIG "HTTP `del` methods renamed to `delete`"; TD: resources declare `delete(...)` and no `del(...)` |
| O14 | Sora video API deprecated; scheduled to shut down 2026-09-24 (already past on 2026-10-26) | TD: `@deprecated The Sora API is scheduled to permanently shut down on September 24, 2026.` on `resources/videos.d.ts`; CL 7.5.0 "deprecate Sora video APIs" |
| O15 | `httpAgent` removed from the client; use `fetchOptions` (e.g. undici `ProxyAgent` as `dispatcher`) | MIG "`httpAgent` removed. Use `fetchOptions` instead"; TD: `client.d.ts` documents `fetchOptions`, no `httpAgent` |
| O16 | `runTools` events and methods renamed: `functionCall` → `functionToolCall`, `functionCallResult` → `functionToolCallResult`, `finalFunctionCall` → `finalFunctionToolCall`, `finalFunctionCallResult` → `finalFunctionToolCallResult` | MIG "`runTools()` events and methods"; TD `lib/AbstractChatCompletionRunner.d.ts` declares only the new names |

Preferences (`~`):
| ID | Source |
|---|---|
| P1 | RM: "The primary API for interacting with OpenAI models" is Responses; "Chat Completions ... the previous standard (supported indefinitely)" |
| P2 | RM and TD: `client.chat.completions.parse` (top-level, `resources/chat/completions/completions.d.ts`), `zodResponseFormat` in `helpers/zod.d.ts` |
| P3 | TD `runTools` on `chat/completions` (see O16 and `$runner`) |
| P4 | RM: `new OpenAI()` "apiKey ... can be omitted" when `OPENAI_API_KEY` is set |
| P5 | RM: Chat Completions "supported indefinitely" (also in CL) |

Facts (`=`):
- `version` / `verified` / `node.min`: TD `package.json` (`"version": "7.43.0"`, `"engines": {"node": ">=22.0.0"}`); RM "Node.js 22 is the minimum supported version".
- `client`: RM; TD `client.d.ts`.
- `tools` shapes: TD `ChatCompletionFunctionTool` (`{ type: 'function', function: {...} }`) and Responses `FunctionTool` (flat `name`, `parameters`).
- `structured`: TD `helpers/zod.d.ts` (`zodResponseFormat`), `chat/completions` `parse`.
- `runner`: TD `lib/AbstractChatCompletionRunner.d.ts`; the runner callback for raw arguments takes `(args: string)` and returns a value (TD `lib/RunnableFunction.d.ts`).

Verification:
- `bench/good/*.ts` and every `$` snippet in `openai.myelin` were type-checked with `tsc --strict` (TypeScript 5.9.3, `module: NodeNext`) against `openai@7.43.0` and `zod@4.6.7` (and `@anthropic-ai/sdk` for `mixed-anthropic.ts`). All passed.
- The snippets were not executed against the live API.
- `bench/bad/*` were written from the stale patterns above and are not type-checked (they are meant to be stale).

Left out on purpose:
- **Model retirements** (`text-davinci-*`, `gpt-3.5-turbo-0301`, and similar). The official deprecations page (developers.openai.com/api/docs/deprecations; platform.openai.com/docs/deprecations) was unreachable from the build sandbox (DNS/proxy refused), and third-party trackers disagree on dates. No model ID is banned without an official source. A search summary says the shutdown date is exposed as `shutdown_date` on `GET /v1/models`; that was not verified.
- **Assistants shutdown date (2026-08-26)**: stated by search snippets quoting the deprecations page but not fetched or confirmed, so O4 cites only the SDK `@deprecated` tag and says "deprecated", not "shut down".
- **Legacy module paths** (`openai/streaming`, `openai/error`, `openai/pagination`, `openai/resource`, `openai/uploads`): MIG says they moved under `openai/core/`, but the 7.43.0 `package.json` still exports the root paths, so a ban would be wrong.
- **Positional path-parameter change and the `{}` required-params argument** (MIG): these depend on method arity, which a regex cannot judge reliably.
- **Zod `optional` throwing** with `zodResponseFormat` (MIG): a behaviour change, not a token.
- **`openai.Completion.create` / `ChatCompletion.create`**: a Python-SDK style; the Node SDK has no such method in 7.43.0 and no sourced statement, so it is not banned.
- **`client.completions.create`** (legacy completions): present in TD with no `@deprecated` tag, so not banned.
