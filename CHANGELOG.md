# Changelog

## Unreleased

- **Landing page performance.** The 3D scene now renders a pixel budget instead of a fixed pixel ratio (a retina laptop drops from 4.0 to 2.4 megapixels, a 4K monitor from 8.3 to 2.4), caps itself near 60 fps on 120 and 144 Hz displays, and steps down through a quality ladder when frames run long: lens fringe, then depth of field, then resolution, then grain. Geometry is about 44% lighter (150k to 84k triangles), the sheath drops its iridescence layer, boot yields to the browser between heavy steps, the whole module graph is preloaded so there is no waterfall, and the per-frame layout read is gone. Stills match the previous render within grain noise. Boot stages appear in the browser's Performance panel as `myelin:*` marks.
- **Landing page rebuilt as a film.** The hero and every chapter now sit on one fixed three.js scene (`site/scene.js`): a myelinated axon of pearlescent, studio-lit sheath segments with exposed nodes of Ranvier, action potentials that hop node to node, and a terminal arbor with one pearl per library. A damped camera dollies through the chapters as you scroll. Depth of field, bloom, lens fringing, grain, warp streaks and a hand-built studio environment give it its look. Hover a library and its terminal lights up in the arbor; stale-to-current flips, lint failures and the Copy button fire pulses.
- The scene is written against Myelin's own three.js ledger (r186, WebGPURenderer, TSL, RenderPipeline) and `test/site.test.mjs` lints it on every run, checks the import map pins the ledger's release, and checks the page keeps its SVG fallback. It falls back to WebGL 2 where WebGPU is missing, keeps the old SVG hero if the module cannot load, honours `prefers-reduced-motion` and data saver, pauses while the white "limits" section covers it, and steps its pixel ratio down on slow frames.
- Libraries section moved from the light theme to a glass panel over the arbor. New social card rendered from the scene.
- **One-line installers.** `install.sh` for macOS, Linux and WSL, and `install.ps1` for Windows (PowerShell 5.1 and 7). Each checks for Node.js 18+, installs under your user folder with no sudo, puts `myelin` on your PATH (`--modify-path` writes the shell rc file), upgrades in place when re-run, and removes everything with `--uninstall`.
- **Homebrew and Scoop.** Formula and manifest templates in `packaging/`, with a maintainer guide for publishing each channel.
- **Release workflow.** Pushing a `v*` tag runs the tests and creates a GitHub Release with the npm tarball, both installers and `SHA256SUMS`. npm publish with provenance runs when `NPM_TOKEN` is set. An install test runs on pull requests that touch the installers, on Ubuntu, macOS and Windows.
- **npm metadata.** Repository, homepage, bugs, author and public publish config are set, `myelin-ledger` is a second bin alias, and `CHANGELOG.md` and `SECURITY.md` ship in the package.
- New `myelin setup` first-run wizard and `myelin doctor` environment check.
- **Agent A/B with Claude Haiku 5.5** (`eval/agent-ab/`): 18 agents, two three.js r186 scenes, three arms. Stale-API first drafts: no guidance 5/6, prose skill 0/6, Myelin 0/6; lint matched three.js runtime warnings on all 18 pages; blind visual scores within noise. Offline WebGPU render harness and scorer included.
- README **Demo** section: two polished Myelin scenes (lighthouse, neon street), lint clean with zero console warnings.
- The bonfire A/B is now credited to GLM 5.3.
- **6 new library ledgers** (19 total), researched 2026-10-26: Angular 22.2, Astro 7.4, Drizzle ORM 0.45 (+ drizzle-kit 0.31; v1 RC not targeted), Mongoose 9.11, OpenAI Node SDK 7.43, Vitest 5.0. 93 new bans, each sourced in `SOURCES.md`; corpus is now 177 stale and 129 current files, 0 cross-library false positives over 2322 checks.
- svelte B5 (`<slot>`) no longer fires on Astro components, where `<slot />` is current.
- `myelin --version` prints the version; `--ext` with no value is a usage error instead of matching nothing.
- New `myelin fix <ledger> <file|dir>...`: like `lint`, but prints each failing rule's fix message and its snippet once, not once per file. Read-only. Same exit codes; `--json`, `--ext` and comma-separated lib ids work as in `lint`.
- New `lint --watch`: re-runs the check when a file changes. Debounced; built on per-directory `fs.watch`, so it works on Node 18 on Linux. Ctrl-C stops it.
- New `action.yml` at the repo root: a composite GitHub Action that runs `lint` and fails the job on any violation. Inputs `libs` (ids, paths, or `detect`), `paths` and `ext`. Usage in docs/HOSTS.md.
- Fixed: under `comments skip`, a quote inside a regex literal (`/"/`) or an apostrophe hid a comment later on the same line, so a banned name in that comment fired.
- Fixed: a UTF-8 byte order mark at the start of a `.myelin` file made the ledger invalid ("first line must be myelin").
- 59 tests (was 46).

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
