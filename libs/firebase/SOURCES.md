# Sources: firebase ledger

Researched 2026-10-27. npm registry `latest`: **firebase 13.1.0** (the modular JS SDK), **firebase-admin 14.5.0** (2026-09-23, `engines.node >=22`), **firebase-functions 7.4.0** (2026-09-15, `engines.node >=18`, peer `firebase-admin` 11 to 14).

**Access limits.** `firebase.google.com` (guides, upgrade guides, reference) was denied by the sandbox proxy, so no docs page was read. Every rule rests on one of:

- The published packages, unpacked from the registry tarballs and installed in a scratch project: `exports` maps, `.d.ts` files including their `@deprecated` tags, and the README. Paths below are inside `node_modules/`.
- The firebase-js-sdk changelogs on GitHub (raw): `CHANGELOG.md` of the `firebase` package and of `@firebase/ai`, `@firebase/app-check`, `@firebase/analytics`, `@firebase/auth`, `@firebase/firestore`, `@firebase/messaging`.
- For firebase-admin the root `lib/index.d.ts` and `lib/index.js` export list (its CHANGELOG points at GitHub release notes, which were not opened).

Abbreviations: **CL** = `packages/firebase/CHANGELOG.md`, **CL-AI** = `packages/ai/CHANGELOG.md`, **CL-AC** = `packages/app-check/CHANGELOG.md` (all at https://github.com/firebase/firebase-js-sdk/tree/main/packages).

## Rules

| ID | Evidence | What changed |
|---|---|---|
| B1 | `firebase/README.md`: "Upgrade to Version 9: Version 9 has a redesigned API that supports tree-shaking." `firebase/package.json` `exports` has no default export for `firebase/app`; the namespaced build ships only under `firebase/compat/*`. | The v8 namespace (`import firebase from "firebase/app"`, side-effect imports like `import "firebase/auth"`, root `import firebase from "firebase"`) and `firebase/compat/*` are the legacy API. Modular named imports are current. |
| B2 | Same as B1. The modular `firebase/app` exports `initializeApp`, `getApp`, `getApps`; `firebase/auth` exports `getAuth`; no `firebase.firestore()` exists outside compat. | `firebase.initializeApp()`, `firebase.auth()`, `firebase.firestore.FieldValue` and the other namespace members. |
| B3 | `@firebase/firestore/dist/index.d.ts`: `collection(firestore, path)`, `doc(firestore, path, ...)`, `getDoc`, `getDocs`, `onSnapshot(ref, ...)`, `query`, `where`, `orderBy`. Guarded `when` the file imports `firebase` or `firebase/...`, and `unless` it mentions `firebase-admin`, because the Admin SDK's Firestore keeps the chained `collection().doc()` API. | Method chaining on a client Firestore instance is the namespaced API. |
| B4 | `@firebase/auth/dist/auth-public.d.ts`: `signInWithEmailAndPassword(auth, email, password)` and the other sign-in functions take `Auth` first; `Auth` has `signOut` and `onAuthStateChanged` instance methods (so those two are not banned) but no `signInWith*` methods. | `auth.signInWithEmailAndPassword(...)` and the other namespaced sign-in methods. |
| B5 | `@firebase/firestore/dist/index.d.ts` ~L1003, ~L1034: `@deprecated This function will be removed in a future major release. Instead, set FirestoreSettings.localCache to an instance of PersistentLocalCache`. `persistentLocalCache`, `persistentMultipleTabManager`, `persistentSingleTabManager`, `memoryLocalCache` and `initializeFirestore` are exported. | `enableIndexedDbPersistence()` / `enableMultiTabIndexedDbPersistence()`. |
| B6 | CL 12.0.0 / CL-AI 2.0.0: "Remove `vertexai` import path", "Remove `VertexAI` APIs". CL 13.0.0 / CL-AI 3.0.0: "Removed the previously deprecated `VertexAIBackend` (and `BackendType.VERTEX_AI`). Use `AgentPlatformBackend` (and `BackendType.AGENT_PLATFORM`) instead." The default location for `AgentPlatformBackend` is `global`. `firebase/package.json` `exports` has `./ai` and no `./vertexai`. | `firebase/vertexai`, `getVertexAI`, `VertexAIBackend`. |
| B7 | CL-AI 2.15.0: "Imagen methods and types have been removed due to Imagen models being shut down." `@firebase/ai/dist/ai-public.d.ts` has no `Imagen` symbol. | `getImagenModel`, `ImagenModel` and the Imagen config types. |
| B8 | CL-AC 0.13.0: "Remove ability to call `initializeAppCheck` without a `provider`." `app-check-public.d.ts`: `initializeAppCheck(app: FirebaseApp \| undefined, options: AppCheckOptions)`. | Single-argument `initializeAppCheck(app)`. |
| B9 | `@firebase/auth/dist/auth-public.d.ts` ~L132: `@deprecated Firebase Dynamic Links is deprecated and will be shut down ... use ActionCodeSettings.linkDomain`. | `ActionCodeSettings.dynamicLinkDomain`. |
| B10 | `@firebase/analytics/dist/analytics-public.d.ts` ~L703: `@deprecated Use logEvent with eventName as 'screen_view' and add relevant eventParams`. | `setCurrentScreen()`. |
| B11 | `firebase-admin/lib/index.d.ts` exports only `App`, `AppOptions`, `initializeApp`, `getApp`, `getApps`, `deleteApp`, `Credential`, `applicationDefault`, `cert`, `refreshToken`, `FirebaseError`, `SDK_VERSION`, and the error types; `require("firebase-admin")` returns exactly `AppErrorCode, FirebaseAppError, FirebaseError, SDK_VERSION, applicationDefault, cert, deleteApp, getApp, getApps, initializeApp, refreshToken`. The service entry points (`./firestore`, `./auth`, `./app`, ...) are in `package.json` `exports`. | `admin.firestore()`, `admin.auth()`, `admin.credential.cert()`, `admin.apps` and the other namespace members. `admin.initializeApp()` still works and is not banned. |
| B12 | `firebase-functions/lib/v1/config.d.ts`: `@deprecated functions.config() has been removed in firebase-functions v7. Migrate to environment parameters using the params module immediately.` `export declare const config: never;` | `functions.config()`. |
| B13 | `firebase-functions/package.json` `exports`: `.` and `./v2` both resolve to `lib/v2/index`; `./v1` is the v1 API. `lib/v2/index.d.ts` exports `https`, `firestore`, `pubsub`, `scheduler`, `storage`, `tasks`, `identity`, ... and `setGlobalOptions`, with no `region` or `runWith`. `lib/v1/providers/firestore.d.ts` has `document()`, `lib/v2/providers/firestore.d.ts` does not; `lib/v1/providers/pubsub.d.ts` has `schedule()` and `topic()`; `lib/v1/providers/auth.d.ts` has `user()`. | The v1 builder API at the package root: `functions.region()`, `functions.runWith()`, `functions.firestore.document()`, `functions.pubsub.schedule()`, `functions.auth.user()` and friends. Lifted `unless` the file imports `firebase-functions/v1`. |
| B14 | `lib/v2/providers/https.d.ts`: `onCall(handler: (request: CallableRequest<T>, response?) => Return)`. | The v1 `(data, context)` callable signature. |

Facts: package versions, Node engines and peer ranges from the registry (`npm view`); import shapes from the `exports` maps and `.d.ts`; `AgentPlatformBackend` default location from CL 13.0.0.

Snippets: adapted from the declarations above. Not run or type-checked. The `gemini-3.5-flash-lite` model id is the one CL 13.0.0 names as the AI SDK's default hybrid-in-cloud model.

## Scope notes

- `firebase/compat/*` still ships in firebase 13.1.0 and is a supported way to migrate an old app. B1 and B2 are for new code; turn them off (`.myelin/ignore`) in a codebase that is deliberately mid-migration.
- B12 to B14 only apply to a file that imports the `firebase-functions` root. A project pinned to firebase-functions 6 or lower, where `functions.config()` and the v1 builders still run at the root, should not use them.

## Left out (unsure or not regex-safe)

- `getToken()` / `deleteToken()` from `firebase/messaging`: marked `@deprecated` in 13.1.0 in favour of `register()` / `onRegistered()` / `onUnregistered()`, but those are a different, Installation-ID based flow, not a drop-in rename, and `getToken` is how every existing web push app works. Not banned.
- `temperature`, `topP`, `topK`, `candidateCount` and the penalty parameters on `GenerationConfig`: deprecated "in Gemini 3.x and later models" only. They remain valid for earlier models.
- `sendMediaChunks()` / `sendMediaStream()` on the Live API (deprecated in `@firebase/ai` 2.5.0): rare, and Live API is public preview.
- Realtime Database and Storage namespaced calls (`db.ref().set()`, `storage.ref().put()`): the same legacy shape as B3/B4, but `.ref(` collides with other libraries and the Admin SDK, which keeps `db.ref()`.
- `getAuth()` persistence differences on React Native and the Cordova/web-extension entry points.
