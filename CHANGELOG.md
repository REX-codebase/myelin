# Changelog

## Unreleased

- New `myelin fix <ledger> <file|dir>...`: like `lint`, but prints each failing rule's fix message and its snippet once, not once per file. Read-only. Same exit codes; `--json`, `--ext` and comma-separated lib ids work as in `lint`.
- New `lint --watch`: re-runs the check when a file changes. Debounced; built on per-directory `fs.watch`, so it works on Node 18 on Linux. Ctrl-C stops it.
- New `action.yml` at the repo root: a composite GitHub Action that runs `lint` and fails the job on any violation. Inputs `libs` (ids, paths, or `detect`), `paths` and `ext`. Usage in docs/HOSTS.md.
- Fixed: under `comments skip`, a quote inside a regex literal (`/"/`) or an apostrophe hid a comment later on the same line, so a banned name in that comment fired.
- Fixed: a UTF-8 byte order mark at the start of a `.myelin` file made the ledger invalid ("first line must be myelin").
- 58 tests (was 46).

## 0.2.1

- New optional header key `comments skip`: blanks `//`, `/* */` and HTML comments in JS/TS/HTML/CSS-like files before checking, so a comment naming a banned API is not a violation. Off by default (the eslint ledger's rules target comments). The three ledger turns it on.
- Found by the new agent A/B in `eval/bonfire-ab/`: 6 agents, three arms (none, prose skill, Myelin gate). Unguided agents hit B5/B6 and three.js warned at runtime; guided agents were clean. See BENCHMARKS.md section 4.
- 46 tests.

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
