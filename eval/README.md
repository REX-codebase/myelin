# Eval harness

Whether a ledger actually beats plain prose is an empirical question. This folder is the scaffold for answering it. **No results are included, and none are claimed.**

## What it does

`run-eval.mjs` scores outputs you have already collected. It never calls a model, so it needs no API keys and works with any model, any host.

```
node eval/run-eval.mjs examples/three-webgpu-hut/hut.myelin outputs/ --csv=results.csv
```

## Layout of `outputs/`

```
outputs/
  <model>/
    <condition>/
      run1.js          # a run is a file ...
      run2/            # ... or a directory of files
        scene.js
        grass.js
```

## Suggested conditions

| condition | what the model sees |
|---|---|
| `baseline` | the task prompt only (`tasks/hut.task.txt`) |
| `prose` | the task prompt plus the same rules written as plain prose or a SKILL.md |
| `gate` | the task prompt plus `myelin gate <ledger> --all` |
| `gate-lint` | like `gate`, and the model is told to run `myelin lint` and fix every FAIL before answering |

Run each model/condition several times (at least 10) and keep the temperature the same. A single run says nothing.

## What the score means

A run **passes** when it has zero violations: no `!` rule matches and every `+` rule matches across all its files. The table reports pass rate and mean violations per run.

This measures rule compliance only. It does not tell you the code renders, looks good, or is correct. Pair it with a human or runtime check before drawing conclusions.
