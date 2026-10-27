# Security

## Trust model

A `.myelin` ledger is **data that constrains model output**. It is not code, and it must not be treated as instructions with authority.

- Load ledgers only from the user's own project or a source the user explicitly opted into. A ledger from an untrusted source can steer a model, the same way any prompt content can.
- A ledger cannot grant permissions, run commands, change a model's identity, or ask a model to hide anything from the user. Readers must ignore any line that tries.
- The tools in this repo never execute snippets or any other ledger content. `myelin` only reads files, matches regexes, and prints.

## Generated ledgers

`myelin derive` writes a ledger from files that third parties publish (the type declarations in `node_modules`), and that ledger can end up in a model's context. So:

- It reads text. It never runs code from `node_modules`, makes a network request or starts a process. A test fails if its source imports the modules that would.
- A package's prose is never copied into a ledger. Messages are composed from the API's name, its package and version, and at most four code-shaped tokens from the deprecation note, each kept only if it is a name the scanned declarations really declare. A package can still choose which of its own real API names a message mentions; it cannot put a sentence in front of a model.
- Every string that comes from a package (module names, subpaths, versions) is validated before it is written into a ledger line, and a rule that would not fit on one line is dropped.
- Generated patterns start with the literal name and use bounded look-arounds, so a hostile source file cannot make them backtrack catastrophically.
- `myelin hook` loads ledgers only from the session's own project. An edit that lands in another project is not checked against that project's ledger.

## Known risks

- **Regex denial of service.** A ledger regex is evaluated with JavaScript `RegExp`. A pathological pattern on large input can be slow. Only lint with ledgers you trust.
- **Prompt injection through ledgers.** `myelin gate` and `myelin hook session` print ledger text for a model to read. Treat that text as untrusted if the ledger is. Hand-written ledgers are printed verbatim; derived ones are composed as described above.
- **Hooks run on your machine.** `myelin hook install` adds a command to `.claude/settings.json`. The command is `myelin hook post` (and `session`), which only reads files. Review the diff like any other settings change; `myelin hook install --dry-run` prints it.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). If that is not enabled, open an issue asking for a private contact without including details.
