# Myelin reference

**A rule ledger for LLM output that a model can follow and a script can check.**

A `.myelin` file is not a prompt and not a document. It is a short, line-based ledger of hard rules: patterns the output must never contain (`!`), patterns it must contain (`+`), preferences (`~`), and copy-exact code snippets (`$`). Because every hard rule carries a regex, the same file works two ways:

- **A model with no tools** reads the rules as text and checks its own answer before replying.
- **A script or CI job** runs `myelin lint` and fails the build when the output breaks a rule.

It is plain text, model-agnostic, and has no dependencies.

> **Status: v0.1, experimental.** The format, parser, checker, and CLI are tested (`npm test`). Whether a ledger actually makes models comply better than plain prose has **not** been measured yet. [`eval/`](eval/README.md) is the harness for measuring it. The example snippets for Three.js have not been run on a GPU.

## What it looks like

```
myelin 1
id      node-esm-lib
about   Conventions for small dependency-free Node ESM libraries
fires   node library | esm | npm package
status  Demo ledger. Checks are regex-level only.

! N1 /\brequire\(/                     ESM only. Use import. -> $esm
! N4 /console\.(log|debug)\(/ unless /\/\/ cli-output/   Libraries do not print. -> $esm
+ N5 /\bexport\s/                       Public API uses named exports. -> $esm
~ P1 No default exports.

$ esm
export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
$$
```

Checking a file that breaks the Three.js example ledger:

```
$ myelin lint examples/three-webgpu-hut/hut.myelin bad.js
FAIL B1  bad.js:1  Unseeded randomness. Use the seeded rng.  (-> $rng)
FAIL B2  bad.js:2  Removed path. Import 'three/webgpu' and 'three/tsl'.  (-> $boot)
FAIL R1  missing  Create the renderer with WebGPURenderer.  (-> $boot)
...
7 bans, 8 requires, 1 unit(s) checked: 10 failure(s)
```

## Quick start

Requires Node 18 or newer. There are no dependencies.

```bash
git clone <this repo> && cd myelin
node bin/myelin.mjs help          # or: npm install -g .  then use `myelin`

myelin validate examples/node-esm-lib/esm-lib.myelin    # is the ledger well-formed?
myelin self examples                                    # do its own snippets pass its own rules?
myelin lint <ledger> src/                               # check real output
myelin gate <ledger> --all                              # print the rules as text to paste into a prompt
myelin init my-rules.myelin                             # start a new ledger
```

| command | what it does |
|---|---|
| `validate <ledger>` | Parse and report errors and warnings. |
| `self <ledger or dir>...` | Validate, then run the ledger's snippets through its own rules. A ledger that fails its own gate is broken. |
| `lint <ledger> <file or dir>...` | Check files. Bans apply per file; requirements apply across all files together. `--ext=js,ts` filters directories. `--watch` re-runs the check when a file changes (Ctrl-C to stop). |
| `fix <ledger> <file or dir>...` | Like `lint`, but prints each failing rule once with its fix message and snippet. Read-only. |
| `gate <ledger>` | Print L0 + L1 as plain text for a model. `--snippets=a,b` or `--all` adds copy-exact code. |
| `header <ledger>` | Print only the short L0 header. |
| `snippet <ledger> <id>` | Print one snippet. |
| `init <path>` | Write a starter ledger. |

Add `--json` to `validate`, `self`, `lint`, and `fix` for machine-readable output. Exit codes: `0` clean, `1` rule failures or invalid ledger, `2` usage or file error.

## How it differs from a skill

A skill is prose a model interprets, loaded when its description seems relevant. A ledger is a set of checkable rules. They solve different problems, and you can use both: [`integrations/skill-bridge`](integrations/skill-bridge/SKILL.md) is a thin SKILL.md that points at a ledger.

Read [docs/WHY.md](docs/WHY.md) for an honest comparison, including where a skill is the better tool.

## Using it with a model or agent

- **Chat with no tools:** paste the output of `myelin gate <ledger> --all` into the prompt.
- **Agent with a shell:** add [`integrations/AGENTS.md.snippet`](integrations/AGENTS.md.snippet) to your project, so the agent runs `gate` before coding and `lint` after.
- **CI:** run `myelin lint` on generated files; it exits non-zero on any violation. A composite GitHub Action is in [`action.yml`](../action.yml).
- **Fixing failures:** `myelin fix` prints, for each failing rule, its message and the copy-exact snippet it points at. It does not edit files.

Details and a CI workflow are in [docs/HOSTS.md](docs/HOSTS.md).

## Repository layout

```
bin/            the myelin command
src/            parser, checker, gate renderer (library: import from src/index.mjs)
test/           node:test suite (37 tests)
examples/       three-webgpu-hut, node-esm-lib, python-requests
integrations/   AGENTS.md snippet, system-prompt template, SKILL.md bridge
eval/           harness that scores saved model outputs per model and condition
docs/           SPEC, WHY, AUTHORING, HOSTS, ROADMAP
```

## Known limits

- Checks are regular expressions. They catch banned names and missing patterns, not wrong logic.
- `unless` exempts a whole file, not a single call.
- Passing the lint does not mean the code runs. The Three.js snippets in particular are unverified on hardware.
- A model can ignore a ledger. The linter is what makes the rules enforceable.

## Security

A ledger only constrains output. Load ledgers only from sources you trust. See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
