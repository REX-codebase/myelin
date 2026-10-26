# Writing a good ledger

## Start from the failures

Write a rule only for something a model has actually done wrong, or that you know it will. A short ledger people trust beats a long one they ignore.

```
myelin init my-rules.myelin
```

## Bans

- Ban the **concrete token**, not the idea. `/Math\.random\(/` works; "avoid randomness" does not.
- Anchor with `\b` and escape dots and parentheses so `random` in a variable name does not fire.
- Put the **fix in the message**, and point at a snippet: `Use the seeded rng. -> $rng`. A ban without an alternative just makes the model guess.
- Use `unless` for "allowed only with": `! B7 /new THREE\.DirectionalLight\(/ unless /shadow\.bias\s*=\s*-0\.0005/`. Remember it is **unit-wide**: one match anywhere in the file exempts the whole file.

## Requirements

- Require a **marker** that proves the right approach was taken: `/await renderer\.init\(\)/`, `/raise_for_status\(\)/`.
- Requirements are checked across all files together, so they work for multi-file output.

## Snippets

- Make each one **complete**: imports, defined variables, no placeholders.
- Keep each small enough to fetch alone. One concern per snippet.
- If a snippet needs an asset you cannot supply, take it as a parameter instead of inventing a path.

## Header

- Keep it under six lines.
- `fires` lists words from the task text that should load the rules. Prefer specific words (`webgpu`, `tsl`) over generic ones (`code`).
- `status` is a promise to be honest. Say when snippets have not been run.

## Facts and tiers

Use `=` lines for budgets so a model picks one instead of inventing numbers:

```
= tier.mid   grass=200000 fray=3000
```

## Test it

```
myelin validate my-rules.myelin    # well-formed?
myelin self my-rules.myelin        # do your own snippets pass your own rules?
```

Then feed it real output, good and bad, and see whether the rules fire when they should and stay quiet when they should. Watch for:

- a ban that fires on comments or strings,
- a requirement so loose it always passes,
- an `unless` that exempts too much.

## When a rule will not fit a regex

Move it to `~` as a preference, or to a skill. Do not write a regex so broad that it fires on correct code.
