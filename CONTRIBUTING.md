# Contributing

Thanks for helping. This project is small and deliberately dependency-free, so please keep it that way.

## Setup

Node 18 or newer. There is nothing to install.

```bash
npm test          # node:test suite
npm run self      # every example ledger must pass its own rules
npm run check     # both
```

## What makes a good change

- **Format changes** start with an edit to [docs/SPEC.md](docs/SPEC.md) and a test, before code. Keep v1 backward compatible; larger ideas go in [docs/ROADMAP.md](docs/ROADMAP.md).
- **New example ledgers** must pass `myelin self`, state their test status honestly in `status`, and avoid claims they cannot back up.
- **Bug fixes** need a failing test first.
- **No runtime dependencies.** Dev-time tooling is fine if it is optional.

## Style

Plain ES modules, no build step, no transpiler. Prefer small functions and clear names. Comments say why, not what.

## Evidence

If you claim a ledger improves model compliance, include the numbers from [eval/](eval/README.md): models, conditions, run counts, and the full table, including results that were not flattering.

## License
Contributions to Myelin are licensed under the [MIT License](LICENSE). By submitting a contribution, you agree that it may be distributed under the same license.

## Library ledgers

The fastest way to help: a library changed and models still write the old API. See [libs/README.md](libs/README.md). Every rule needs an official source link and a bench file, and `npm run check` must pass.
