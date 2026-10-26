# vitest ledger: sources

Researched 2026-10-26. npm `latest` for `vitest` is **5.0.5** (published 2026-10-15). Prior major 4.1.12 was also checked.

**How these were checked.** `vitest.dev`, `github.com` raw/api and jsDelivr/unpkg were unreachable from the sandbox, so the migration guide and release notes could not be read live. Instead, each rule was checked against the published npm tarballs `vitest@5.0.5` and `vitest@4.1.12` (type definitions and runtime deprecation/throw messages), `@vitest/browser@5.0.5` and `@vitest/browser-playwright@5.0.5`. The URLs below are the ones those packages themselves print in their messages, plus the official guide and config pages. Where a rule rests only on the shipped code, the table says so.

Abbreviations:
- PRJ = https://vitest.dev/guide/projects (quoted by the 5.0.5 runtime error for `test.workspace`)
- MIG4 = https://v4.vitest.dev/guide/migration#pool-rework (quoted by the 5.0.5 runtime deprecation for `poolOptions`)
- PROV = https://vitest.dev/config/browser/provider (quoted by the 5.0.5 runtime provider error)
- BCFG = https://vitest.dev/guide/browser/#configuration (quoted by the 5.0.5 runtime)
- MIGRATE = https://vitest.dev/guide/migration (official migration guide; not read live)
- TYPES = type definitions shipped in `vitest@5.0.5` / `vitest@4.1.12` (`dist/*.d.ts`)
- RT5 = runtime message in `vitest@5.0.5` `dist/` (observed by running it)
- RT4 = runtime message in `vitest@4.1.12` `dist/`

| ID | Rule | Source and evidence |
|---|---|---|
| V1 | `defineWorkspace()` is not exported | TYPES: no `defineWorkspace` in 5.0.5 or 4.1.12 `vitest/config` exports; `defineProject` is exported. Observed: loading a `defineWorkspace` config fails with `defineWorkspace is not a function`. PRJ. |
| V2 | `vitest.workspace` files are not read | RT5/TYPES: no reference to a `vitest.workspace` file name in the 5.0.5 config resolution; projects are declared under `test.projects` (PRJ). Not observed as a load failure; the absence of any loader for the file is the basis. |
| V3 | `test.workspace` option throws | RT5 (observed): "The `test.workspace` option was removed in Vitest 4. Please, migrate to `test.projects` instead. See https://vitest.dev/guide/projects". |
| V4 | `test.poolOptions` removed; keys are top-level | RT5 (observed warning): "`test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options" (MIG4). Top-level `maxWorkers`, `isolate`, `fileParallelism` present in TYPES. |
| V5 | `environmentMatchGlobs` is not an option | TYPES: absent from `vitest@5.0.5` and `vitest@4.1.12` definitions and runtime. Replacement is one `defineProject` per environment (PRJ). The migration guide was not read, so this is the absence basis only. |
| V6 | `browser.provider` takes a factory, not a string | RT5 (in 5.0.5 and 4.1.12 bundles): "The `browser.provider` configuration was changed to accept a factory instead of a string. Add an import of ... from `@vitest/browser-<name>`" (PROV). Observed: `provider: "playwright"` fails at config load. `@vitest/browser-playwright@5.0.5` exports `playwright` (BCFG). |
| V7 | `browser.api`, `browser.isolate`, `browser.fileParallelism` deprecated | RT5: "`test.browser.api` was deprecated in Vitest 5. Use `test.api` instead."; "`browser.isolate` is deprecated. Use the top-level `isolate` option instead."; "`browser.fileParallelism` is deprecated. Use the top-level `fileParallelism` option instead." |
| V8 | `cache.dir` has no effect | RT5 (observed warning): "`cache.dir` is deprecated and has no effect. Use Vite's `cacheDir` instead". |
| V9 | `deps.inline` is not a top-level option | TYPES: `DepsOptions` in 5.0.5 has `optimizer`, `web`, `interopDefault`, `moduleDirectories` and no `inline`. Inlining is `server.deps.inline` (RT5 reads `server.deps.inline`). Checked in type definitions; the top-level form was not run. |
| V10 | `deps.optimizer.web` deprecated | RT5 (observed warning): "`deps.optimizer.web` is deprecated. Use `deps.optimizer.client` instead (or `deps.optimizer.ssr` for `node` and `edge` environments)." |
| V11 | `'basic'` is not a built-in reporter | TYPES: `ReportersMap` in 4.1.12 and 5.0.5 lists `default`, `verbose`, `dot`, `json`, `junit`, `blob`, `agent`, `github-actions`, `hanging-process`, `tap-flat`, `html`; no `basic`. Runtime reporter-lookup error for `'basic'` was not triggered. |
| V12 | `vi.fn<[Args], Return>` form does not type-check | TYPES: `fn<T extends Procedure \| Constructable = Procedure>(impl?: T): Mock<T>` (5.0.5). Observed with tsc: `Expected 0-1 type arguments, but got 2` (TS2558) and `[string]` not assignable to `never`. Correct form: `vi.fn<(...args: A) => R>()`. |
| V13 | Un-awaited async assertions fail | RT5 (observed): "Promise returned by `expect(actual).resolves.toEqual(expected)` was not awaited. This assertion is asynchronous and must be awaited" and the same for `expect.poll(assertion)`. The test fails. |
| V14 | `done()` callbacks throw | RT5 (observed): "done() callback is deprecated, use promise instead". Not present in the 4.1.12 bundle, so this is a 5.x rule. |
| V15 | Options object as 3rd argument of `it`/`test` removed | RT5 (observed): `Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.` |
| V16 | `test.scoped()` deprecated | RT5 (observed warning): "`test.scoped()` is deprecated and will be removed in future versions. Please use `test.override()` instead." |
| V17 | No `jest` global | Observed: `jest.mock` in a Vitest test fails with `ReferenceError: jest is not defined`. No `jest` declaration in `globals.d.ts` of 4.1.12 or 5.0.5. Imports from `@jest/globals` or `jest` are exempted by the `unless`. |
| P1 | Import `defineConfig` / `defineProject` from `vitest/config` | TYPES: both exported from `vitest/config` in 5.0.5. |
| P2 | `clearMocks` defaults to true in 5.x | RT: default config object has `clearMocks: true` in 5.0.5 and `clearMocks: false` in 4.1.12. |
| P3 | `vi.spyOn` for partial mocks, typed `vi.fn` for standalone mocks | TYPES: `spyOn` and `fn` signatures in 5.0.5. Style guidance, not a removal. |
| P4 | Browser locators match exactly by default | RT5: `resolved.browser.locators.exact ??= true` in the 5.0.5 config defaults. |

