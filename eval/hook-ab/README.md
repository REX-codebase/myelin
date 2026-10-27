# Hook A/B: does a hook change what an agent ships?

Runs the real Claude Code CLI (`claude -p`) on three small tasks in three arms, and scores every file it writes against the derived ledger.

| arm | what the agent has |
|---|---|
| `none` | nothing: no ledger, no hooks |
| `post` | `myelin hook post` after every `Edit`, `MultiEdit` and `Write`: findings come back to the model |
| `both` | `post`, plus `myelin hook session`: the rules for the project's packages are in context before it writes |

| task | what it tempts the model to write |
|---|---|
| `form` | a React form with a typed submit handler (`React.FormEvent`) |
| `label` | a shadcn-style forwarded-ref wrapper (`React.ElementRef`) |
| `schema` | a zod signup schema (`.email()`, `.uuid()`, `.url()` on `z.string()`) |

Every one of those is **deprecated in the installed types and compiles without a warning**. The first draft is the first `Write` the agent made, recorded by a wrapper around the hook; the final file is what was on disk when it stopped. A file counts as *stale* if the derived ledger flags it.

```bash
node eval/hook-ab/run.mjs                      # installs a tiny project into .hook-ab/, 3 tasks x 3 arms x 2 runs
node eval/hook-ab/run.mjs --reps=3             # more runs
node eval/hook-ab/run.mjs --tasks=form --arms=post,both
```

Needs `claude` on your `PATH` and logged in. It makes API calls (about 10 to 30 seconds and a few thousand tokens per run), installs five packages into `.hook-ab/project/`, and refreshes `results.json` here.

## Result

Nine runs per arm (`results.json`; 27 runs, `--reps=3`):

| arm | first draft stale | final file stale | median time |
|---|---|---|---|
| `none` | 9 / 9 | 9 / 9 | 13 s |
| `post` | 9 / 9 | **0 / 9** | 21 s |
| `both` | **0 / 9** | 0 / 9 | 13 s |

## How to read it

- **The ledger is both the rulebook and the judge.** "Stale" means "flagged by the ledger the hook enforces". So this measures whether the agent *responds* to the feedback and to the brief. It does not measure whether the ledger is right; that is [BENCHMARKS test 6](../../BENCHMARKS.md#6-derived-ledgers).
- **Runs are few and nondeterministic.** Treat the table as a demonstration of the mechanism, not a rate. The model is whatever your `claude` is configured to use.
- **The brief helps only where it speaks.** It is cut to a character budget. This project has five packages, so the budget covered every rule that mattered; a project with dozens of dependencies will not get that, and for an API that does not make the list the brief changes nothing. The hook is the part that does not depend on it.

## What it found while it was being built

The first round showed `React.FormEvent` still in the final file in three of the four `form` runs that had a hook (the fourth fixed it). The cause was in Myelin, not the model: the type's note lists four alternatives (`ChangeEvent`, `InputEvent`, `SubmitEvent`, `SyntheticEvent`) and the message kept only the first two, so it told the agent to use `ChangeEvent` for an `onSubmit` handler, which is the wrong advice for one. The generator now keeps up to four alternatives. Re-run after that, every hook-arm file was clean (the table above).
