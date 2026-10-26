# Roadmap

Ideas, not promises. Order is rough priority.

## Measure it first

- Done in 0.2.0: detection benchmarks (labelled corpus, cross-library sweep, official examples old vs current). See BENCHMARKS.md.

- Collect real outputs from several models across the four conditions in [eval/](../eval/README.md) and publish the numbers, including the cases where a ledger does not help.
- Run the Three.js snippets on real WebGPU hardware and fix whatever breaks; update the example's `status`.

## Format v1.1 (backward compatible)

- `scope` header key: file globs a ledger applies to.
- Per-rule severity: `error` and `warn`.
- `unless` that applies per match instead of per unit.
- Comment and string stripping before matching, so a banned token in a comment does not fire.
- `include` of another ledger, with shared rule packs.

## Tooling

- Editor syntax highlighting for `.myelin`.
- Done (unreleased): a GitHub Action wrapper (`action.yml`, see [HOSTS](HOSTS.md)).
- Done (unreleased): a watch mode for `lint` (`--watch`).
- Done (unreleased): `myelin fix` prints the fix message and snippet for each failing rule. It is read-only; applying snippets stays with the author.

## Distribution

- Publish to npm once the format has settled.
- ~~A small registry of community ledgers~~ Bundled library ledgers shipped in 0.2.0 (`libs/`). Next: a monthly re-verification pass per library, and community-contributed libs.
- Done (unreleased): Angular, Astro, Drizzle, Mongoose, Vitest and OpenAI SDK ledgers. Next: Playwright, LangChain.js, and a Drizzle v1 ledger once v1 is `latest`.

## Out of scope

- Judging whether code is correct or good. That needs tests, a runtime, or a human.
- Running snippets or any code from a ledger.
