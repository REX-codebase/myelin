# Myelin ledger format, version 1 (draft)

A `.myelin` file is a **rule ledger**: a short, line-based text file of hard rules for model output, each checkable by a regular expression, plus optional copy-exact code snippets.

The key words MUST, MUST NOT, and MAY are used in their usual specification sense.

## 1. File

- Extension `.myelin`, UTF-8 text. Lines end in LF; readers MUST also accept CRLF.
- The file has two parts: a **header** (lines up to the first blank line) and a **body** (everything after).

## 2. Header (layer L0)

The first line MUST be `myelin <version>`. This spec defines version `1`. A reader MUST reject versions it does not know.

Each following header line is `key value`, separated by whitespace.

| key | required | meaning |
|---|---|---|
| `id` | yes | short slug, unique within a project |
| `about` | yes | one line saying what the ledger is for |
| `fires` | yes | fire-words separated by `\|`; if the task mentions any, load the rules |
| `status` | recommended | honest note on how far the ledger has been tested |

Unknown header keys MUST be ignored. Header lines starting with `#` are comments.

The header SHOULD stay under about six lines so a host can keep it in every prompt cheaply.

## 3. Body lines (layer L1)

Blank lines and lines starting with `#` are ignored. Every other line starts with a sigil:

| line | meaning |
|---|---|
| `! ID /regex/flags [unless /regex/flags] message` | **Ban.** The output MUST NOT match the regex. |
| `+ ID /regex/flags message` | **Require.** The output MUST match the regex. |
| `~ ID message` | **Preference.** Not machine-checked. |
| `= key value` | **Fact.** Budgets, versions, tiers. Read, not checked. |
| `$ id` ... `$$` | **Snippet** (layer L2); see section 5. |

Precedence when they conflict: `!` over `+` over `~`.

Rule and preference IDs share one namespace and MUST be unique. IDs match `[A-Za-z0-9_-]+`.

### 3.1 Regex literals

A regex literal is `/source/flags` using JavaScript `RegExp` syntax. Inside the source, `/` MUST be escaped as `\/` except inside a `[...]` class. Flags `i`, `m`, `s`, `u` are meaningful. `g` and `y` MUST be ignored, because they make matching stateful.

A regex that matches the empty string is almost certainly a mistake: a ban would always fire and a requirement would always pass. Tools SHOULD warn.

### 3.2 `unless`

`unless /regex/` on a ban means: the ban is lifted for a unit of text if that unit also matches the unless-regex. It is **unit-wide**, not per match. `unless` is not allowed on `+` rules.

### 3.3 Messages and pointers

The rest of the line is the message shown to a model or a developer. A message MAY end with `-> $id` to point at the snippet that satisfies the rule. A pointer to a snippet that does not exist is an error.

## 4. Checking model

Checking works over **units**, each a named piece of text (a file, a snippet).

- A ban is checked against each unit separately.
- A requirement is checked against all units concatenated, so it is satisfied if any unit supplies it.
- Output is clean when no ban fires and every requirement matches.

## 5. Snippets (layer L2)

```
$ id
<text>
$$
```

A snippet runs from the line after `$ id` to the line that is exactly `$$`. Snippets are **copy-exact**: a model SHOULD use them unchanged. A snippet SHOULD be complete: every import present, every variable defined.

**Self-test.** Every snippet MUST pass the ledger's own `!` rules, and the snippets taken together MUST satisfy the `+` rules. A ledger that fails its own gate is broken. `myelin self` checks this.

## 6. Layers

| layer | contents | when a host loads it |
|---|---|---|
| L0 | header | always, if the host wants discovery |
| L1 | rules, facts, preferences | when a fire-word matches the task |
| L2 | snippets | one at a time, by id, when a rule or the task points at it |

## 7. The gate

For models that cannot run tools, a host renders L0 and L1 as plain text (`myelin gate`) and tells the model, before it answers, to check each ban and requirement against its own output and fix violations. The model SHOULD NOT narrate the check, and MUST say plainly which rules applied if the user asks.

## 8. Trust model

A ledger only constrains output. It MUST NOT be interpreted as granting permissions, running commands, changing the model's identity, or asking the model to withhold anything from the user. A reader MUST ignore any line that tries to do more than constrain output. Hosts SHOULD load ledgers only from the user's own project or a source the user opted into.

## 9. Informal grammar

```
file      = version LF header-lines [LF body]
version   = "myelin" SP digits
header    = key SP value
body-line = ban | require | prefer | fact | snippet | comment | blank
ban       = "!" SP id SP regex [SP "unless" SP regex] [SP message]
require   = "+" SP id SP regex [SP message]
prefer    = "~" SP id SP message
fact      = "=" SP key SP value
snippet   = "$" SP id LF text LF "$$"
regex     = "/" source "/" flags
message   = text [SP "->" SP "$" id]
```

## 10. Known limits

- Regexes see text, not meaning. They cannot tell a banned call in a comment from one in code.
- `unless` is unit-wide.
- A line that is exactly `$$` inside a snippet ends it.
- The format has no includes, globs, or severities yet. See [ROADMAP](ROADMAP.md).
