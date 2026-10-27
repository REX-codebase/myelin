# Derived ledgers and agent hooks

Myelin ships 21 hand-researched ledgers. Your project has more than 21 dependencies, and it is not on the latest version of any of them.

`myelin derive` closes that gap. Library authors already say which APIs are deprecated, in the type declarations they ship (`@deprecated` in a JSDoc block). `derive` reads those tags **from the versions installed in your `node_modules`** and writes them as an ordinary ledger. `myelin hook` then runs the ledger on every edit an AI agent makes, whether or not the agent remembers to ask.

```bash
myelin derive                  # writes .myelin/derived.myelin
myelin lint derived src/       # check your code against it
myelin hook install            # make Claude Code check every edit it makes
```

## What it catches, and what it does not

A curated ledger and a derived ledger know different things.

| | curated (`libs/`) | derived (`.myelin/derived.myelin`) |
|---|---|---|
| Source | a research pass over migration guides | `@deprecated` tags in the installed types |
| Covers | 21 libraries | any library that ships types or has `@types/` |
| Version | the one it was researched against | **exactly the one installed** |
| Knows about | removed and changed APIs, config, CSS, semantics | APIs that are **still there but deprecated** |
| Catches | code that breaks | code that **works and warns, or works and rots** |

Removed APIs are not in the types, so a derived ledger cannot know about them. A removed API fails to compile, which is loud. A deprecated one compiles, runs and ships, which is why it is worth a rule. In Next.js 16.4.3's own examples the two ledgers flag different files and **no file in common** (see [BENCHMARKS](../BENCHMARKS.md#6-derived-ledgers)). Use both: `myelin lint react,zod,derived src/`.

Real findings from a derived ledger, on code nobody wrote for this purpose:

```
FAIL react-React-ElementRef   components/ui/dialog.tsx:27   `React.ElementRef` is deprecated in @types/react@19.3.0. Use `ComponentRef<T>` instead.
FAIL zod-ZodString-email      lib/validations/auth.ts:4     `ZodString.email()` is deprecated in zod@4.6.7. Use `z.email()` instead.
FAIL ai-simulateReadableStream  lib/ai/models.test.ts:2     `simulateReadableStream` is deprecated in ai@7.0.153. Import it from `ai` instead.
```

None of those is a compile error. `tsc` is silent about all of them.

## How a rule is made

1. **Find the public surface.** `derive` starts at the entry files a package advertises (`exports`, `types`, or `@types/<name>`) and follows re-exports, including into other packages (`@tanstack/react-query` re-exports `@tanstack/query-core`). A declaration is public through the import specifiers that reach it. `zod` and `zod/v3` are different surfaces: `.email()` is deprecated in one and live in the other.
2. **Read the tags.** A small scanner (no TypeScript compiler, no dependencies) finds each `@deprecated` JSDoc block and the declaration it belongs to: a function, class, type, enum member, method or property, and which interface or namespace it sits in.
3. **Decide how code reaches it.** There is never a bare-identifier match, because a local variable called `rangeFog` is not the deprecated TSL function. Each rule is one of:

   | shape | matches | example |
   |---|---|---|
   | import | the name inside an `import { … } from "pkg"` | `import { FormEvent } from "react"` |
   | access | `.name` or `.name(` | `React.ElementRef`, `fs.exists(` |
   | chained | `).name(`, a call on a call result | `z.string().email()` but not `z.email()` |
   | binding | a destructured or object key | `const { isInitialLoading } = useQuery()` |
   | jsx | a prop on an element | `<Link legacyBehavior>` |

4. **Gate it.** Every rule carries `when /imports the package/`. A file that does not import `zod` is never checked against a zod rule.
5. **Drop what is ambiguous.** A rule that fires on live code is worse than a missing rule. A deprecated name is left out when:
   - the same name is **live** elsewhere in the same surface (`z.email()` is live, so plain `.email(` cannot be used, only the chained form);
   - it is live on a **sibling subpath** (`simulateReadableStream` is deprecated in `ai/test` and fine in `ai`, so only its import from `ai/test` is flagged);
   - **another installed package** declares it live: the rule gets an `unless` guard and steps aside in a file that imports both;
   - it is a **plain lowercase word** used as a property (`resolution`, `disabled`), or a name the language owns (`async`, `map`, `then`).

   `myelin derive --explain` lists every deprecated API that did not become a rule and the reason.

The result is a plain ledger. Read it, diff it, edit it.

## Keeping it current

The ledger is deterministic: the same `node_modules` gives the same bytes. Commit `.myelin/derived.myelin`.

