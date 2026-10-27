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
- Use `when` (needs `myelin 1.1` on the first line) to scope a rule to files about one library: `! B3 /\.email\(/ when /from\s+['"]zod['"]/`. The rule then cannot fire on a `.email(` call in a file that never imports zod. Combine both: `when` says where the rule applies, `unless` says where it is lifted.
- Do not hand-write rules for something `myelin derive` can read from the library's own `@deprecated` tags. Write the ones it cannot: removed APIs, changed behaviour, config and CSS.

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

- a ban that fires on comments or strings (add `comments skip` to the header unless your rules target comments),
- a requirement so loose it always passes,
- an `unless` that exempts too much.

## Keep a bundled ledger in step with its library

A bundled ledger targets one release. When you re-verify one, change three things together: the `= version` and `= verified` lines in `libs/<id>/<id>.myelin`, and that library's entry in `libs/pins.json`. A test fails if the pin is not the version the ledger names.

`npm run drift` compares every pin with npm's latest release and says which ledgers are behind. A weekly workflow runs it and keeps one issue open while any ledger is a minor or major release behind.

## When a rule will not fit a regex

Move it to `~` as a preference, or to a skill. Do not write a regex so broad that it fires on correct code.
