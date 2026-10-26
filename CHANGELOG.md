# Changelog

## 0.2.0

The library shelf.

- **13 bundled library ledgers** in `libs/`, researched against live official docs on 2026-10-26: three.js r186, React 19.3, React Router 8.5, Next.js 16.4, Tailwind 4.3, Svelte 5 + SvelteKit 3, Vue 3.5 + Nuxt 4, Zod 4.6, Express 5.3, ESLint 10, Vercel AI SDK 7, TanStack Query 5, Prisma 7. 231 bans, each with an official source in `SOURCES.md`.
- CLI: `libs`, `detect`, `use`, `bench` (`--cross`, `--md`, `--verbose`). Any ledger argument can be a bundled lib id; `lint` takes several (`lint three,react src/`).
- Benchmarks: labelled corpus per lib (120 stale, 88 current files), a cross-library false-positive sweep, and an in-the-wild test on upstream example code (`eval/wild/`). See BENCHMARKS.md.
- New README with generated art (`npm run assets` rebuilds it from live data). The old README is now docs/REFERENCE.md.
- CI runs the benchmark. 44 tests.

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
