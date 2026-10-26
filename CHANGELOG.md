# Changelog

## 0.1.0

First release.

- Format v1: header, `!` bans with `unless`, `+` requirements, `~` preferences, `=` facts, `$` snippets, `-> $id` pointers.
- Library: parser, checker, gate renderer.
- CLI: `validate`, `self`, `lint`, `gate`, `header`, `snippet`, `init`, with `--json`.
- Examples: Three.js WebGPU hut, Node ESM library, Python requests.
- Integrations: AGENTS.md snippet, system-prompt template, SKILL.md bridge.
- Eval harness for scoring saved outputs per model and condition. No results included.
- 37 tests; CI on Node 18, 20, 22.

Known gaps: no benchmark results, Three.js snippets not run on hardware, `unless` is unit-wide.
