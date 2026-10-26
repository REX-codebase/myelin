# Sources: zod ledger

Researched 2026-10-26. npm registry (https://registry.npmjs.org/zod): `latest` = 4.6.7 (2026-10-12). zod.dev banner: "Zod 4.6 is out".
No Zod 5 exists; Zod 4 is the current major.

Abbreviations:
- CL  = https://zod.dev/v4/changelog (official migration guide)
- V4  = https://zod.dev/v4 (release notes)
- API = https://zod.dev/api
- ERR = https://zod.dev/error-formatting, ERRC = https://zod.dev/error-customization

| ID | Source | What changed |
|---|---|---|
| B1 | CL #deprecates-email-etc; V4 | String formats moved to top level (`z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`...); "The method forms (`z.string().email()`) still exist ... but are now deprecated." V4: "They'll be removed in the next major version." |
| B2 | CL #drops-zstringip, #drops-zstringcidr | `z.string().ip()` / `.cidr()` dropped; use `z.ipv4()`/`z.ipv6()`/`z.cidrv4()`/`z.cidrv6()`. |
| B3 | CL #deprecates-message-parameter | "Replaces `message` param with `error`. The old `message` parameter is still supported but deprecated." |
| B4 | CL #drops-invalid_type_error-and-required_error | "The `invalid_type_error` / `required_error` params have been dropped." |
| B5 | CL #drops-errormap; ERRC (global: `z.config({ customError })`) | "`errorMap` ... is renamed to `error`." |
| B6 | CL #deprecates-format, #deprecates-flatten; ERR | `.format()`/`.flatten()` on ZodError deprecated; use `z.treeifyError()`; ERR documents `z.flattenError()` and `z.prettifyError()`. |
| B7 | CL #drops-errors | "This API was an alias for `.issues` in Zod v3 but has been removed. Use `.issues` instead." |
| B8 | CL #deprecates-strict-and-passthrough, #deprecates-strip, #drops-nonstrict | Use `z.strictObject()` / `z.looseObject()`; `.strip()` deprecated; `.nonstrict()` removed. (The old methods are "legacy" and won't be removed — banned here as outdated style.) |
| B9 | CL #deprecates-merge | "`.merge()` ... deprecated in favor of `.extend()`"; or spread `.shape`s. |
| B10 | CL #znativeenum-deprecated; API Enums | "`z.nativeEnum()` function is now deprecated in favor of just `z.enum()`." |
| B11 | CL #drops-deeppartial | "now removed in Zod 4. There is no direct alternative to this API." |
| B12 | CL #zpromise-deprecated; API Promises | "`z.promise()` is deprecated ... simply await it before parsing it with Zod." |
| B13 | CL #zfunction | `z.function()` result "is no longer a Zod schema"; define `input`/`output` upfront instead of `args()`/`.returns()`; `.implementAsync()` for async. |
| B14 | CL #drops-single-argument-usage | `z.record(z.string())` no longer supported; `z.record(z.string(), z.string())`. |
| B15 | CL #znativeenum-deprecated | `ColorSchema.Enum.Red` and `ColorSchema.Values.Red` removed; `.enum.Red` is canonical. |
| B16 | CL #drops-ctxpath | "`ctx.path; // ❌ no longer available`". |
| B17 | CL #moves-_def, #drops-zodeffects, #updates-generics | `._def` moved to `._zod.def`; `ZodEffects` dropped; "The need for `z.ZodTypeAny` has been eliminated; just use `z.ZodType` instead." |
| P1 | V4, API (all examples use `import * as z from "zod"`) | Docs' canonical import. `import { z } from "zod"` still works, so it is a preference, not a ban. |
| P3 | CL #no-infinite-values, #int-accepts-safe-integers-only | Infinity rejected; `.int()` safe integers only; "You should switch to `z.int()`." |
| P4 | CL #default-updates | `.default()` short-circuits and must match the output type; `.prefault()` gives the old behaviour. |

Snippets: adapted from CL and API examples. Not type-checked.

Left out (unsure or not regex-safe): `.refine(fn, fn)` second-argument-function overload (removed, but hard to match without
false positives); `.nonempty()` type change and `.default()` semantics (behaviour, not tokens); `z.setErrorMap` (not named in
the v4 changelog, so not verified); `z.ostring()` etc. (undocumented, rare); `ZodError.addIssue()` deprecation (would
collide with `ctx.addIssue`, which is still valid inside `.superRefine()`).
