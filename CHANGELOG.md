# Changelog

## 0.4.0 (2026-10-27)

- **Two new library ledgers (21 total): Firebase and Blender.** Both target failures models produce for these libraries: a Firebase app written in the v8 namespaced style, and a Blender script that raises or silently does nothing because it was written for an older `bpy`. 34 new bans, each with its evidence in `SOURCES.md`.
  - **`firebase`** (firebase 13.1, firebase-admin 14.5, firebase-functions 7.4): bans the namespaced v8 SDK and `firebase/compat` (`firebase.initializeApp()`, `db.collection().doc().get()`, `auth.signInWithEmailAndPassword()`), `enableIndexedDbPersistence()`, the removed `firebase/vertexai` path and `VertexAIBackend`, the removed Imagen APIs, `initializeAppCheck(app)` without a provider, `dynamicLinkDomain`, `setCurrentScreen()`, Admin SDK namespaces that no longer exist (`admin.firestore()`, `admin.auth()`, `admin.credential`), `functions.config()` (removed in firebase-functions 7), the v1 builders at the Functions root (`functions.region()`, `functions.firestore.document()`, `functions.pubsub.schedule()`) and the v1 `(data, context)` callable signature. Client-only rules are gated with `when` on the file importing the client SDK, so the Admin SDK's own `db.collection("x").doc(id)` is left alone.
  - **`blender`** (Blender 5.2, bpy 5.2.3, Python 3.13): the first bundled library ledger for Python code. Bans `bgl` (removed in 5.0), `Mesh.use_auto_smooth` and `calc_normals_split()` (4.1), the `'BLENDER_EEVEE_NEXT'` engine id (4.2 to 4.5 only), legacy EEVEE settings, `Action.fcurves` (slotted actions, 5.0), `Scene.node_tree` (5.0), `use_nodes = True` (a no-op since 5.0), Principled BSDF socket names from before 4.0 (`'Specular'`, `'Emission'`, `'Transmission'`), `NodeTree.inputs.new()`, operator context-override dicts, the old OBJ/PLY/STL operators, Collada, `'3D_UNIFORM_COLOR'`, bone layers, `Mesh.vertex_colors`, the whole Blender 2.7x scene API, and class-body property assignments that are never registered. Every rule is gated on `bpy`, and `lint blender --ext py` runs it.
  - Research limits are stated in each `SOURCES.md`: `firebase.google.com`, `docs.blender.org` and `developer.blender.org` were unreachable from the research environment, so rules rest on the published packages (types, `exports` maps, `@deprecated` tags), the firebase-js-sdk changelogs, API stubs generated from eight Blender releases (2.93 to 5.2) and diffed name by name, and Blender 5.2.3 sources. No release-note page was read.
  - Bench: 14 + 16 stale files caught, 10 + 12 current files clean, rule recall and precision 100%. Corpus is now 207 stale and 151 current files; the cross-library sweep runs 3,020 checks with 0 false positives.
