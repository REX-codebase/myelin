# Sources: nextjs ledger

Version researched: **Next.js 16.4.3** (npm `latest`, published 2026-10-23; 16.4.0 released 2026-10-06). 16.x is Active LTS; 15.x maintenance LTS ended 2026-10-21. No Next.js 17 exists yet (16.4 post: Cache Components "will become the default in Next.js 17"). Canary is 16.5.0-canary.
Researched: 2026-10-26.

Primary sources:
- V16 = How to upgrade to version 16: https://nextjs.org/docs/app/guides/upgrading/version-16 (last updated 2026-10-15)
- V15 = How to upgrade to version 15: https://nextjs.org/docs/app/guides/upgrading/version-15
- B16 = Next.js 16 blog: https://nextjs.org/blog/next-16
- B164 = Next.js 16.4 blog: https://nextjs.org/blog/next-16-4
- NPM = https://www.npmjs.com/package/next (dist-tags latest 16.4.3, backport 15.5.28)
- EOL = https://endoflife.date/nextjs

| Rule | Source | What changed |
|---|---|---|
| B1 | V16#async-request-apis-breaking-change; https://nextjs.org/docs/app/api-reference/functions/cookies | "Starting with Next.js 16, synchronous access is fully removed. These APIs can only be accessed asynchronously": cookies, headers, draftMode. Regex catches `cookies().get(...)` and `x = cookies()` without await. |
| B2, B3, B4 | V16#async-request-apis-breaking-change, V16#async-parameters-for-icon-and-open-graph-image-breaking-change | `params` (layout/page/route/default/opengraph-image/icon...) and `searchParams` (page) are Promises; sync access removed. Docs pattern: `const { slug } = await props.params`, `PageProps<'/blog/[slug]'>`. B3 is lifted for files calling useParams/useSearchParams (client hooks return plain objects); B4 is lifted for Pages Router `getStaticPaths` (returns `{ params: {...} }`). Note: `generateImageMetadata` still receives sync params (rare; would false-fire B3/B4). |
| B5 | V16#middleware-to-proxy; B16#proxyts-formerly-middlewarets; https://nextjs.org/docs/app/api-reference/file-conventions/proxy | "The middleware filename is deprecated, and has been renamed to proxy ... The named export middleware is also deprecated. Rename your function to proxy." `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`. proxy runs on Node.js only. |
| B6 | V16#nextlegacyimage-component-deprecated; B16 Deprecations table | "The next/legacy/image component is deprecated. Use next/image instead." |
| B7 | V16#imagesdomains-configuration-deprecated | "The images.domains config is deprecated ... Use images.remotePatterns instead." Regex requires a string array, so `i18n.domains` (array of objects) does not fire. |
| B8 | V16#runtime-configuration | "serverRuntimeConfig and publicRuntimeConfig have been removed. Use environment variables instead." (getConfig from next/config goes with them.) |
| B9 | V16#amp-support | "All AMP APIs and configurations have been removed": next/amp, useAmp, `config = { amp: true }`, `amp` in next.config. |
| B10 | V16#next-lint-command | "The next lint command has been removed. Use Biome or ESLint directly. next build no longer runs linting ... The eslint option in the Next.js config file is also removed." |
| B11 | V16#partial-prerendering-ppr, V16#experimentaldynamicio-and-experimentalusecache; https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents | experimental.ppr / experimental_ppr removed; "experimental.dynamicIO and experimental.useCache flags have been removed" -> top-level `cacheComponents` (with `partialPrefetching: true` per cacheComponents docs). |
| B12 | V16#cachelife-and-cachetag, V16#unstable_rootparams | "cacheLife and cacheTag are now stable. The unstable_ prefix is no longer needed." "unstable_rootParams has been removed. Use next/root-params." |
| B13 | V16#revalidatetag | "revalidateTag now requires a second argument specifying a cacheLife profile. The single-argument form is deprecated"; use updateTag in Server Actions for read-your-writes. |
| B14 | V15 (`@next/font` section) | "The @next/font package has been removed in favor of the built-in next/font." |
| B15 | V15 | "experimental.bundlePagesExternals is now stable and renamed to bundlePagesRouterDependencies"; "experimental.serverComponentsExternalPackages is now stable and renamed to serverExternalPackages". |
| B16 | https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/runtime; https://nextjs.org/docs/messages/edge-runtime-deprecated; V15#runtime-configuration-breaking-change | runtime `'edge'` is listed "(deprecated)": "The Edge Runtime is deprecated. Remove the runtime export from your route files." `experimental-edge` errors since 15. |
| B17 | https://nextjs.org/docs/app/guides/migrating/app-router-migration (Step 3: Migrating next/head); https://nextjs.org/docs/pages/api-reference/components/head | "In the app directory, next/head is replaced with the new built-in SEO support" (metadata / generateMetadata). Lifted for files with Pages Router markers. |
| B18 | app-router-migration (useRouter section) | "The useRouter hook imported from next/router is not supported in the app directory but can continue to be used in the pages directory"; use next/navigation. Lifted for files with Pages Router markers. |
| B19 | https://nextjs.org/docs/app/api-reference/components/link (Version History v13.0.0); codemod `new-link` https://nextjs.org/docs/app/guides/upgrading/codemods | "No longer requires a child <a> tag." |
| B20 | https://nextjs.org/docs/app/api-reference/functions/image-response (Version History) | "v14.0.0: ImageResponse moved from next/server to next/og". |

Preferences:
- P1: https://nextjs.org/docs/pages ("still supported in newer versions of Next.js, but we recommend migrating to the new App Router"). getServerSideProps/getStaticProps are therefore NOT banned.
- P2: V15#fetch-requests ("fetch requests are no longer cached by default"; opt in with `cache: 'force-cache'`).
- P3: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config (v16.0.0: "dynamic, dynamicParams, revalidate, and fetchCache removed when Cache Components is enabled"); runtime docs (remove `runtime` export with Cache Components); B164 ("all new apps created with create-next-app will have Cache Components enabled by default"). Not banned because they are still valid without Cache Components.
- P4: https://nextjs.org/docs/app/api-reference/functions/unstable_cache ("This API has been replaced by use cache in Next.js 16").
- P5: V16#turbopack-by-default, V16#turbopack-configuration-location.
- P6: V16#parallel-routes-defaultjs-requirement.
- P7: V16#nextimage-changes (qualities [75], minimumCacheTTL 14400, imageSizes, dangerouslyAllowLocalIP, maximumRedirects 3).
- P8: V16#updatetag, V16#refresh.
- P9: V15 ("useFormState has been replaced by useActionState").

Left out / unsure:
- `export const revalidate` / `dynamic` / `fetchCache`: only invalid with Cache Components on, so a preference, not a ban.
- `--turbopack` flag in scripts: harmless (no longer necessary), so a preference.
- NextRequest `geo`/`ip` removal (V15) and `next export` removal (v14) were researched but left out to keep the ban list at 20.
- Middleware detection is by the function name `middleware`; the file name itself cannot be seen by the linter.
