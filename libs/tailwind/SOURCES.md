# Sources: tailwind ledger

Version researched: **Tailwind CSS 4.3.3** (npm `latest`, released 2026-07-16; 4.3.0 released 2026-05-08; `v3-lts` tag is 3.4.19). Docs site header shows v4.3. No v5 exists.
Researched: 2026-10-26.

Primary sources:
- UG = Upgrade guide (v3 -> v4): https://tailwindcss.com/docs/upgrade-guide
- V4 = Tailwind CSS v4.0 blog: https://tailwindcss.com/blog/tailwindcss-v4
- FD = Functions and directives: https://tailwindcss.com/docs/functions-and-directives
- PC = Install with PostCSS: https://tailwindcss.com/docs/installation/using-postcss
- SRC = Detecting classes in source files: https://tailwindcss.com/docs/detecting-classes-in-source-files
- CL = CHANGELOG: https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md
- LEG = legacy compat source: https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/src/compat/legacy-utilities.ts
- NPM = https://www.npmjs.com/package/tailwindcss

| Rule | Source | What changed |
|---|---|---|
| T1 | UG#removed-tailwind-directives | "In v4 you import Tailwind using a regular CSS @import statement, not using the @tailwind directives you used in v3": `@import "tailwindcss";` |
| T2 | UG#removed-deprecated-utilities | bg-/text-/border-/divide-/ring-/placeholder-opacity-* removed: "Use opacity modifiers like bg-black/50". Confirmed absent from v4 utilities.ts (truly gone). |
| T3 | UG#removed-deprecated-utilities; https://tailwindcss.com/docs/flex-grow, https://tailwindcss.com/docs/flex-shrink | "flex-shrink-* -> shrink-*", "flex-grow-* -> grow-*". Docs only list grow/shrink. Regex skips the CSS properties `flex-grow:` / `flex-shrink:`. Nuance: LEG still registers flex-grow/flex-shrink as undocumented compat aliases, so these still compile; banned because the official guide lists them as removed. |
| T4 | UG#removed-deprecated-utilities; https://tailwindcss.com/docs/text-overflow | "overflow-ellipsis -> text-ellipsis". Same compat-alias nuance as T3 (LEG). |
| T5 | UG#removed-deprecated-utilities; https://tailwindcss.com/docs/box-decoration-break | "decoration-slice -> box-decoration-slice", "decoration-clone -> box-decoration-clone". Same compat-alias nuance (LEG). Regex uses a lookbehind so box-decoration-* does not fire. |
| T6 | UG#using-postcss; PC | "in v4 the PostCSS plugin lives in a dedicated @tailwindcss/postcss package ... you can remove postcss-import and autoprefixer". |
| T7 | UG#using-tailwind-cli | "In v4, Tailwind CLI lives in a dedicated @tailwindcss/cli package": `npx @tailwindcss/cli -i input.css -o output.css`. |
| T8 | UG#using-a-javascript-config-file; FD (@config); SRC (safelisting) | "The corePlugins, safelist, and separator options from the JavaScript-based config are not supported in v4.0. To safelist utilities in v4 use @source inline()." UG#disabling-core-plugins: "no longer supported". |
| T9 | UG#theme-values-in-javascript | "In v3 we exported a resolveConfig function ... We've removed this in v4"; use CSS variables / getComputedStyle. |
| T10 | UG#variables-in-arbitrary-values | "we've changed the syntax for this in v4 to use parentheses instead of square brackets": `bg-(--brand-color)`. |

Preferences:
- P1 (size-shift renames): UG#renamed-utilities and UG#updated-shadow-radius-and-blur-scales: "The bare versions still work for backward compatibility, but the <utility>-sm utilities will look different unless updated". Not banned because `shadow`, `shadow-sm`, `rounded`, `rounded-sm`, `blur`, `blur-sm` etc. are all valid v4 classes with a new meaning (docs: https://tailwindcss.com/docs/box-shadow, /border-radius, /filter-blur).
- P2: UG#renamed-outline-utility (outline-none -> outline-hidden; new outline-none sets outline-style: none). Valid class, so not banned.
- P3: UG#default-ring-width-change, UG#default-ring-width-and-color (ring 3px -> 1px, blue-500 -> currentColor; use ring-3).
- P4: UG#default-border-color.
- P5: V4 (CSS-first @theme); https://tailwindcss.com/docs/dark-mode (`@custom-variant dark (&:where(.dark, .dark *))`); UG#adding-custom-utilities (@utility); FD (@plugin, @config); UG#using-a-javascript-config-file ("no longer detected automatically"). A tailwind.config.js is still supported via @config, so not banned.
- P6: V4 ("We've renamed bg-gradient-* to bg-linear-*"); https://tailwindcss.com/docs/background-image. bg-gradient-to-* still compiles (LEG), so preference only.
- P7: UG#the-important-modifier ("The old way is still supported for compatibility but is deprecated"), UG#using-a-prefix.
- P8: UG#variant-stacking-order, UG#hover-styles-on-mobile.
- P9: UG#using-the-theme-function.
- P10: UG#using-apply-with-vue-svelte-or-css-modules (@reference).
- P11: V4 (container queries in core); UG#individual-transform-properties (transform-none no longer resets; use scale-none etc.).
- P12: CL 4.1.15 ("Migrate deprecated break-words to wrap-break-word"), CL 4.2.0 ("Deprecate start-* and end-* utilities in favor of inset-s-* and inset-e-*").
- P13: UG#using-vite (@tailwindcss/vite).

Left out / unsure:
- Size-shift renames (shadow, rounded, blur, drop-shadow, backdrop-blur, ring, outline-none) are deliberately NOT bans: the old names are valid v4 classes.
- `theme(colors.red.500)` dot notation and `bg-gradient-to-*`, leading `!important`: still work in v4, preferences only.
- `tailwind.config.js` with `theme.extend` / `content` / `darkMode`: still loadable via `@config`, so not banned; only the unsupported keys (corePlugins, safelist) are.
- Grid/object arbitrary values with commas (UG#arbitrary-values-in-grid-and-object-position-utilities) skipped: a regex cannot tell `[max-content,auto]` from legitimate commas inside `repeat(...,minmax(...))`.
- Validator warns that `$vite` and `$reference` are not referenced by a ban (they are referenced from preferences P13/P10, which the validator does not count). Harmless warnings.
