# Sources: react-router ledger

Version researched: **React Router 8.5.0** (latest, 2026-10-16). v8.0.0 shipped 2026-06-17 (first of a planned yearly major cadence; v9 targeted ~mid-2027). v7 line ends at 7.18.x. Docs version picker on reactrouter.com: latest 8.5.0, 7.18.4, 6.30.6.
Researched: 2026-10-26.

Primary sources:
- U8 = Upgrading from v7 (v7 -> v8): https://reactrouter.com/upgrading/v7
- U7 = Upgrading from v6 (v6 -> v7): https://reactrouter.com/7.18.0/upgrading/v6
- U6 = Upgrading from v5 (v5 -> v6): https://reactrouter.com/6.30.6/upgrading/v5 (source markdown: https://github.com/remix-run/react-router/blob/react-router%406.30.0/docs/upgrading/v5.md)
- CL = CHANGELOG: https://reactrouter.com/changelog (raw: https://github.com/remix-run/react-router/blob/main/CHANGELOG.md), sections v8.0.0, v7.15.0, v7.11.0, v7.9.0, v7.0.0
- MW = Middleware docs: https://reactrouter.com/how-to/middleware
- Data-mode install (RouterProvider from react-router/dom): https://reactrouter.com/start/data/installation
- Framework routing (routes.ts, Route.* types): https://reactrouter.com/start/framework/routing
- Future changes (v8 has no future flags yet): https://reactrouter.com/upgrading/future

