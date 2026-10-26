# Benchmarks

Three tests, all reproducible from this repo. They measure one thing: **does a ledger flag stale library code, and leave current code alone?**
They do not measure whether a model writes better code when it is given a ledger. That needs model runs; the harness for it is in [eval/](eval/README.md), and no model results are claimed here yet.

## 1. Labelled corpus

Every library ships `libs/<id>/bench/`: realistic files a model with stale training would write (`bad/`), files written the current way, mostly adapted from official docs and examples (`good/`), and `expected.json` naming exactly which rules must fire on each file.

```
npm run bench
```

| lib | bans | bad files | caught | good files | clean | rule recall | precision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ai-sdk | 20 | 8 | 100.0% | 6 | 100.0% | 100.0% | 100.0% |
| eslint | 19 | 8 | 100.0% | 6 | 100.0% | 100.0% | 100.0% |
| express | 14 | 7 | 100.0% | 5 | 100.0% | 100.0% | 100.0% |
| nextjs | 20 | 12 | 100.0% | 8 | 100.0% | 100.0% | 100.0% |
| prisma | 15 | 7 | 100.0% | 7 | 100.0% | 100.0% | 100.0% |
| react | 20 | 10 | 100.0% | 7 | 100.0% | 100.0% | 100.0% |
| react-router | 17 | 10 | 100.0% | 6 | 100.0% | 100.0% | 100.0% |
| svelte | 22 | 11 | 100.0% | 8 | 100.0% | 100.0% | 100.0% |
| tailwind | 10 | 9 | 100.0% | 7 | 100.0% | 100.0% | 100.0% |
| tanstack-query | 16 | 9 | 100.0% | 7 | 100.0% | 100.0% | 100.0% |
| three | 21 | 11 | 100.0% | 7 | 100.0% | 100.0% | 100.0% |
| vue | 20 | 10 | 100.0% | 8 | 100.0% | 100.0% | 100.0% |
| zod | 17 | 8 | 100.0% | 6 | 100.0% | 100.0% | 100.0% |
| **TOTAL** | **231** | **120** | **100.0%** | **88** | **100.0%** | **100.0%** | **100.0%** |

- **caught**: stale files with at least one rule firing. **clean**: current files with no rule firing.
- **rule recall / precision**: per-rule, against `expected.json`. A rule that fires where it shouldn't, or stays quiet where it should fire, counts against these.
- Caveat: the corpus was written by the same research pass that wrote the rules. It proves each rule does what it says; it is not an independent sample. Tests 2 and 3 are the independent checks.

## 2. Cross-library sweep

Every ledger is run over every **other** library's current (`good/`) files. A ledger that fires on correct React Router code while you're working in Next.js would be noise.

```
node bin/myelin.mjs bench --cross
```

Result: **13 ledgers x other libs' good files: 1056 checks, 0 cross-library false positive(s)**

This test found real problems during development (Next.js's `params.x` rule firing on React Router and SvelteKit loaders, ESLint's `plugins: [` rule firing on Vite configs, Svelte's `<slot>` rule firing on Vue). Each was fixed in the rule, not the corpus.

## 3. In the wild: official example code

Upstream example code from an **old** release and the **current** release, untouched. A good ledger fires on most old files and almost none of the new ones.

```
npm run bench:wild     # sparse-clones ~60 MB of upstream examples into .wild/
```

| corpus | files | flagged |
|---|---|---|
| three.js **r150** examples (all, 2023) | 408 | **399 (97.8%)** |
| three.js **r186** WebGPU examples (`webgpu_*.html`) | 230 | **1 (0.4%)** |
| Next.js **14.2** App Router example files | 252 | 32 (12.7%) |
| Next.js **16.4.3** App Router example files | 401 | 20 (5.0%) |

**three.js.** The one r186 hit is `webgpu_tsl_compute_attractors_particles.html`, line 227: `// const delta = timerDelta()...`, an old API left in a **comment**. Regexes can't tell comments from code ([known limit](docs/SPEC.md#10-known-limits)). Most r150 files are flagged by B14 (the ledger targets WebGPU, and r150 is WebGL); with B14 excluded, **263 of 408 (64%)** still use APIs that were removed or deprecated by r186 (`outputEncoding`, `THREE.Clock`, `ShaderMaterial`, `EffectComposer`...).

**Next.js.** Most App Router examples don't touch the APIs that changed, so the old rate is low by nature. The interesting part is the 20 hits in **Next.js's own v16.4.3 examples folder**. Reading each flagged line: **19 are real pre-16 code** still in the official examples (synchronous `params` / `searchParams`, `draftMode().enable()` without `await`, `headers().get()`, single-argument `revalidateTag`, `next/head` in an App Router page). **1 is a false positive** (`cms-sanity/app/(blog)/more-stories.tsx`: a component whose own prop happens to be named `params`). Full list: [eval/wild/results.json](eval/wild/results.json).

In other words: even official examples lag behind the library. That is the code models train on.

## 4. Agent A/B: bonfire scene (three.js r186)

![run 1 of each arm](eval/bonfire-ab/screenshots/trio.jpg)

Six agents, same task, three arms of two: no guidance, the r186 rules as prose (`SKILL.md`), and the Myelin gate plus mandatory lint. Both unguided agents used `THREE.Clock` and `PCFSoftShadowMap` (lint B5, B6), and three.js printed exactly those two warnings at runtime. All four guided agents were clean and warning-free; all six rendered. Prose and gate tied at this sample size; Myelin's edge is that the check is enforced by a tool, not by the model's reading. Details, outputs and screenshots: [`eval/bonfire-ab/`](eval/bonfire-ab/README.md).

## What would make these numbers stronger

- Model runs: same task, each model, with and without `myelin gate`, scored by `eval/run-eval.mjs`. Needs API keys; contributions welcome.
- More wild corpora: React, Svelte and Tailwind example repos pinned at old and current tags.
- Comment stripping before matching (on the [roadmap](docs/ROADMAP.md)) would remove the one three.js false positive.