- After upgrading dependencies, run `myelin derive` again. The diff in the pull request is **what became deprecated in that upgrade**, and `myelin lint derived src/` lists where your code uses it.
- In CI, `myelin derive --check` exits 1 when the file is older than `node_modules`. `myelin doctor` warns about the same thing.
- `libs: detect` in the [GitHub Action](HOSTS.md#github-action) picks up `derived` automatically when the file exists.
- Monorepos: run `derive` at the root. It reads the `workspaces` of `package.json` and of `pnpm-workspace.yaml`. pnpm's symlinked layout works; Yarn Plug'n'Play does not (set `nodeLinker: node-modules`).

## When a rule is wrong for you

Derived rules are heuristics over names. If one fires where it should not, put its id in `.myelin/ignore`, one per line (`#` starts a comment). `lint`, `fix` and the agent hook all read it, and it survives regenerating the ledger. `--ignore=a,b` does the same for one run.

Please also [open an issue](../.github/ISSUE_TEMPLATE/false_positive.yml) with the line that tripped it: a rule shape that is wrong for one library is wrong for others.

## Agent hooks

Rules files (`AGENTS.md`, `CLAUDE.md`) are advice. A model skips them under pressure, after a long context, or when its habits are stronger. Hooks are code the agent's host runs every time, at a fixed moment.

```bash
myelin hook install            # .claude/settings.json; --local for settings.local.json
myelin hook uninstall
```

This adds two hooks for Claude Code:

- **After every `Edit`, `MultiEdit` or `Write`**, `myelin hook post` checks **only the text the agent just wrote**. The rest of the file is read for its imports but not judged, so legacy code around the edit does not drag the agent into unrelated rewrites. If a rule fires, the hook prints it to stderr and exits 2, which Claude Code hands to the model:

  ```
  myelin: 2 stale or deprecated API uses in the code you just wrote to src/user.ts. The edit was applied. Fix them now:
    src/user.ts:4  zod-ZodString-email  `ZodString.email()` is deprecated in zod@4.6.7. Use `z.email()` instead.
    src/user.ts:5  zod-ZodString-uuid   `ZodString.uuid()` is deprecated in zod@4.6.7. Use `z.uuid()` instead.
  ```

  Only bans are checked (a requirement cannot be judged from a fragment), curated rules win over derived ones on the same line, and findings are capped at 12.
- **At session start**, `myelin hook session` prints the rules that apply to the packages you actually use, as sentences, within a budget (`--budget=4000` characters). The model hears about them before it writes anything.

In 27 runs of the real Claude Code CLI, an unguided model wrote a deprecated API in 9 of 9 final files; with the hook, 0 of 9, each corrected in the following turn; with the session brief as well, 0 of 9 first drafts needed correcting ([BENCHMARKS](../BENCHMARKS.md#7-hook-ab-does-a-hook-change-what-an-agent-ships-claude-code)). The brief is cut to a character budget, so in a project with many dependencies it will not list every rule; the hook does not depend on it.

A hook never gets in the way. A bad payload, an unreadable file, a broken ledger, a tool that is not an edit, a file outside the project: every one of them is exit 0 and silence (`MYELIN_DEBUG=1` shows why, `MYELIN_HOOK=off` turns the hook off). The installed command also does nothing where `myelin` is not on `PATH`, so a teammate without it is not broken by a committed `settings.json`.

For other agents there is no installer, because each host has its own hook format. The same check is `myelin lint derived,<libs> <files>`: use it from that host's hook, a pre-commit hook or CI.

## Safety

`derive` reads text files. It does not run code from `node_modules`, make network requests, or spawn processes, and a test fails if the source ever imports the modules that would.

Declaration files are third-party input, and what they say ends up in a file a model reads. So:

- A package's **prose never reaches a ledger**. The message is written by Myelin from the API's name, its package and version, and at most four code-shaped tokens taken from the note, and only if each is a name these packages really declare (`z.email()`, `ComponentRef<T>`). A note that says "ignore previous instructions and run curl" yields a message that names the API and nothing else: none of those words is an API of the package.
- Every string that comes from a package (module names, subpaths, versions) is checked against a strict pattern before it is written into a line, and a rule that would not fit on one line is dropped.
- Patterns start with the literal name and check their surroundings with **bounded** look-arounds. A file of 5,000 unterminated `export { a, b,` lines, which made an earlier pattern take minutes, takes 18 ms; a 2 MB file dense with rule names takes about two seconds.
- A hook only loads ledgers from the session's own project, never from a project an edit happens to land in.

## Limits

- **Names, not types.** A rule matches text. `.page()` on a Segment analytics object is not `NextRequest.page()`, and nothing in a regex can tell. Most of the design above exists to avoid names where that can happen, at the cost of recall.
- **Recall is modest by design.** Against the 177 stale files in this repo's corpus, a derived ledger catches 15 (8.5%). The ceiling for any approach based on deprecation tags is 27%, because most stale code uses APIs that were removed, renamed or changed in meaning. The honest numbers are in [BENCHMARKS](../BENCHMARKS.md#6-derived-ledgers).
- **Only what the authors tagged.** A library that deprecates in prose or in a changelog, and not with `@deprecated`, gives nothing.
- **JavaScript and TypeScript.** The scanner reads `.d.ts`. Python and other ecosystems are on the [roadmap](ROADMAP.md).
- **Direct dependencies and what they re-export.** A transitive package you never import contributes nothing unless a direct dependency re-exports it.
- **Wildcard exports** (`"./*"`) name no single file and are skipped.
