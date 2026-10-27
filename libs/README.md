# Library ledgers

One folder per library. Each is researched against the library's **live** official docs, migration guides and changelogs, and dated.

```
libs/<id>/
  <id>.myelin        the ledger: bans (stale API -> current fix), facts, copy-exact snippets
  SOURCES.md         the official source for every rule, and what was checked and left out
  bench/bad/         stale code a model would write
  bench/good/        current code, mostly adapted from official examples
  bench/expected.json  which rules must fire on each bench file
```

`index.json` maps each id to the packages that trigger it (`myelin detect`, which reads `package.json`). `pins.json` records the version each ledger targets for the weekly drift check; a pin with `"registry": "pypi"` is compared with PyPI instead of npm.

| id | library | targets | verified |
|---|---|---|---|
| `three` | three.js | r186 (WebGPU + TSL path) | 2026-10-26 |
| `react` | React | 19.3 | 2026-10-26 |
| `react-router` | React Router | 8.5 | 2026-10-26 |
| `nextjs` | Next.js | 16.4 | 2026-10-26 |
| `tailwind` | Tailwind CSS | 4.3 | 2026-10-26 |
| `svelte` | Svelte + SvelteKit | 5.57 + Kit 3.1 | 2026-10-26 |
| `vue` | Vue + Nuxt | 3.5 + Nuxt 4.6 | 2026-10-26 |
| `zod` | Zod | 4.6 | 2026-10-26 |
| `express` | Express | 5.3 | 2026-10-26 |
| `eslint` | ESLint | 10.13 (flat config) | 2026-10-26 |
| `ai-sdk` | Vercel AI SDK | `ai` 7.0 | 2026-10-26 |
| `tanstack-query` | TanStack Query | 5.104 | 2026-10-26 |
| `prisma` | Prisma ORM | 7.10 (v8 is RC, not targeted) | 2026-10-26 |
| `mongoose` | Mongoose | 9.11 | 2026-10-26 |
| `openai` | OpenAI Node SDK | 7.43 | 2026-10-26 |
| `angular` | Angular | 22.2 | 2026-10-26 |
| `vitest` | Vitest | 5.0 | 2026-10-26 |
| `drizzle` | Drizzle ORM | 0.45 + kit 0.31 (v1 is RC, not targeted) | 2026-10-26 |
| `astro` | Astro | 7.4 | 2026-10-26 |
| `firebase` | Firebase JS SDK + Admin + Functions | 13.1 + admin 14.5 + functions 7.4 | 2026-10-27 |
| `blender` | Blender Python API (bpy) | 5.2 (bpy 5.2.3) | 2026-10-27 |

## Scope notes

- **three**: targets WebGPURenderer + TSL. WebGLRenderer, EffectComposer and ShaderMaterial still exist upstream for WebGL apps; don't use this ledger on a WebGL-only project.
- **tanstack-query** B16 bans `fetchQuery`/`prefetchQuery` in favour of `queryClient.query()`, which arrived in 5.102. Drop it if you're pinned lower.
- **svelte** K1-K10 target SvelteKit 3 and will fire on correct SvelteKit 2 code.
- **react** bans `forwardRef` and `Context.Provider`, which still run in 19.x but are on their way out. Libraries that support React 18 may keep them.
- **vitest** V17 flags `jest.*` globals; in a repo that still runs Jest alongside Vitest, keep it off Jest-only files (or import from `@jest/globals`, which exempts the file).
- **firebase** B1 and B2 ban the namespaced v8 SDK and `firebase/compat`, which still ship in firebase 13; turn them off (`.myelin/ignore`) in an app that is deliberately mid-migration. B12 to B14 target firebase-functions 7, where `functions.config()` and the v1 builders are gone from the package root; they do not apply below v7. The docs site was unreachable when this was researched, so every rule rests on the published packages and the firebase-js-sdk changelogs (see `libs/firebase/SOURCES.md`).
- **blender** is Python: lint it with `--ext py` (`myelin lint blender --ext py scripts/`). Python `#` comments are not skipped, so a comment that names a banned API fires. It targets Blender 5.2; B4, B5 and B6 are wrong for a project pinned to 4.2 LTS. `myelin detect` reads `package.json` only and does not detect it. Rules rest on API stubs from eight Blender releases diffed name by name and the 5.2.3 sources, because the docs and release notes were unreachable (`libs/blender/SOURCES.md`).
- **drizzle** targets the npm `latest` (0.45). The docs site already describes the v1 RC; `relations()` and `db.query` are not banned because `defineRelations` is v1-only.

## Adding or updating a library

1. Every rule needs an official source in `SOURCES.md`.
2. Add stale and current bench files and list them in `expected.json`.
3. `npm run check` must pass: self-test, bench, and the cross-library sweep (your rules must not fire on any other library's current code).
