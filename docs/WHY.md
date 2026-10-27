# Ledger or skill?

A skill and a ledger solve different problems. This page says where each is the better tool. None of it is measured yet; see [eval/](../eval/README.md).

## The difference in one line

A skill is **prose a model interprets**. A ledger is **rules a model or a script can verify**.

## Comparison

| | skill (SKILL.md) | myelin ledger |
|---|---|---|
| Form | Markdown with front matter and instructions | Line-based rules with regexes and snippets |
| Best at | judgment, workflow, taste, how to approach a task | hard constraints: banned APIs, required patterns, exact code |
| Verifiable | no: the model has to remember | yes: `myelin lint` or a model checklist |
| Loading | host-supported in some products | none yet: you wire it in ([HOSTS](HOSTS.md)) |
| Token cost | whole body once loaded | header always, rules on match, snippets on demand |
| Portable | tied to hosts that implement skills | plain text, any model |
| Failure mode | model forgets or drifts silently | rule is too narrow or too broad as a regex |

## Use a ledger when

- You can name concrete things the output must never contain or must always contain.
- Weaker models drift on a long prose instruction and you want a copy-exact snippet instead.
- You want CI to reject output that breaks a convention.
- The same rules must reach several models or hosts.

## Use a skill when

- The guidance is about judgment: tone, structure, design taste, a multi-step workflow.
- You are in a host that already loads skills and you want zero setup.
- A rule cannot be written as a regex without becoming meaningless.

## Use both

Keep judgment in a skill and hard rules in a ledger. [`integrations/skill-bridge`](../integrations/skill-bridge/SKILL.md) is a thin SKILL.md whose only job is to make the model run `myelin gate` and `myelin lint`.

## What a ledger cannot do

- It cannot prove the output is correct, only that it avoids and includes certain text.
- It cannot make a model comply. The linter does that, by failing the check.
- Discovery is on you. Nothing finds a `.myelin` file on its own.

## Docs tools, hooks and ledgers

There is a third approach to stale code: put the current documentation in front of the model (an MCP docs server, `llms.txt`, an indexed docs site). That is retrieval, and it helps. Two things it does not do:

- **Check the result.** The model can still ignore the page, misread it, or prefer what it memorised. Nothing runs after it writes.
- **Read your lockfile.** Some tools can fetch docs for a named version, but the version is something the model or the user has to name. The one that matters is already in `node_modules`.

A ledger is a different shape: short, checkable, and it runs afterwards. `myelin derive` takes the version question from the library itself (its own `@deprecated` tags, as installed), and `myelin hook` removes the dependence on the model remembering to run anything. They are not substitutes for each other. Retrieval is how a model learns the new API; the hook is how you find out it used the old one anyway.

| | docs retrieval | prose rules (`AGENTS.md`, skills) | ledger + hook |
|---|---|---|---|
| Puts current knowledge in context | yes | yes | yes (rules for the packages you use) |
| Knows the installed version | if you name it | no | yes, for derived ledgers |
| Checks what the model wrote | no | no | yes, after every edit |
| Works if the model forgets | no | no | yes: the host runs it |
| Cost when nothing is wrong | tokens per lookup | tokens every session | about 0.2 s per edit |