Snippets: `$projects`, `$pool`, `$browser`, `$deps`, `$async`, `$fn`, `$mock`, `$options`. Each was copied into a scratch project with `vitest@5.0.5`, `@vitest/browser-playwright@5.0.5`, `vite@8.3.5`, and type-checked with `tsc --strict` (exit 0). The good bench tests were run with `vitest run` (8 files, 15 tests passed, 1 todo). The `$browser` config loads; the browser launch itself was not run because the sandbox has no Chromium binary.

Verification of the bench corpus: the stale bad files were run under `vitest@5.0.5` with stub modules. `bad/async-tests.test.ts` fails on V13 and V14, `bad/jest-style.test.ts` fails on V17, `bad/options.test.ts` fails on V15 (and emits V16), `bad/vitest.config.ts` fails on V3, `bad/workspace.ts` fails on V1, `bad/pool-legacy.config.ts` emits the V4, V8, V10 warnings.

Left out on purpose (not verified against a shipped source, or would false-positive on valid old-version code):
- `test.sequential` (named in community write-ups only).
- `coverage.all` and `coverage.ignoreEmptyLines`: no removal version could be pinned from the 4.1.12 or 5.0.5 packages.
- `vi.mock` hoisting rules and "hoisted vi calls must be top-level": only the community summary mentions it, and the 5.0.5 runtime emits no such message.
- `globalSetup` changes, `spyOn` changes, `test.each` / `it.todo` details: no source read.
- Reporter file location under `.vitest/` and the bench API rewrite: community summary only.
- `vitest.init()` (deprecated in favour of `vitest.standalone()`): programmatic API, not a test-file pattern.
- Jest globals in a Jest file with no imports: V17 fires on it (the `unless` only exempts explicit Jest imports). Such files are not Vitest code, so an override is needed if a project mixes both.

Benches and scope: `bench/bad` (9 files) and `bench/good` (7 files) in this folder. `index.json` and `libs/README.md` were not edited, so `myelin detect` does not map this lib yet. Suggested index entry: `"vitest": { "name": "Vitest", "packages": ["vitest", "@vitest/*"] }`.
