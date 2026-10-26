# Sources: vue ledger

Versions researched (npm registry dist-tags, 2026-10-26):
- **vue 3.5.44** (latest, published 2026-10-13). 3.6.0 is at rc.13 (not stable); not targeted.
- **vue-router 5.4.0** (latest). v5 "merges unplugin-vue-router into the core package with no breaking changes" (https://github.com/vuejs/router/releases/tag/v5.0.0), so the v3 -> v4 migration rules still apply.
- **nuxt 4.6.2** (latest, 2026-10-16). Nuxt 5 is in development (testable via `future.compatibilityVersion: 5`); not targeted.
- pinia 4.1.0 (latest).

Researched: 2026-10-26.

Primary sources:
- M = Vue 3 Migration Guide, breaking changes index: https://v3-migration.vuejs.org/breaking-changes/ (page sources: https://github.com/vuejs/v3-migration-guide/tree/main/src/breaking-changes)
- V35 = Announcing Vue 3.5: https://blog.vuejs.org/posts/vue-3-5
- R = Vue Router migration (3 -> 4): https://router.vuejs.org/guide/migration/
- N = Nuxt 4 upgrade guide: https://nuxt.com/docs/4.x/getting-started/upgrade

| Rule | Source | What changed |
|---|---|---|
| B1 | https://v3-migration.vuejs.org/breaking-changes/global-api | "in Vue 3 we introduce... createApp"; root instance is no longer `new Vue()`. |
| B2 | https://v3-migration.vuejs.org/breaking-changes/global-api ; https://v3-migration.vuejs.org/breaking-changes/global-api-treeshaking ; M ("Global functions set and delete ... are no longer required") | Table: Vue.config -> app.config, Vue.component -> app.component, Vue.directive -> app.directive, Vue.mixin -> app.mixin, Vue.use -> app.use, Vue.prototype -> app.config.globalProperties, Vue.extend removed (use defineComponent). Vue.filter removed with filters. |
| B3 | https://v3-migration.vuejs.org/breaking-changes/filters | "Filters are removed from Vue 3.0 and no longer supported"; replace with method calls or computed properties. Regex skips `||`. |
| B4 | https://v3-migration.vuejs.org/breaking-changes/events-api | "$on, $off and $once instance methods are removed"; event bus can be replaced by mitt or tiny-emitter. Regex limited to this/vm/$root/$parent/*Bus receivers so Prisma's `prisma.$on` is not flagged. |
| B5 | https://v3-migration.vuejs.org/breaking-changes/listeners-removed ; https://v3-migration.vuejs.org/breaking-changes/slots-unification | "$listeners object has been removed in Vue 3. Event listeners are now part of $attrs"; "$scopedSlots property is removed and all slots are exposed via $slots as functions". |
| B6 | https://v3-migration.vuejs.org/breaking-changes/v-model | "v-bind's .sync modifier and component model option are removed and replaced with an argument on v-model". |
| B7 | https://v3-migration.vuejs.org/breaking-changes/children ; M (Removed APIs: `$destroy`, `$set`, `$delete`) | "$children instance property has been removed from Vue 3.0 ... we recommend using $refs". |
| B8 | M ("The destroyed lifecycle option has been renamed to unmounted"; "The beforeDestroy lifecycle option has been renamed to beforeUnmount") | Renamed lifecycle hooks. |
| B9 | https://v3-migration.vuejs.org/breaking-changes/functional-components | "functional attribute on single-file component (SFC) <template> is removed"; "{ functional: true } option in components created by functions is removed". |
| B10 | https://v3-migration.vuejs.org/breaking-changes/v-on-native-modifier-removed | ".native modifier for v-on has been removed"; undeclared listeners are added to the root via $attrs. |
| B11 | https://v3-migration.vuejs.org/breaking-changes/keycode-modifiers | "Using numbers, i.e. keyCodes, as v-on modifiers is no longer supported"; "config.keyCodes is no longer supported". |
| B12 | https://v3-migration.vuejs.org/breaking-changes/v-model ; https://vuejs.org/guide/components/v-model.html | v-model prop `value` -> `modelValue`, event `input` -> `update:modelValue`; `model` option removed. defineModel() is the recommended approach since 3.4. |
| B13 | https://v3-migration.vuejs.org/breaking-changes/render-function-api | "h is now globally imported instead of passed to render functions as an argument"; VNode props structure flattened. |
| B14 | https://v3-migration.vuejs.org/breaking-changes/transition | "The v-enter transition class has been renamed to v-enter-from and the v-leave transition class has been renamed to v-leave-from." |
| B15 | https://v3-migration.vuejs.org/breaking-changes/custom-directives | bind -> beforeMount, inserted -> mounted, update removed, componentUpdated -> updated, unbind -> unmounted. |
| B16 | R ("new Router becomes createRouter"; "New history option to replace mode"; "Removed * (star or catch all) routes" -> `/:pathMatch(.*)*`) | Vue Router 4+ API; unchanged in v5. |
| B17 | N#removal-of-window__nuxt__-object | "We are removing the global window.__NUXT__ object after the app finishes hydration" -> useNuxtApp().payload. |
| B18 | N#removal-of-deprecated-boolean-values-for-dedupe-option... | refresh({ dedupe: true }) -> 'cancel', false -> 'defer'. |
| B19 | N#unhead-v2 | Unhead v2 "Removed props: vmid, hid, children, body". |
| B20 | N#removal-of-top-level-generate-configuration | "The top-level generate configuration option is no longer available in Nuxt 4" -> nitro.prerender (routes, ignore). |

Preferences / facts:
- P2 (reactive props destructure stable in 3.5, defaults via JS syntax, wrap in getter for watch): V35 "Reactive Props Destructure".
- P3 useTemplateRef (3.5): V35 "useTemplateRef()". defineModel: https://vuejs.org/api/sfc-script-setup.html#definemodel (stable since 3.4).
- P4 Pinia / Vite recommendations: https://v3-migration.vuejs.org/recommendations
- P5 Nuxt 4 app/ srcDir, shared/, `pending` alignment, `undefined` defaults, shallowRef data: N (New Directory Structure; Alignment of pending value; Default data and error values; Shallow Data Reactivity).
- useId (3.5): V35.

Left out (unsure or too noisy for regex):
- `v-if`/`v-for` precedence change, `v-bind` merge order, `$attrs` including class/style: behavioral, not token-level.
- Async components needing defineAsyncComponent: regex would collide with vue-router lazy `component: () => import(...)`.
- Vuex (`new Vuex.Store`): Vuex 4 still works; kept as preference P4 only.
- Vue 3.6 / Vapor mode and Nuxt 5 changes: not stable as of 2026-10-26.
