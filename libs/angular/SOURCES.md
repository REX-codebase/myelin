# Sources: angular ledger

Researched 2026-10-26. npm registry (`https://registry.npmjs.org/@angular/core`): `latest` = 22.2.3 (2026-10-14). `@angular/cli` latest = 22.2.4 (2026-10-22). Target: Angular 22.

Access note: `angular.dev` returned a 403 from the sandbox egress proxy (policy denial), so the rendered docs site was not read. Every citation below is the **same official content from the public `angular/angular` repository on `main`**:

- CL  = https://github.com/angular/angular/blob/main/CHANGELOG.md (raw: https://raw.githubusercontent.com/angular/angular/main/CHANGELOG.md). Quoted sections are named below.
- DOC = the adev docs source, `https://github.com/angular/angular/blob/main/adev/src/content/<path>` (raw: `https://raw.githubusercontent.com/angular/angular/main/adev/src/content/<path>`). angular.dev renders these files.

Release sections in CL used: `20.0.0 (2025-05-28)`, `20.2.0 (2025-08-20)`, `21.0.0 (2025-11-19)`, `21.2.0 (2026-02-25)`, `18.0.0 (2024-05-22)`, `19.0.0 (2024-11-19)`, `22.0.0 (2026-06-03)`, `22.1.0 (2026-07-29)`. The 22.1.x and 22.2.x patch sections contain no new deprecations or removals.

## Bans

| ID | Source | What changed |
|---|---|---|
| A1 | CL `20.0.0` > Deprecations > core: "`ngIf`/`ngFor`/`ngSwitch` are deprecated. Use the control flow blocks instead (`@for`/`@if`/`@switch`)." DOC `guide/templates/control-flow.md` (the replacement syntax). | Structural directives deprecated in 20.0. |
| A2 | CL `18.0.0` > Deprecations > http: "`HttpClientModule`, `HttpClientXsrfModule` and `HttpClientJsonpModule`" are deprecated. DOC `guide/http/setup.md`: "`HttpClientModule` and `HttpClientXsrfModule` are also deprecated. Use `provideHttpClient` with the corresponding features instead." | `provideHttpClient()` replaces the NgModules. The JSONP module is covered by A5. |
| A3 | CL `22.0.0` > Deprecations > http: "`withFetch` is now deprecated, it can be safely removed." Same release: "Use `FetchBackend` as default for the `HttpBackend` implementation" (feat, 5c432fb8bb). | fetch is the default backend, so `withFetch()` is a no-op. |
| A4 | CL `22.0.0` > Deprecations > http: "The `reportProgress` option is deprecated please use `reportUploadProgress` & `reportDownloadProgress` instead." | Option renamed. |
| A5 | CL `22.1.0` > Deprecations: "`HttpClient.jsonp`, `HttpClientJsonpModule`, and related JSONP classes/functions are deprecated. Use standard HTTP requests instead." Also the 22.0 changelog warns that `withJsonpSupport()` is deprecated. | Matches `this.http.jsonp(`, `withJsonpSupport(`, `HttpClientJsonpModule`. |
| A6 | CL `22.0.0` > Breaking Changes > router: "`provideRoutes()` has been removed. Use `provideRouter()` or `ROUTES` as multi token if necessary." | Removed. |
| A7 | CL `22.0.0` > Breaking Changes > core: "`ComponentFactoryResolver` and `ComponentFactory` are no longer available. Pass the component class directly to APIs that previously required a factory, such as `ViewContainerRef.createComponent`." | Removed from the public API. |
| A8 | CL `22.0.0` > Breaking Changes > core: "`createNgModuleRef` was removed, use `createNgModule` instead". | Removed. |
| A9 | CL `22.0.0` > Breaking Changes > core: "`ChangeDetectorRef.checkNoChanges` was removed. In tests use `fixture.detectChanges()` instead." | Removed. |
| A10 | CL `20.0.0` > Deprecations > platform-browser: "HammerJS support is deprecated and will be removed in a future major version."; CL `22.0.0` > Breaking Changes > platform-browser: "Hammer.js integration has been removed. Use your own implementation." | Removed in 22.0. Matches `HammerModule`, `HAMMER_GESTURE_CONFIG`, `HammerGestureConfig` and an import of `hammerjs`. |
| A11 | CL `20.0.0` > Deprecations > platform-browser: "All entries of the `@angular/platform-browser-dynamic` ..." (commit bc2cab747f, "Deprecate the `platform-browser-dynamic` package"). | Package deprecated. Bootstrap with `bootstrapApplication` from `@angular/platform-browser`. |
| A12 | CL `20.2.0` > Deprecations: "@angular/animations" under animations, core and router. Commit 9766116cea "deprecate the animations package". | Package deprecated. Matches `from '@angular/animations'` (and its subpaths). |
| A13 | CL `20.2.0` (commit 320de4e96d, "deprecate animations field on component interface"). | The `animations:` metadata on `@Component` is deprecated. Matches `animations: [trigger(`. |
| A14 | CL `20.0.0` > Breaking Changes: "`provideExperimentalZonelessChangeDetection` is renamed to `provideZonelessChangeDetection` as it is now "Developer Preview" rather than "Experimental"." CL `21.0.0`: zoneless is the default. | The old name is gone. Zoneless is the default from 21, so the provider is not needed (DOC `guide/zoneless.md`: "Zoneless is the default in Angular v21+ so you do not need to do anything to enable it."). |
| A15 | CL `21.0.0` > Breaking Changes > core: "`moduleId` was removed from `Component` metadata." | Removed. |
| A16 | CL `18.0.0` > Deprecations > core: "`@Component.interpolation` is deprecated. Use Angular's delimiters instead."; CL `21.0.0` > Breaking Changes > core: "The `interpolation` option on Components has been removed. Only the default `{{ ... }}` is now supported." | Removed in 21. |

