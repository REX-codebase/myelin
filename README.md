<p align="center">
  <img src="assets/hero.svg" alt="Myelin: your AI learned last year's docs. Myelin teaches it this year's." width="100%">
</p>

<p align="center">
  <a href="#-30-second-start"><img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-5ff4ff?style=for-the-badge&labelColor=05070d"></a>
  <a href="#-the-library-shelf"><img alt="13 libraries" src="https://img.shields.io/badge/libraries-13-7dff9a?style=for-the-badge&labelColor=05070d"></a>
  <a href="BENCHMARKS.md"><img alt="benchmarks" src="https://img.shields.io/badge/benchmarks-reproducible-ff6b8b?style=for-the-badge&labelColor=05070d"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-e9eef7?style=for-the-badge&labelColor=05070d"></a>
</p>

<h3 align="center">AI writes three.js like it's 2023. React like it's 2022. Tailwind like it's v3.<br>Myelin catches it, and hands back the fix.</h3>

<br>

<p align="center"><img src="assets/compare.svg" alt="What your AI writes vs what the library wants now" width="100%"></p>

## ⚡ See it

<p align="center"><img src="assets/demo.svg" alt="myelin lint catching five stale three.js APIs, then passing clean" width="100%"></p>

## 🚀 30-second start

```bash
npx github:REX-codebase/myelin detect          # which libraries does this project use?
npx github:REX-codebase/myelin lint three,react src/
```

Pipe the rules straight into any model, no tools needed:

```bash
npx github:REX-codebase/myelin gate three --all | pbcopy   # paste into ChatGPT, Claude, Gemini…
```

## 🧠 How it works

<p align="center"><img src="assets/how.svg" alt="ledger → model reads the rules → script checks → current code" width="100%"></p>

**One file, two readers.** A model reads the ledger as text and follows it. A script runs every rule as a regex and fails CI when it doesn't.

## 📚 The library shelf

<p align="center"><img src="assets/libs.svg" alt="Bundled ledgers: three.js r186, React 19, Next.js 16, Tailwind 4, Svelte 5, Zod 4, Express 5, ESLint 10, AI SDK 7, React Router 8, Vue 3.5, TanStack Query 5, Prisma" width="100%"></p>

Every rule links to the official migration guide or changelog it came from → `libs/<id>/SOURCES.md`.
Researched against live docs on **2026-10-26**.

## 📊 Benchmarks

<p align="center"><img src="assets/bench.svg" alt="Benchmark results" width="100%"></p>

- **Labelled corpus:** stale files a model would write, and current files, for every library. All stale files caught, no false alarms on current ones.
- **Cross-check:** every ledger runs over every *other* library's correct code. Zero false alarms means it won't fight your stack.
- **In the wild:** official example code from upstream repos, old release vs current. Three.js r186's own 230 WebGPU examples trip exactly one rule, on an old API left in a comment.

Full method, per-library tables and how to reproduce: **[BENCHMARKS.md](BENCHMARKS.md)**.

<details>
<summary><b>🧾 What a ledger looks like</b></summary>

```
myelin 1
id      three
about   three.js r186 on the WebGPU + TSL path: bans APIs models learned from older releases
fires   three.js | threejs | three/webgpu | three/tsl | WebGPURenderer | TSL | EffectComposer

= version     three.js r186 (npm three@0.186.1, released 2026-09-08)
! B5 /\bnew\s+(THREE\.)?Clock\s*\(/   THREE.Clock is deprecated since r183. Use THREE.Timer. -> $boot
! B7 /\b(outputEncoding|sRGBEncoding|LinearEncoding|GammaEncoding|legacyMode)\b|\.encoding\s*=/   Encoding API removed in r162. Use outputColorSpace.
~ P8 Do not assume r187 changes until r187 is released.

$ boot
import * as THREE from 'three/webgpu';
...
$$
```

`!` must never appear · `+` must appear · `~` preference · `=` fact · `$` copy-exact snippet. Spec → [docs/SPEC.md](docs/SPEC.md)
</details>

<details>
<summary><b>🛠 All commands</b></summary>

| command | what it does |
|---|---|
| `libs` | list the bundled library ledgers |
| `detect [dir]` | read `package.json`, suggest ledgers |
| `lint <lib or ledger>[,more] <files>` | check code; exit 1 on any violation |
| `gate <lib or ledger> [--all]` | print the rules as plain text for a model |
| `use <lib>` | copy a bundled ledger into `.myelin/` to customise |
| `bench [lib...] [--cross] [--md]` | score ledgers on their labelled corpus |
| `validate` · `self` · `snippet` · `header` · `init` | author your own ledgers |

Full reference → [docs/REFERENCE.md](docs/REFERENCE.md) · hosts and CI → [docs/HOSTS.md](docs/HOSTS.md) · writing ledgers → [docs/AUTHORING.md](docs/AUTHORING.md)
</details>

<details>
<summary><b>🤖 Plug it into your agent</b></summary>

- **Claude Code, Cursor, Codex, any agent with a shell:** drop [`integrations/AGENTS.md.snippet`](integrations/AGENTS.md.snippet) into your repo. The agent runs `gate` before coding and `lint` after.
- **Chat with no tools:** paste `myelin gate <lib> --all` into the prompt.
- **CI:** `npx github:REX-codebase/myelin lint nextjs,react app/` fails the build on stale code.
</details>

<details>
<summary><b>⚖️ Honest limits</b></summary>

- Rules are regexes. They catch stale API names and patterns, not wrong logic, and they can fire on a comment.
- Passing lint doesn't mean code runs. Snippets are checked against sources; most were not executed.
- The ledgers prove they *catch* stale code. Whether models *write less of it* when given a ledger is measured with [`eval/`](eval/README.md), and those results aren't published yet.
- The three.js ledger targets the WebGPU + TSL path. It is not for WebGL-only projects.
</details>

<br>

<p align="center">
  <b>Your library changed? Add a rule. Every PR needs a source link and a bench file.</b><br>
  <a href="CONTRIBUTING.md">Contribute</a> · <a href="docs/ROADMAP.md">Roadmap</a> · MIT
</p>
