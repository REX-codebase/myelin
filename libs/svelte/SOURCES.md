# Sources: svelte ledger

Researched 2026-10-26. Versions from the npm registry (https://registry.npmjs.org/svelte, https://registry.npmjs.org/@sveltejs/kit):
svelte `latest` = 5.57.2 (2026-10-06), @sveltejs/kit `latest` = 3.1.0 (2026-10-15). SvelteKit 3.0 shipped 2026-10-01
(https://svelte.dev/blog/sveltekit-3-is-here), so SvelteKit rules target v3, not v2.

Abbreviations:
- MIG5 = https://svelte.dev/docs/svelte/v5-migration-guide
- KIT3 = https://svelte.dev/docs/kit/migrating-to-sveltekit-3
- REF  = https://svelte.dev/docs/svelte/svelte (API reference, deprecation tags)

| ID | Source | What changed |
|---|---|---|
| B1 | MIG5 #Reactivity-syntax-changes-export-let-$props; https://svelte.dev/docs/svelte/legacy-export-let | "In Svelte 5, all properties are declared through the `$props` rune, through destructuring." |
| B2 | MIG5 #Reactivity-syntax-changes-$:-$derived-$effect; https://svelte.dev/docs/svelte/legacy-reactive-assignments | `$:` derivations become `$derived`, side effects become `$effect` ("90% of the time you want `$derived`"). |
| B3 | MIG5 #Event-changes, #Event-changes-Event-modifiers; https://svelte.dev/docs/svelte/legacy-on | `on:click` becomes `onclick`; modifiers "do not work with modern event handlers"; the on: directive is deprecated. |
| B4 | MIG5 #Event-changes-Component-events; REF #createEventDispatcher | "This function is deprecated in Svelte 5. Instead, components should accept callback props." |
| B5 | MIG5 #Snippets-instead-of-slots, #Snippets-instead-of-slots-Default-content; https://svelte.dev/docs/svelte/legacy-slots | "slots are deprecated in Svelte 5"; `<slot />` becomes `{@render children?.()}`. Custom elements still use `<slot />` (hence `unless /customElement/`). |
| B6 | MIG5 #Snippets-instead-of-slots-Passing-data-back-up; https://svelte.dev/docs/svelte/legacy-svelte-fragment | `slot="x"`, `let:` and `<svelte:fragment>` replaced by `{#snippet x(args)}`; svelte:fragment "obsolete" in Svelte 5+. |
| B7 | MIG5 #Components-are-no-longer-classes | Components are functions: `new App({target})` becomes `mount(App, {target})`; `$on`/`$set`/`$destroy` replaced by callbacks, `$state` props, `unmount`. |
| B8 | MIG5 export let section; https://svelte.dev/docs/svelte/legacy-$$props-and-$$restProps | `$$props`/`$$restProps` replaced by `let props = $props()` / `let { a, ...rest } = $props()`. |
| B9 | MIG5 #Other-breaking-changes-beforeUpdate-afterUpdate-changes; REF #beforeUpdate, #afterUpdate; https://svelte.dev/docs/svelte/lifecycle-hooks | Deprecated; "disallowed in runes mode — use `$effect.pre(...)` and `$effect(...)` instead." |
| B10 | MIG5 #svelte:component-is-no-longer-necessary; https://svelte.dev/docs/svelte/legacy-svelte-component; https://svelte.dev/docs/svelte/legacy-svelte-self | Components are dynamic in runes mode; svelte:self "obsolete, as components can import themselves". |
| B11 | https://svelte.dev/docs/svelte/svelte-legacy; MIG5 #Migration-script-run | "All imports are marked as deprecated and should be migrated away from over time." |
| B12 | MIG5 #Components-are-no-longer-classes-Component-typing-changes; REF #SvelteComponent, #ComponentType | `SvelteComponent` deprecated in favour of `Component`; `ComponentEvents` and `ComponentType` deprecated. |
| K1 | KIT3 #$app-stores-(removed) | "The `$app/stores` module ... has been removed. Use `$app/state` instead." |
| K2 | KIT3 #$app-environment-(renamed), #$service-worker-(removed); https://svelte.dev/docs/kit/$app-env | `$app/environment` renamed to `$app/env`; `$service-worker` removed (version from `$app/env`, assets from `$app/manifest`). |
| K3 | KIT3 #$env-(deprecated); https://svelte.dev/docs/kit/environment-variables | `$env/*` deprecated (removed in Kit 4) in favour of `defineEnvVars` in `src/env.ts` + `$app/env/private` / `$app/env/public`. |
| K4 | KIT3 #$lib-is-now-lib | "`$lib` alias is no longer generated automatically"; use `#lib` in package.json `imports`, with file extensions. |
| K5 | KIT3 #$app-navigation-invalidateAll-is-deprecated-in-favour-of-refreshAll, #$app-navigation-goto-options-are-updated | `invalidateAll` deprecated for `refreshAll`; goto `keepFocus`/`noScroll` combined as `reset: false`, `replaceState` is now `replace`. |
| K6 | KIT3 #$app-navigation-Changes-to-shallow-routing | "`pushState/replaceState` are deprecated in favor of `goto`" with `{ shallow: true, state }`. |
| K7 | KIT3 #$app-paths-base-assets-and-resolveRoute-removed | `base`, `assets`, `resolveRoute` removed; use `resolve(...)` and `asset(...)`, without leading `/` for paths. |
| K8 | KIT3 #sveltejs-kit-json-and-text-are-deprecated | "`json(...)` and `text(...)` ... are deprecated. Use `Response.json(...)` and `new Response(text)`." |
| K9 | KIT3 #Error-handling-error()-arguments-changed | "the second argument must always be a `string`. If there are additional properties, they must be passed as a third argument." |
| K10 | KIT3 #Configuration-svelte.config.js-is-no-longer-supported | Config must be passed to the `sveltekit` Vite plugin; `config.kit.*` options become top-level plugin options. |
| P1 | MIG5 $: section | "spoiler alert: 90% of the time you want `$derived`". |
| P2 | https://svelte.dev/docs/svelte/stores | Stores still supported; with runes "these use cases have greatly diminished" — use `$state` in `.svelte.js` for shared state. |
| P3 | MIG5 #Breaking-changes-in-runes-mode-Bindings-need-to-be-explicitly-defined-using-$bindable() | Props are not bindable by default in runes mode. |

Snippets: adapted from MIG5 examples, https://svelte.dev/docs/kit/$app-paths, https://svelte.dev/docs/kit/environment-variables and KIT3's vite.config example. Not compiled.

Left out (unsure or too broad for regex): `use:` actions vs `{@attach}` (attachments exist, actions not deprecated); SvelteKit
remote functions (still experimental); `redirect()` external opt-in (cannot tell external URLs by regex reliably);
`data-sveltekit-*="off"` (minor); `csrf.checkOrigin` and `@sveltejs/kit/node/polyfills` removals (rare in model output).