## Preferences

| ID | Source | Point |
|---|---|---|
| P1 | DOC `guide/ngmodules/overview.md`: "IMPORTANT: The Angular team recommends using bootstrapApplication instead of `bootstrapModule` for all new code." | `bootstrapModule` is not deprecated; this is a recommendation. |
| P2 | DOC `guide/routing/define-routes.md` (`provideRouter(routes)` in `providers`); DOC `guide/http/setup.md` (`provideHttpClient` in `app.config.ts`); DOC `guide/ngmodules/overview.md` ("recommends using standalone components ... for all new code"). | Configuration in `ApplicationConfig`. |
| P3 | DOC `guide/components/inputs.md`: "TIP: While the Angular team recommends using the signal-based `input` function for new projects, the original decorator-based `@Input` API remains fully supported." DOC `guide/components/outputs.md`: same wording for `output`. DOC `guide/components/queries.md`: same wording for `viewChild`. | Decorators are supported, so they are not banned. |
| P4 | DOC `guide/di/creating-and-using-services.md`: "Reach for `@Service` when you are creating a new singleton class that uses `inject()` for its dependencies." The table: `@Service` has no constructor DI and no `useClass` / `useValue` / `useExisting` / `useFactory`. | CL `22.0.0` > core features: "introduce `@Service` decorator" and "mark service decorator as stable". |
| P5 | DOC `guide/routing/route-guards.md` (examples use `CanActivateFn` and `inject()`; "If you need to redirect the user, return a `URLTree` or `RedirectCommand`. Do **not** return `false` and then programmatically `navigate` the user."). DOC `guide/routing/define-routes.md` (`ResolveFn`). | Class-based guards are not deprecated in the docs. |
| P6 | DOC `guide/http/interceptors.md`: "Our recommendation is to use functional interceptors because they have more predictable behavior". DOC `guide/http/setup.md`: "HELPFUL: Functional interceptors (through `withInterceptors`) have more predictable ordering and we recommend them over DI-based interceptors." | DI-based `HTTP_INTERCEPTORS` is still supported. |
| P7 | DOC `guide/templates/control-flow.md` (`@if`, `@for (item of items; track item.id)`, `@switch`). | Block syntax. |
| P8 | CL `19.0.0`: "Angular directives, components and pipes are now standalone by default. Specify `standalone: false` for declarations that are currently declared in `@NgModule`s." | Redundant `standalone: true` is not a deprecation. |
| P9 | CL `22.0.0` > Breaking Changes > core: "Component with undefined `changeDetection` property are now `OnPush` by default. Specify `changeDetection: ChangeDetectionStrategy.Eager` to keep the previous behavior." (CL `21.2.0`: "add `ChangeDetectionStrategy.Eager` alias for `Default`"). | Default changed in 22.0. |
| P10 | DOC `guide/zoneless.md`: "Zoneless is the default in Angular v21+ ... You should verify that `provideZoneChangeDetection` is not used anywhere to override the default configuration." CL `21.0.0`: "Angular no longer provides a change detection scheduler for ZoneJS-based change detection by default." | zone.js is opt-in from 21. |