- **The drift check covers PyPI.** A pin with `"registry": "pypi"` (Blender's is `bpy`) is compared with PyPI's latest stable release by `npm run drift` and the weekly workflow, with the same minor/major rules and the same prerelease handling.
- Fixed: the Next.js `params.x` rule (B3) fired on Firebase Functions code such as `event.params.postId`. It is now lifted for files that mention `firebase-functions`.
- The derived-ledger benchmark (`eval/derive`) now counts only the 19 npm libraries it installs, so its published figures (15 of 177 stale files, 1 of 129 current) are unchanged by the new ledgers.
- New landing-page entries, README table rows, regenerated asset graphics, and 1 new test (193 total).

### Also in 0.4.0: derive, hook and format 1.1

- **`myelin derive`: a ledger for the libraries you actually have.** Library authors already tag deprecated APIs with `@deprecated` in the type declarations they ship. `derive` reads those tags from the versions installed in `node_modules` (and `@types/<name>`, and packages that re-export other packages, and monorepo workspaces) and writes `.myelin/derived.myelin`. No dependencies, no TypeScript compiler, no network, nothing from `node_modules` is run. It is deterministic, so it can be committed, and `derive --check` fails CI when it falls behind an install. `lint`, `fix` and `gate` take the name `derived`. See [docs/DERIVE.md](docs/DERIVE.md).
  - Built to prefer a missing rule to a false alarm: every rule is gated on the file importing the package; there is never a bare-identifier match; a name that is live elsewhere in the same surface, on a sibling subpath (`ai` vs `ai/test`, `zod` vs `zod/v3`) or in another installed package is narrowed to the one syntax that cannot mean the live thing, guarded with `unless`, or dropped. `derive --explain` says why each dropped API was dropped.
  - Messages are composed by Myelin from the API name, package, version and the code-shaped tokens in the note that are real names in the scanned declarations. A package's prose never reaches a ledger or a model.
  - Measured (`npm run bench:derive`): against the repo's 177 stale and 129 current corpus files, 15 stale files caught and 1 current file flagged, which is a genuine deprecation (`FormEvent`). The ceiling for any approach based on deprecation tags is 48 of 177: most stale code uses APIs that were removed or changed, not deprecated. On five open-source code bases (2,097 files, source only) 47 findings in 46 files, all read and all genuine, none a compile error. On Next.js 16.4.3's own examples the curated and derived ledgers flag different files with none in common. See [BENCHMARKS.md](BENCHMARKS.md#6-derived-ledgers).
- **`myelin hook`: the check runs whether or not the agent remembers.** `hook install` adds two Claude Code hooks to `.claude/settings.json`. After every `Edit`, `MultiEdit` and `Write`, `hook post` checks **only the text the agent just wrote** (the rest of the file supplies its imports but is not judged), prints findings to stderr and exits 2, which Claude Code returns to the model. At session start, `hook session` prints the rules for the packages the project uses, as sentences, within a character budget. A hook never gets in the way: any failure is exit 0 and silence. `.myelin/ignore` (one rule id per line) switches a rule off for `lint`, `fix` and the hook. Verified against the real Claude Code CLI, not only a simulated payload. `setup` offers both (`--derive`, `--hook`, `--no-derive`, `--no-hook`); `--yes` never edits agent settings.
- **Format 1.1.** `! ID /re/ when /re/ message`: a ban that applies only to units that match the guard (with `unless`, either order). A ledger that uses `when` must say `myelin 1.1`, which a 1.0 reader rejects, so it can never read `when` as message text and fire everywhere. New header key `render brief`: hosts print a ban's message and not its regex, for generated ledgers. A checked unit may carry a `context` (the whole file) for `when`/`unless` while only its text is matched. See [docs/SPEC.md](docs/SPEC.md).
- Hook A/B with the real Claude Code CLI (`eval/hook-ab/`, [BENCHMARKS](BENCHMARKS.md#7-hook-ab-does-a-hook-change-what-an-agent-ships-claude-code) test 7): 27 runs, three tasks. Unguided, 9 of 9 final files used an API the installed types mark deprecated; with the hook, 0 of 9; with the hook and the session brief, 0 of 9 first drafts. It also found a defect, fixed: a deprecation note's four alternatives were cut to two, so an `onSubmit` handler was told to use `ChangeEvent`.
- `detect` lists `derived` when the file exists, so `libs: detect` in the GitHub Action lints with it. `doctor` reports whether the derived ledger is missing, current or stale, and whether the hooks are installed.
- `eval/derive/`: pinned inputs (`package.json` and lockfile for the 19 libraries at their ledger versions), a fetch script and a runner that recomputes every number above (`--check` fails if one moves, and a workflow runs it on pull requests that touch the generator). It reads the five real code bases as text and never installs their dependencies.
- 80 more tests (112 before, 192 now), all hermetic: fixture packages in a temp directory, no network.

## 0.3.0 (2026-10-26)

- **Verified installs.** `install.sh` and `install.ps1` now install the latest published release and check it against the SHA-256 in that release's `SHA256SUMS` before writing anything; a mismatch, a missing checksum or a missing release asset stops the install. `--ref v0.3.0` (or `$env:MYELIN_REF`) pins a release and is verified the same way; a branch or commit still works and is labelled unverified. Until the first release exists, the installers fall back to `main` and say so. Tested against a local stand-in for GitHub on Linux and macOS (`install.sh`) and on Windows PowerShell 5.1 and 7 (`install.ps1`).
- **Release workflow.** Refuses a tag that does not match `package.json` or has no `## <version>` changelog section, publishes a zip for the Windows installer alongside the tarball, and, after publishing, runs the documented one-line installers on Linux, macOS and Windows and requires that they took the verified release path.
- **Ledger drift check.** `libs/pins.json` records the library version each ledger targets (a test proves each pin matches its ledger), `npm run drift` compares them with npm's latest (a prerelease `latest` tag is compared against the newest stable), and a weekly workflow keeps one issue open while a ledger is a minor or major release behind.
- **Docs and repo.** Fixed seven broken links in `docs/REFERENCE.md` and added tests that every relative link and anchor in the Markdown resolves. The site states that it sets no cookies, runs no analytics and loads only three.js from cdn.jsdelivr.net, and a test enforces it. Added issue forms (bug, rule false positive, stale ledger or new library) and `.gitattributes` so GitHub no longer reports the project as HTML.
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
- 112 tests (was 46 in 0.2.1).

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
