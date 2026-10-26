# ai-sdk ledger: sources

Researched 2026-10-26. Current stable: **ai 7.0.153** (npm `latest`; `ai-v6` = 6.0.315, `ai-v5` = 5.0.281; `@ai-sdk/react` 4.0.157). AI SDK 7 is ESM-only and needs Node 22+.

Sources:
- M7: Migrate AI SDK 6.x to 7.0, https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- M6: Migrate AI SDK 5.x to 6.0, https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
- M5: Migrate AI SDK 4.x to 5.0, https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0
- M4: Migrate AI SDK 3.4 to 4.0, https://ai-sdk.dev/docs/migration-guides/migration-guide-4-0
- QS: Next.js App Router quickstart (v7 route + page), https://ai-sdk.dev/docs/getting-started/nextjs-app-router
- Version: https://registry.npmjs.org/ai (dist-tags); type declarations of ai@7.0.153 (`@deprecated` tags checked in dist/index.d.ts)

| ID | Change | Source |
|---|---|---|
| A1 | `maxTokens` renamed to `maxOutputTokens` | M5 "Maximum Output Tokens" |
| A2 | tool `parameters` renamed to `inputSchema` | M5 "Tool Definition Changes (parameters → inputSchema)" |
| A3 | data stream protocol replaced by UI message streams: `toDataStreamResponse`/`pipeDataStreamToResponse` → UI message stream helpers; `createDataStreamResponse`, `writeData`/`writeMessageAnnotation` removed | M5 "Data Stream Response Helper Functions Renamed", "Custom Data Streaming: writeMessageAnnotation/writeData Removed" |
| A4 | `StreamingTextResponse`, `AIStream` and related exports (`OpenAIStream`, `streamToResponse`) removed in 4.0; `StreamData` removed in 5.0; `LangChainAdapter` moved to `@ai-sdk/langchain` | M4 "Removed 2.x StreamingTextResponse", "Removed 2.x AIStream"; M5 "Stream Data Removal", "LangChain Adapter Moved to @ai-sdk/langchain" |
| A5 | `ai/react` removed (use `@ai-sdk/react`); `ai/svelte` etc. moved in 4.0; `ai/rsc` → `@ai-sdk/rsc` | M5 "React UI Hooks Moved to @ai-sdk/react", "@ai-sdk/rsc Package Extraction"; M4 |
| A6 | `maxSteps` replaced by `stopWhen`; removed from useChat | M5 "Step Control: maxSteps → stopWhen", "maxSteps Removal" |
| A7 | `CoreMessage` → `ModelMessage` (v5), removed with `convertToCoreMessages` in v6 | M5 "CoreMessage → ModelMessage"; M6 "CoreMessage Removal" |
| A8 | useChat no longer manages input (`input`, `handleInputChange`, `handleSubmit`); `append` → `sendMessage`; `reload` → `regenerate`; `isLoading` → `status` | M5 "Removed Managed Input State", "Message Sending: append → sendMessage", "Message Regeneration: reload → regenerate", "Loading State Changes" |
| A9 | useChat `api`/`headers`/`credentials`/`body` move to `DefaultChatTransport`; `initialMessages` → `messages`; `onResponse`, `sendExtraMessageFields`, `keepLastMessageOnError` removed; `experimental_prepareRequestBody` → `prepareSendMessagesRequest` | M5 "Chat Transport Architecture", "Initial Messages Renamed", "onResponse Removal", "Send Extra Message Fields Default", "Keep Last Message on Error Removal", "Request Body Preparation" |
| A10 | `stepCountIs` → `isStepCount` (v7; d.ts exports `isStepCount as stepCountIs` alias) | M7 "Stop Condition Helper Rename: stepCountIs -> isStepCount" |
| A11 | `generateObject` / `streamObject` deprecated; use `generateText`/`streamText` with `output: Output.object()` | M6 "generateObject and streamObject Deprecation" |
| A12 | `system` → `instructions` (v7; deprecated fallback); Agent `system` → `instructions` in v6 | M7 "system Renamed to instructions"; M6 "Experimental_Agent to ToolLoopAgent Class" |
| A13 | system messages in `prompt`/`messages` rejected by default; `allowSystemInMessages: true` opt-in | M7 "Prompt Messages: System Messages in prompt or messages Are Rejected by Default" |
| A14 | `toUIMessageStreamResponse`, `toUIMessageStream`, `pipeUIMessageStreamToResponse`, `toTextStreamResponse`, `pipeTextStreamToResponse` methods on the streamText result deprecated; use stateless helpers from `'ai'` | M7 "streamText Response Helpers Deprecated — Use Stateless Helpers"; QS route handler |
| A15 | `fullStream` → `stream`; `onStepFinish` → `onStepEnd` | M7 "StreamTextResult.fullStream Renamed to stream", "onStepFinish Renamed to onStepEnd" |
| A16 | experimental_ names promoted/removed: `experimental_telemetry` → `telemetry`, `experimental_output` → `output` (removed), `experimental_activeTools`/`experimental_prepareStep` removed, `experimental_generateImage` removed, `experimental_transcribe`/`experimental_generateSpeech` → stable names, `experimental_customProvider` removed, `experimental_onStart`/`onStepStart`/`experimental_include`/`experimental_onToolCallStart`/`Finish`/`experimental_context`/`experimental_onFinish` renamed (v7); `experimental_attachments` → file parts, `experimental_toToolResultContent` → `toModelOutput`, `experimental_resume` → `resumeStream` (v5); `experimental_StreamData` removed (v4); useChat `experimental_throttle` deprecated for `throttle` (@ai-sdk/react 4 d.ts) | M7 codemod table and sections; M5 "Attachments → File Parts", "Tool Result Content", "Resume Stream Support"; M4 "Removed experimental_StreamData" |
| A17 | all packages ESM-only; `require()` unsupported | M7 "ESM Only — CommonJS Support Removed" |
| A18 | `promptTokens`/`completionTokens` → `inputTokens`/`outputTokens` (v5); `cachedInputTokens`/`reasoningTokens` deprecated v6, removed v7 → `inputTokenDetails.cacheReadTokens`/`outputTokenDetails.reasoningTokens` | M5 "Usage Token Properties"; M6; M7 "cachedInputTokens and reasoningTokens Removed" |
| A19 | `textEmbeddingModel`/`textEmbedding` → `embeddingModel`/`embedding` (v6); `Experimental_Agent` → `ToolLoopAgent` (v6); `isToolOrDynamicToolUIPart` → `isToolUIPart` and `ToolCallOptions` → `ToolExecutionOptions` (removed v7); `getToolOrDynamicToolName` → `getToolName` (v6); `addToolResult` → `addToolOutput` (v5) | M6 "Embedding Model Method Rename", "Experimental_Agent to ToolLoopAgent Class", "Tool UI Part Helper Functions Rename"; M7 "Remove Deprecated isToolOrDynamicToolUIPart", "Remove Deprecated ToolCallOptions Type"; M5 "addToolResult Renamed to addToolOutput" |
| A20 | `convertToModelMessages()` is async | M6 "async convertToModelMessages" |
| P1 | `onFinish` → `onEnd` for generateText/streamText/agents/UI stream helpers; useChat keeps `onFinish` (ChatInit in ai@7 d.ts has no deprecation) | M7 "onFinish Renamed to onEnd" |
| P2 | `usage` sums all steps; `totalUsage` deprecated; `finalStep` | M7 "generateText and streamText usage Now Includes All Steps" |
| P4 | `contextSchema` / `toolsContext` / `runtimeContext` | M7 "Context: experimental_context Became Tool context" |
| P5 | OpenTelemetry moved to `@ai-sdk/otel`, opt-out once registered | M7 "OpenTelemetry Moved to @ai-sdk/otel" |
| P6 | `needsApproval` deprecated for `toolApproval` | M7 "Migrate Deprecated needsApproval to toolApproval" |

Verification: all five snippets and all six good bench files type-check with `tsc --strict` against ai@7.0.153, @ai-sdk/react@4.0.157, @ai-sdk/openai, zod, react and express types. Not executed against a model.

Left out on purpose:
- `onFinish` ban: still valid on `useChat`, so only a preference.
- `providerMetadata` input → `providerOptions` (v5): input and result reads are not distinguishable by regex.
- Banning `message.content` in UI rendering: too generic for a regex; preference P3.
- `@ai-sdk/vue` `Chat` class deprecation (v7): Vue-specific, low frequency.
- `experimental_repairToolCall`: still present in v7 (d.ts also has `repairToolCall`); not banned without a migration-guide statement.