## Snippets

| Name | Source |
|---|---|
| `$main` | `bootstrapApplication(App, appConfig)` pattern: DOC `guide/ngmodules/overview.md` and the bootstrap API. |
| `$config` | DOC `guide/routing/define-routes.md` (`provideRouter(routes)`); DOC `guide/http/setup.md` (`provideHttpClient(withInterceptors(...))`). |
| `$http` | DOC `guide/http/interceptors.md` (`HttpInterceptorFn` with `req.clone` and `next(req)`). |
| `$guard` | DOC `guide/routing/route-guards.md` (`CanActivateFn`, `inject()`, `URLTree` return). |
| `$control` | DOC `guide/templates/control-flow.md` (`@if ... as`, `@for ... track`, `@switch`). `@empty`/`@else`/`@default` as in the same page. |
| `$signals` | DOC `guide/components/inputs.md` (`input`, `input.required`), `outputs.md` (`output<void>()`), `queries.md` (`viewChild`), and `model(0)` from `inputs.md` (two-way binding). |
| `$service` | CL `22.0.0` (`reportUploadProgress` option, which is the A4 replacement); DOC `guide/di/creating-and-using-services.md` (`@Service()` with no options: the `Service` signature in `packages/core/src/di/service.ts` is `(options?: {autoProvided?: true})`). |

## Left out

- `bootstrapModule` itself, `RouterModule.forRoot`, NgModule-based `declarations` / `imports`, `@Input` / `@Output` / `@ViewChild`, class-based guards / resolvers / `HTTP_INTERCEPTORS`, `standalone: true`, and `provideZoneChangeDetection`: all still supported and documented as valid. Only preferences (P1 to P10).
- `ngOnChanges`: no deprecation or removal found in CL or DOC, so no rule.
- `ChangeDetectionStrategy.Default`: still valid (Eager is an alias from 21.2). Not banned.
- `@angular/forms` min/max no longer accept strings (CL 22.0): a bound-value check cannot be matched by regex without false positives.
- `ApplicationRef.bootstrap` second-argument change, `CanMatchFn` snapshot argument, and `paramsInheritanceStrategy` default change (22.0): behavioural or argument-shape changes, not token-level.
- `TestBed.getFixture` / `getLastFixture` rename (CL 22.x commits): unsure which release shipped it, so not used.
- `getAngularLib` / `setAngularLib` removal (CL 22.0): upgrade-only, rarely written by models.
- Signal Forms, `httpResource` and `resource` APIs: stabilised in 22.0, but the docs give no "prefer X" statement I could cite for a rule.
- `HttpClientTestingModule`: not in any deprecation list in CL.
- Node.js and TypeScript version floors: only the TypeScript 6 floor is in CL 22.0; no Node minimum was used.
- Snippets were not compiled or type-checked (no Angular install in the sandbox). Only the API names above were checked against CL and DOC.
