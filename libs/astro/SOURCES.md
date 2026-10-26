# Sources: astro ledger

Researched and checked 2026-10-26.

**Version.** npm registry `latest` for `astro` is 7.4.2 (https://registry.npmjs.org/astro/latest). Its engines field requires Node >= 22.23.4.

**Access limits.** `docs.astro.build` (guides, upgrade guides, reference) returned a 403 from the sandbox proxy (policy denial on CONNECT), so no docs page was read. The GitHub CHANGELOG was also unavailable. The package tarball on npm has no CHANGELOG file. Every rule therefore rests on one or more of the following:

- The shipped code of the published package, `https://registry.npmjs.org/astro/-/astro-7.4.2.tgz`, read from `package/dist`, `package/types`, `package/components`. Paths below are relative to `package/`.
- The `@astrojs/tailwind@6.0.2` tarball (README and peer ranges).
- Behaviour observed by building and running a scratch project with `astro@7.4.2` on Node 22.23.4 (probe results below). The probe project is outside the repo.

Doc URLs appear only where Astro's own runtime messages print them (for example `https://docs.astro.build/en/guides/upgrade-to/v6/#removed-legacy-content-collections`). Those links were not opened.

## Rules

| ID | Evidence | What changed |
|---|---|---|
| A1 | `dist/core/errors/errors-data.d.ts` ~L902-903: "removed in Astro v6.0.0 along with the removal of `Astro.glob()`". Probe: `Astro.glob('...')` fails the build with `TypeError: Astro.glob is not a function`. | `Astro.glob()` removed in v6. Use `getCollection()` for content or `import.meta.glob()` (Vite). |
| A2 | `dist/content/utils.js` `getContentPaths`: `src/content/config.*` throws `LegacyContentConfigError` unless `legacy.collectionsBackwardsCompat` is set. `dist/content/config.js` `defineCollection`: a `type` other than the Content Layer type throws. `dist/core/errors/errors-data.d.ts` ~L1602: legacy collections "removed in Astro 6". Probe: legacy file path fails with "Found legacy content config file in src/content/config.ts ... move this file to src/content.config.ts". The error links `https://docs.astro.build/en/guides/upgrade-to/v6/#removed-legacy-content-collections`. | Collections are defined in `src/content.config.ts` with a loader. `type: 'content'` / `type: 'data'` is the legacy shape. |
| A3 | `dist/content/config.js` `defineCollection` treats a config with no `loader` as legacy. Probe: `defineCollection({ schema })` with no loader builds with exit 0. `getCollection('docs')` returns `[]`, with `WARN ... collection "blog" does not exist or is empty`. | A schema-only collection is the legacy shape and silently empties. Add a loader. |
| A4 | `dist/content/runtime.js` (`warnForPropertyAccess` on `"slug"`): "The `slug` property is no longer automatically added to entries. Please use the `id` property instead." Probe: `entry.slug` is `undefined` (rendered `<p></p>`). | Content entries expose `id`, not `slug`. |
| A5 | `dist/content/runtime.js` (`warnForPropertyAccess` on `"render"`): "Invalid attempt to access `render()` ... use `render(entry)` from `astro:content`." Probe: `entry.render()` throws `TypeError: ... .render is not a function`. | `render` is a function import: `render(entry)`. |
| A6 | `dist/core/errors/errors-data.d.ts` ~L1580: "The `getDataEntryById` and `getEntryBySlug` functions are deprecated and cannot be used ... Use the `getEntry` function instead." `dist/content/runtime.js` `createDeprecatedFunction` throws `GetEntryDeprecationError`. Probe: `getEntryBySlug('blog', ...)` fails the build. (`getDataEntryById` shares the same code path; not probed separately.) | Both removed; `getEntry(collection, id)` covers content and data. |
| A7 | `types/content.d.ts`: `@deprecated` on `z` from `astro:content`: "will be removed in Astro 8. Use `import { z } from 'astro/zod'` instead." Probe: `z` from `astro:content` still builds. | Deprecated re-export. |
| A8 | `dist/core/config/schemas/base.js` L64-65: `refine((val) => val !== "hybrid", { message: 'The output: "hybrid" option has been removed. Use output: "static" (the default) instead ...' })`. Probe: `output: 'hybrid'` exits 1 at config validation. | `output: 'hybrid'` removed; default is `static`. |
| A9 | `@astrojs/tailwind@6.0.2` README: "This integration is deprecated ... Tailwind CSS now offers a Vite plugin which is the preferred way to use Tailwind 4 in Astro." Its peerDependencies: `astro: ^3.0.0 || ^4.0.0 || ^5.0.0`. Probe: `npm install @astrojs/tailwind@6.0.2` alongside `astro@7.4.2` fails with `ERESOLVE`. `dist/cli/add/index.js` L286-287, L692: `astro add tailwind` adds `@tailwindcss/vite` as a Vite plugin (`^4.0.0`). | Integration deprecated; the Vite plugin replaces it. |
| A10 | `types/transitions.d.ts`: the `astro:transitions` module exports only `ClientRouter` (`astro/components/ClientRouter.astro`). `components/ClientRouter.astro` is the router component. Probe: `import { ViewTransitions } from 'astro:transitions'` fails with `MISSING_EXPORT`. The exact release where the rename shipped is not in the sandbox (no CHANGELOG). | `ViewTransitions` renamed to `ClientRouter`. |
| A11 | `dist/core/config/schemas/base.js` L299: `experimental: z.strictObject({...})`. Its keys: clientPrerender, contentIntellisense, chromeDevtoolsWorkspace, incrementalBuild, redirectPage, parallelPrerender, svgOptimizer, collectionStorage. `env` is top-level (base.js L281), `fonts` is top-level (base.js ~L296). Probe: `experimental: { contentLayer | viewTransitions | actions | env | fonts | svgo | rustCompiler: true }` each exits 1. `contentLayer`, `actions` and `ClientRouter` work with no flag (probes used them without flags). | Graduated or moved flags are rejected by the strict schema. |
| A12 | `dist/types/public/config.d.ts`: `@deprecated` on `markdown.remarkPlugins`, `rehypePlugins`, `gfm`, `smartypants`, `remarkRehype` ("will be removed in a future major version"). `markdown.processor` (`@version 6.4.0`) docs: `processor: unified({ remarkPlugins: [remarkToc] })` from `@astrojs/markdown-remark`, and `satteri({...})` is the default processor. Probe: `markdown.remarkPlugins` builds with exit 0 (deprecated, still works). The `unless` covers `unified({ remarkPlugins })` and `satteri({ features: { gfm } })`. | Deprecated markdown options; plugins move to `markdown.processor`. |
| A13 | `dist/core/create-vite.js` (~L295): alias `astro:schema` -> `astro/zod` with "TODO: remove in Astro 8". Probe: `import { z } from 'astro:schema'` builds. | Alias kept only until Astro 8. |
| A14 | `dist/actions/runtime/server.js` `defineAction({ accept, input: inputSchema, handler })` reads `input` only. Probe (server build + node adapter): `defineAction({ accept: 'json', schema: z.object({ email: z.string().email() }), ... })` ran the handler with the raw body `{"email":"not-an-email"}`, so nothing was validated. | `schema` is ignored; the option is `input`. |

## Preferences (not checked)

| ID | Evidence |
|---|---|
| P1 | `dist/runtime/server/astro-global.js` `createAstro`: getter `site` in `getStaticPaths` does `console.warn("Astro.site inside getStaticPaths is deprecated ... Use import.meta.env.SITE instead")`. |
| P2 | `dist/core/config/schemas/base.js` L64: `output` defaults to `"static"`. Probe: a dynamic route with no `prerender` and no `getStaticPaths` in server output works with an adapter. |
| P3 | `dist/content/utils.js` L337-388: `legacy.collectionsBackwardsCompat` keeps legacy config working and is described as deprecated. |
| P4 | Content entries carry `id` (probe: `getCollection('blog')` with `glob()` loader gave `entry.id` values used by `getStaticPaths` in the good corpus). |

## Facts

| Fact | Evidence |
|---|---|
| `astro/zod` exports `z` (zod 4) | `dist/zod.js` re-exports `zod/v4`. Probe: `z.email()` and `z.coerce.date()` run. |
| `glob()` / `file()` from `astro/loaders` | `dist/content/loaders/index.js`. Probe: `src/content.config.ts` build ran. |
| `<ClientRouter />` in `<head>` | Probe: built page contains the router script. |
| Node engine `>=22.23.4` | `package.json` `engines` of astro 7.4.2. Probes ran on Node 22.23.4 (Astro refuses to start on 22.22). |
| Default markdown processor `satteri()` | `dist/types/public/config.d.ts` `markdown.processor` docs. |
| `@tailwindcss/vite` is what `astro add tailwind` writes | `dist/cli/add/index.js` L286-287, L692. |

## Snippets

Built as real files in scratch projects with astro@7.4.2: `$glob`, `$contentconfig`, `$entryid`, `$router`, `$tailwind` and `$config` in a static project. `$getentry` and `$zod` in a server project with the Node adapter. `$actions` in the same server project, where the handler ran.

## Left out

- **Middleware and `Astro.locals`.** The shipped types and runtime show no stale pattern (`defineMiddleware`, `onRequest`, `context.locals` and `context.redirect` are current). Nothing sourced, so no rule.
- **`getStaticPaths` shape.** No removed or changed shape found in the package. Only the `Astro.site` / `Astro.generator` deprecations inside `getStaticPaths` (P1; `Astro.generator` not written as a rule).
- **`entry.slug` in non-Astro code.** A4 matches `entry|doc|article.slug` in any file. Cross-check found no hit in other libs' good files.
- **Session drivers and `cookies.consume()`.** Deprecated in the typings (`dist/core/session/types.d.ts`, `dist/core/cookies/cookies.d.ts`), but the regex would be narrow and unverified in practice.
- **`astro:transitions` attributes (`transition:animate`, `transition:persist`).** Not checked against the shipped code.
- **Exact release that renamed `ViewTransitions` and dropped `hybrid`.** Not in the sandbox (no CHANGELOG, docs blocked). The rules state the current behaviour and the code's own messages, not the release numbers, except where the package's error text gives "Astro v6" (A1, A2).
- **`astro:env` and top-level `env` / `fonts` config.** Mentioned only in A11's message. No rule for them.

## Known regex limits

- A2 matches the first `type: 'content' | 'data'` before the next `defineCollection` in the same file.
- A12 handles one level of nested braces inside `markdown: { ... }`. A deeper shape would be missed.
- Bench files check text, not meaning. The ledger's `comments skip` header keeps commented-out code from firing.
