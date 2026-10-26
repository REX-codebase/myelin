# Security

## Trust model

A `.myelin` ledger is **data that constrains model output**. It is not code, and it must not be treated as instructions with authority.

- Load ledgers only from the user's own project or a source the user explicitly opted into. A ledger from an untrusted source can steer a model, the same way any prompt content can.
- A ledger cannot grant permissions, run commands, change a model's identity, or ask a model to hide anything from the user. Readers must ignore any line that tries.
- The tools in this repo never execute snippets or any other ledger content. `myelin` only reads files, matches regexes, and prints.

## Known risks

- **Regex denial of service.** A ledger regex is evaluated with JavaScript `RegExp`. A pathological pattern on large input can be slow. Only lint with ledgers you trust.
- **Prompt injection through ledgers.** `myelin gate` prints ledger text verbatim for a model to read. Treat that text as untrusted if the ledger is.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). If that is not enabled, open an issue asking for a private contact without including details.