| Rule | Source | What changed |
|---|---|---|
| R1 | U8#react-router-dom; CL v8.0.0 "Removed react-router-dom" (#15076); U7 "Replace react-router-dom with react-router" | "React Router v8 removes the react-router-dom re-export package ... import DOM-specific APIs from react-router/dom and everything else from react-router." |
| R2 | U6 "Upgrade all <Switch> elements to <Routes>" | Switch replaced by Routes in v6. Regex only matches Switch imported from react-router* so MUI/other `<Switch>` components are not flagged. |
| R3 | U6 "Use useNavigate instead of useHistory"; U6 example code using useRouteMatch | useHistory -> useNavigate (go/goBack/goForward -> navigate(n)); useRouteMatch replaced by useMatch/relative routes. |
| R4 | U6 "Replace all uses of withRouter with hooks" | withRouter is not part of v6+. Regex limited to imports from react-router* (Next.js also has a withRouter). |
| R5 | U6 "Remove <Redirect>s inside <Switch>" / note: "<Redirect> ... no longer supported ... render a <Navigate> element"; redirect(): https://reactrouter.com/api/utils/redirect | Redirect -> Navigate (default push; use replace) or redirect() in loaders/actions. |
| R6 | U6 "Instead of using <Route component> and <Route render> props, just use regular element"; data-mode routing docs use `Component: Root` | v6+ uses element / Component. |
| R7 | U6 "<Route exact> is gone"; "Rename <NavLink exact> to <NavLink end>" | Exact matching is default; NavLink uses end. |
| R8 | U6 "Remove activeClassName and activeStyle props from <NavLink />" | Use className/style functions receiving { isActive }. |
| R9 | CL v7.0.0 "Removed APIs: json, defer" and "Remove the deprecated json utility (#12146) ... use Response.json"; "Remove the original defer implementation in favor of using raw promises" (#11744); U7#deprecations "return json({ data }) -> return { data }"; data(): https://reactrouter.com/api/utils/data | json/defer gone; return objects; data() for status/headers. |
| R10 | CL v7.0.0 "Adopted Future Flag Behaviors" / "Remove remaining future flags"; CL v8.0.0 "All future.v8_* flags have been removed (or lifted to a top-level config) and their behaviors are now the default"; U8#future-flags | v7_relativeSplatPath, v7_startTransition, v7_fetcherPersist, v7_normalizeFormMethod, v7_partialHydration, v7_skipActionErrorRevalidation, v8_middleware, v8_splitRouteModules (now top-level splitRouteModules), v8_viteEnvironmentApi, v8_passThroughRequests, v8_trailingSlashAwareDataRequests. |
| R11 | CL v7.0.0 "Remove the future.v7_partialHydration flag ... This also removes the <RouterProvider fallbackElement> prop"; U7#v7_partialhydration | Move to HydrateFallback / hydrateFallbackElement on the root route. |
| R12 | CL v7.0.0 "Package Restructuring: react-router-dom, @remix-run/react, @remix-run/server-runtime, and @remix-run/router have been collapsed into the react-router package"; "Removed Adapter Re-exports"; Upgrading from Remix: https://reactrouter.com/7.15.0/upgrading/remix ("React Router v7 is the next major version of Remix after v2") | Remix v2 imports -> react-router / @react-router/*. |
| R13 | CL v7.9.0 "Stable Middleware and Context APIs: removed the unstable_ prefix from RouterContextProvider, createContext, getContext ..."; CL v7.11.0 "unstable_onError stabilized as onError"; CL v7.15.0 "Stabilize unstable_url as url, unstable_useTransitions as useTransitions, unstable_defaultShouldRevalidate as defaultShouldRevalidate, unstable_mask as mask, future.unstable_passThroughRequests as v8_passThroughRequests, unstable_subResourceIntegrity as subResourceIntegrity"; CL v7.10.0 unstable_splitRouteModules / unstable_viteEnvironmentApi -> v8_*; MW shows `export const middleware` / `clientMiddleware` | "These flag/prop renames are breaking changes if you've already opted into the unstable APIs." |
| R14 | U8#metamatches-data-values; CL v8.0.0 "Remove deprecated data parameter in favor of loaderData for meta APIs" (#14931) | meta `data`, meta `matches[i].data`, and `useMatches()[i].data` -> `loaderData`. |
| R15 | U7#v7_normalizeformmethod ("normalizes formMethod fields as uppercase HTTP methods"; `-useNavigation().formMethod === "post"` / `+... === "POST"`); CL v7.0.0 "Remove future.v7_normalizeFormMethod" | Uppercase is the default since v7. |
| R16 | U8#cloudflare-vite-plugin; CL v8.0.0 "Remove @react-router/dev/vite/cloudflare dev proxy export; use @cloudflare/vite-plugin" | cloudflareDevProxy() -> cloudflare(). |
| R17 | CL v7.0.0: "Rename createRemixStub to createRoutesStub" (#11692); "Remove installGlobals() as this should no longer be necessary"; "Use createRemixRouter/RouterProvider in entry.client instead of RemixBrowser"; framework routers HydratedRouter / ServerRouter: https://reactrouter.com/api/framework-routers/HydratedRouter, https://reactrouter.com/api/framework-routers/ServerRouter | Remix v2 entry/test APIs replaced. |

Preferences: P1 framework routing docs (Route.LoaderArgs / Route.ComponentProps); CL v7.0.0 notes Remix-style generics are "informally deprecated in favor of the new Route.* types". P2 U7 "Update DOM-specific imports" + data-mode install docs. P3 data-mode install docs ("Data Routers should not be held in React state"). P5 CL v8.0.0 ("middleware is always enabled ... context ... is always a RouterContextProvider instance") and MW.

Left out (unsure or not regex-safe):
- `useFetcher<LoaderData>()` -> `useFetcher<typeof loader>()` (CL v7.0.0): generic argument cannot be told apart by regex.
- `getLoadContext` returning a plain object (must return RouterContextProvider in v8): needs semantic analysis; covered by P5.
- `hasErrorBoundary` on route objects (removed v8): internal/rare in app code.
- `<Prompt>` (v5): not confirmed in the v5->v6 guide text I opened; replaced by useBlocker, but left out.
- Importing RouterProvider from 'react-router' (non-DOM entry) in browser apps: still a valid export, kept as preference P2.
- `@react-router/architect` `useRequestContextDomainName` option removal (v8): adapter-specific, rare.
- The bench includes one `.ts` file (bad/vite.config.ts) because the Cloudflare plugin change only appears in Vite config.
