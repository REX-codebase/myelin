# Roadmap

Ideas, not promises. Order is rough priority.

## Measure it first

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
- A GitHub Action wrapper.
- A watch mode for `lint`.
- A `myelin fix` that suggests the snippet for each failing rule.

## Distribution

- Publish to npm once the format has settled.
- A small registry of community ledgers, each with a stated test status.

## Out of scope

- Judging whether code is correct or good. That needs tests, a runtime, or a human.
- Running snippets or any code from a ledger.
