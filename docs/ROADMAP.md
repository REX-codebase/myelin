# Roadmap

Ideas, not promises. Order is rough priority.

## Measure it first

- Done in 0.2.0: detection benchmarks (labelled corpus, cross-library sweep, official examples old vs current). See BENCHMARKS.md.

- Collect real outputs from several models across the four conditions in [eval/](../eval/README.md) and publish the numbers, including the cases where a ledger does not help.
- Run the Three.js snippets on real WebGPU hardware and fix whatever breaks; update the example's `status`.

## Format v1.1 (backward compatible)

- Done (unreleased): `when /re/` on a ban, `render brief`, and a unit `context`. See [SPEC](SPEC.md).
- `scope` header key: file globs a ledger applies to.
- Per-rule severity: `error` and `warn`.
- `unless` that applies per match instead of per unit.
- Comment and string stripping before matching, so a banned token in a comment does not fire.
- `include` of another ledger, with shared rule packs.

## Derived ledgers and agent hooks

- Done (unreleased): `myelin derive` and `myelin hook` (Claude Code). See [DERIVE](DERIVE.md).
- Hooks for other agents once their payload formats are verified against the real tools (Cursor, Codex, Gemini CLI). Today they call `myelin lint`.
- A ratchet for existing code: fail only on findings that are new since a recorded baseline, so a derived ledger can gate CI on a codebase that already uses deprecated APIs.
- Derive from places other than `.d.ts`: Python (`warnings.warn(..., DeprecationWarning)`, `typing_extensions.deprecated`), and `deprecated` fields in package manifests.
- Alias-aware matching: a namespace import (`import * as ns`) makes `ns.render(` unambiguous even when `.render(` is not, which would recover rules that are dropped today.
- An MCP server (`myelin mcp`) exposing `gate` and `lint` to any host that speaks MCP, with `lint` taking code as a string so a model can check a draft before writing it.

## Tooling

- Editor syntax highlighting for `.myelin`.
- Done (unreleased): a GitHub Action wrapper (`action.yml`, see [HOSTS](HOSTS.md)).
- Done (unreleased): a watch mode for `lint` (`--watch`).
- Done (unreleased): `myelin fix` prints the fix message and snippet for each failing rule. It is read-only; applying snippets stays with the author.

## Distribution

- Publish to npm once the format has settled.
- ~~A small registry of community ledgers~~ Bundled library ledgers shipped in 0.2.0 (`libs/`). Next: a monthly re-verification pass per library, and community-contributed libs.
- Done: Angular, Astro, Drizzle, Mongoose, Vitest and OpenAI SDK ledgers (0.3.0); Firebase (JS SDK, Admin, Functions) and Blender (bpy) ledgers (0.4.0). Next: Playwright, LangChain.js, Supabase, and a Drizzle v1 ledger once v1 is `latest`. Blender is the first non-JavaScript ledger; detection for Python projects (`requirements.txt`, `pyproject.toml`) is not built yet, so use `myelin lint blender --ext py`.

## Out of scope

- Judging whether code is correct or good. That needs tests, a runtime, or a human.
- Running snippets or any code from a ledger.
