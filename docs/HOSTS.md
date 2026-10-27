# Putting a ledger in front of a model

Models do not discover files on their own. Whatever runs the model (a chat, an agent, an IDE) has to hand it the ledger. Pick the mode that matches your host.

## 1. Chat with no tools

Generate the rules as text and paste them in.

```bash
myelin gate rules.myelin --all > rules.txt
```

Put `rules.txt` in the system prompt or the first message. Use `--snippets=id1,id2` if the prompt budget is tight. See [`integrations/system-prompt.txt`](../integrations/system-prompt.txt).

## 2. Agent with a shell

Add [`integrations/AGENTS.md.snippet`](../integrations/AGENTS.md.snippet) to your project's agent instructions. The agent then runs `myelin gate` before writing code and `myelin lint` after, and fixes every FAIL. This is the strongest mode because the check is mechanical.

## 3. Claude skills

Drop [`integrations/skill-bridge/SKILL.md`](../integrations/skill-bridge/SKILL.md) into your skills folder. It carries no rules itself; it tells the model to find the matching ledger, run `gate`, and `lint` the result.

## 3b. Claude Code hooks

Instructions in `AGENTS.md` are advice. A hook is code the host runs every time. `myelin hook install` adds two to `.claude/settings.json`:

- **PostToolUse** on `Edit`, `MultiEdit` and `Write`: checks only the text the agent just wrote against the project's ledgers (including the derived one) and, on a hit, prints the findings to stderr and exits 2, which Claude Code returns to the model. The edit has already happened; the message says so.
- **SessionStart**: prints the rules for the packages the project uses, as context.

Details, the escape hatch (`.myelin/ignore`) and what the hooks refuse to do are in [DERIVE.md](DERIVE.md#agent-hooks). The payload this reads is Claude Code's own: `tool_name`, `tool_input.file_path` and `new_string` or `content`, `cwd`. For another agent, call `myelin lint` from its hook mechanism, a pre-commit hook or CI.

## 4. CI

Reject generated code that breaks a ledger. This GitHub Actions job assumes the ledger and the `myelin` repo are checked out:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: node path/to/myelin/bin/myelin.mjs lint rules.myelin src/ --ext=js,ts
```

`lint` exits `1` on any violation, so the job fails.

### GitHub Action

The repository root has a composite action, [`action.yml`](../action.yml). It runs `lint` with the runner's Node and fails the job on any violation:

```yaml
- uses: actions/checkout@v4
- uses: REX-codebase/myelin@v0.3.0  # pin a release; @main tracks unreleased changes
  with:
    libs: detect                     # or: three,react  or  .myelin/rules.myelin
    paths: src                       # space-separated; default "."
    ext: js,ts                       # optional; default is the CLI's list
```

`libs: detect` reads the project's `package.json` and checks the bundled libs that match, plus `derived` when `.myelin/derived.myelin` is committed. Use `paths` to limit the scan to generated code. To fail CI when the committed derived ledger has fallen behind `node_modules`, add `run: myelin derive --check` after the install step.

## 5. Building a host

A minimal discovery loop:

1. Read the L0 header of each ledger in the project (`myelin header`).
2. If any `fires` word appears in the task text, load L1 (`myelin gate`).
3. When a rule points at `-> $id` or the task needs the code, load that snippet (`myelin snippet`).
4. After the model answers, run the checker. Feed failures back and retry a bounded number of times.

Trust rules for hosts:

- Load ledgers only from the user's own project or a source the user opted into.
- Treat a ledger as data that constrains output. Never let it grant permissions or run commands.
- Do not execute snippets because a ledger says to.
