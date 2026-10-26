# Sources: react ledger

Version researched: **React 19.3.0** (latest stable, released 2026-09-09; 19.x line since 19.0.0 on 2024-12-05). No React 20 exists as of research.
Researched: 2026-10-26.

Primary sources:
- U = React 19 Upgrade Guide: https://react.dev/blog/2024/04/25/react-19-upgrade-guide
- R = React v19 release post: https://react.dev/blog/2024/12/05/react-19
- C = React CHANGELOG (19.0.0 section): https://github.com/facebook/react/blob/main/CHANGELOG.md#1900-december-5-2024
- V = React versions page (latest = 19.3): https://react.dev/versions
- 19.3 post (no new removals/deprecations; ViewTransition, Fragment refs, browser() stable): https://react.dev/blog/2026/09/09/react-19-3

| Rule | Source | What changed |
|---|---|---|
| B1 | U#removed-reactdom-render, U#removed-reactdom-hydrate; C | "In React 19, we're removing ReactDOM.render ... migrate to ReactDOM.createRoot"; same for hydrate -> hydrateRoot. |
| B2 | U#removed-unmountcomponentatnode | "ReactDOM.unmountComponentAtNode ... In React 19, you'll need to migrate to using root.unmount()." |
| B3 | U#removed-reactdom-finddomnode | findDOMNode removed; "replace ReactDOM.findDOMNode with DOM refs". |
| B4, B5 | C (react-dom: "Remove render, hydrate, findDOMNode ... Move createRoot and hydrateRoot to react-dom/client", #28271); https://react.dev/reference/react-dom/client/createRoot | createRoot/hydrateRoot are imported from 'react-dom/client'. B5 is lifted when the file imports 'react-dom/client' (e.g. `import ReactDOM from 'react-dom/client'`). |
| B6 | U#removed-react-dom-test-utils | "We've moved act from react-dom/test-utils to the react package ... All other test-utils functions have been removed." |
| B7 | U#removed-proptypes-and-defaultprops | "removing the propType checks from the React package, and using them will be silently ignored ... migrating to TypeScript". |
| B8 | U#removed-proptypes-and-defaultprops | "removing defaultProps from function components in place of ES6 default parameters. Class components will continue to support defaultProps." |
| B9 | U#removed-string-refs | "In React 19, we're removing string refs ... migrate to ref callbacks." |
| B10 | U#removed-removing-legacy-context | Legacy Context (contextTypes, getChildContext) removed; migrate to contextType / createContext. |
| B11 | U#removed-createfactory | "React.createFactory ... In React 19, we're removing createFactory ... migrate to JSX". |
| B12 | U#removed-react-test-renderer-shallow, U#deprecated-react-test-renderer | react-test-renderer/shallow removed; react-test-renderer deprecated, use @testing-library/react. |
| B13 | R#new-hook-useactionstate; https://react.dev/reference/react/useActionState | "React.useActionState was previously called ReactDOM.useFormState ... we've renamed it and deprecated useFormState." (Regex only matches imports from 'react-dom' so react-hook-form's own useFormState is not flagged.) |
| B14 | R#ref-as-a-prop; https://react.dev/reference/react/forwardRef | "New function components will no longer need forwardRef ... In future versions we will deprecate and remove forwardRef." forwardRef reference page carries a Deprecated banner: "In React 19, forwardRef is no longer necessary. Pass ref as a prop instead." Note: forwardRef still works at runtime in 19.3. |
| B15 | R#context-as-a-provider; https://react.dev/reference/react/createContext | "you can render <Context> as a provider instead of <Context.Provider> ... In future versions we will deprecate <Context.Provider>." createContext docs: "SomeContext.Provider is a legacy way to provide the context value before React 19." Regex limited to identifiers ending in `Context` to avoid Radix-style `Tooltip.Provider`. |
| B16 | U#umd-builds-removed | "Starting with React 19, React will no longer produce UMD builds ... use an ESM-based CDN such as esm.sh." |
| B17 | C (react-dom: Remove renderToStaticNodeStream #28873, unstable_renderSubtreeIntoContainer, unstable_createEventHandle, unstable_runWithPriority #28271, unstable_flushControlled #26397); U changelog list; R#new-react-dom-static-apis | Removed in React 19; prerender/prerenderToNodeStream added in react-dom/static. |
| B18 | U#the-jsx-namespace-in-typescript; C ("The global JSX namespace is removed ... available from the React package: import { JSX } from 'react'") | Global `JSX.Element` no longer resolves; use React.JSX or import type { JSX }. Lifted when the file imports JSX from 'react'. |
| B19 | U#useref-requires-argument | "We've changed the types so that useRef now requires an argument." |
| B20 | U#ref-cleanup-required; R#cleanup-functions-for-refs | "returning anything else from a ref callback will now be rejected by TypeScript. The fix is usually to stop using implicit returns". |

Preferences:
- P2: R#actions, #form-actions, #new-hook-useformstatus, #new-hook-optimistic-updates.
- P3: useEffect/useMemo etc. remain documented, non-deprecated APIs (https://react.dev/reference/react). React Compiler 1.0: https://react.dev/blog/2025/10/07/react-compiler-1
- P4: R#new-feature-use ("use does not support promises created in render").

Facts: 19.2 (useEffectEvent, Activity): https://react.dev/blog/2025/10/01/react-19-2 (listed on V; not opened in full). 19.3 features from the 19.3 post above.

Left out (unsure or not regex-safe):
- `element.ref` deprecation (needs semantic context, `.ref` is too common).
- Module pattern factories (no reliable token).
- `react-is` removed methods (`isConcurrentMode`/`isAsyncMode`): rare in app code.
- Importing React solely for JSX: valid code, kept as a preference.
- `useReducer<React.Reducer<...>>` TS change: niche; omitted to keep the ledger at 20 bans.
- `Context.Consumer`: still documented as an alternative, not banned.
