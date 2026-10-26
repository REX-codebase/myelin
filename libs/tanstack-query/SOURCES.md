# Sources: tanstack-query ledger

Version researched: **@tanstack/react-query 5.104.5** (npm `latest`, published 2026-10-19; `@tanstack/vue-query` also 5.104.5). npm dist-tags show no v6 (alpha/beta/rc tags all point at old 5.0.0 pre-releases). The docs still say the deprecated imperative methods "will be removed in v6", so v6 is announced but not released.
Researched: 2026-10-26.

Primary sources:
- M5 = Migrating to TanStack Query v5: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
- M4 = Migrating to React Query 4: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-react-query-4
- QC = QueryClient reference: https://tanstack.com/query/latest/docs/reference/QueryClient
- PF = Prefetching guide: https://tanstack.com/query/latest/docs/framework/react/guides/prefetching
- SSR = Advanced SSR guide: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr

| Rule | Source | What changed |
|---|---|---|
| B1 | M4#react-query-is-now-tanstackreact-query | "react-query is now @tanstack/react-query"; devtools -> @tanstack/react-query-devtools. vue-query likewise became @tanstack/vue-query. |
| B2 | M5#supports-a-single-signature-one-object ; M4#new-api-for-usequeries ; M4#query-keys-and-mutation-keys-need-to-be-an-array | "now we only support the object format": useQuery(key, fn, options) -> useQuery({ queryKey, queryFn, ...options }); same for useInfiniteQuery, useIsFetching, useIsMutating. useQueries takes { queries: [...] } since v4. |
| B3 | M5#supports-a-single-signature-one-object | useMutation(fn, options) -> useMutation({ mutationFn, ...options }). |
| B4 | M5#supports-a-single-signature-one-object | queryClient.invalidateQueries(key, filters) -> invalidateQueries({ queryKey, ...filters }), same for refetchQueries, cancelQueries, removeQueries, resetQueries, isFetching, getQueriesData, setQueriesData. (getQueryData/setQueryData still take the key array directly, so they are not flagged.) |
| B5 | M5#rename-cachetime-to-gctime | "Rename cacheTime to gcTime". |
| B6 | M5#status-loading-has-been-changed-to-status-pending... | "The loading status has been renamed to pending, and similarly the derived isLoading flag has been renamed to isPending" (queries and mutations); new isLoading = isPending && isFetching. isLoading itself is NOT banned because it is a valid v5 flag. |
| B7 | M5#callbacks-on-usequery-and-queryobserver-have-been-removed | "onSuccess, onError and onSettled have been removed from Queries. They haven't been touched for Mutations." |
| B8 | M5#removed-keeppreviousdata-in-favor-of-placeholderdata-identity-function | keepPreviousData option and isPreviousData flag removed; use placeholderData: keepPreviousData and isPlaceholderData. |
| B9 | M5#the-useerrorboundary-option-has-been-renamed-to-throwonerror | useErrorBoundary -> throwOnError. |
| B10 | M5#hydration-api-changes | "The Hydrate component has been renamed to HydrationBoundary and the useHydrate hook has been removed." |
| B11 | M5#new-hooks-for-suspense | "The experimental suspense: boolean flag on the query hooks has been removed" -> useSuspenseQuery / useSuspenseInfiniteQuery / useSuspenseQueries. |
| B12 | M5 (#removed-refetchpage-in-favor-of-maxpages, #the-contextsharing-prop-has-been-removed-from-queryclientprovider, #the-isdataequal-option-has-been-removed-from-usequery, #hashquerykey-has-been-renamed-to-hashkey, isInitialLoading "deprecated now and will be removed in the next major version", #new-dehydrate-api); M4 (#refetchactive--refetchinactive, #setlogger-is-removed) | Removed/renamed options and helpers. |
| B13 | M5#infinite-queries-now-need-a-initialpageparam | "you now have to pass an explicit initialPageParam"; `({ pageParam = 0 })` default removed from the example. |
| B14 | M5#the-remove-method-has-been-removed-from-usequery | query.remove() -> queryClient.removeQueries({ queryKey }). |
| B15 | M5#the-refetchinterval-callback-function-only-gets-query-passed | refetchInterval: (query) => ...; data via query.state.data. |
| B16 | M5#imperative-queryclient-methods ; QC (fetchQuery, prefetchQuery, ensureQueryData, fetchInfiniteQuery, prefetchInfiniteQuery, ensureInfiniteQueryData marked Deprecated: "Use queryClient.query(options) instead. This method will be removed in the next major version."); PF ("These tips replace the use of the now deprecated prefetchQuery and ensureQueryData methods"); SSR examples use `queryClient.query({...}).catch(noop)` | `queryClient.query` / `infiniteQuery` first appear in @tanstack/query-core 5.102.0 (verified by checking src/queryClient.ts on unpkg: absent in 5.101.2, present in 5.102.0). |

Preferences:
- P1, P2: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr (useState(() => new QueryClient())) and https://tanstack.com/query/latest/docs/framework/react/guides/query-options
- P3: M5 status/isLoading section.
- P4: https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- P5: M5#typescript-error-is-now-the-default-type-for-errors-instead-of-unknown
- P6: https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query

Judgment calls / left out:
- B16 bans methods that still work in 5.104 (deprecated, not removed). Projects pinned below 5.102 do not have queryClient.query; the message says so. Drop B16 for such projects.
- `queryClient.getQueryData(key, filters)` second-argument removal: too hard to detect by regex without false positives.
- Custom `context` option on hooks (removed in v5): the token `context` is too generic.
- Status 'idle' removal (v4) and network-mode changes: behavioral.
