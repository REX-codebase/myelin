# mongoose ledger: sources

Researched 2026-10-26. Current stable: **mongoose 9.11.4** (npm `latest`, published 2026-10-23). Node 20.19.0+ (npm `engines`). Bundles `mongodb` ~7.7.

Official sources used:
- Migration guides: https://mongoosejs.com/docs/migrating_to_9.html, `migrating_to_8.html`, `migrating_to_7.html`, `migrating_to_6.html`. mongoosejs.com was not reachable from the research sandbox, so the same guides were read from the repository source at `docs/migrating_to_{6,7,8,9}.md` (https://github.com/Automattic/mongoose/tree/master/docs).
- CHANGELOG: https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md (9.2.0 entry for `returnDocument`, 9.0.0 entries for pre middleware and noListener, 7.0.0 for strictQuery).
- npm: https://registry.npmjs.org/mongoose (dist-tags, `engines`, `dependencies`).

Runtime checks: `mongoose@9.11.4` installed in a scratch directory and probed offline (no MongoDB server was available, so nothing was run against a database). Results are noted per row.

## Bans

| ID | Change | Source | Probe on 9.11.4 |
|---|---|---|---|
| M1 | Query and model methods dropped callbacks (`find`, `updateOne`, `countDocuments`, ...); they always return promises | migrating_to_7.html#dropped-callback-support | not probed directly; `exec(cb)` covered by M2 |
| M2 | `exec`, `save`, `validate`, `populate` dropped callbacks | migrating_to_7.html#dropped-callback-support | `Query.exec(fn)` throws "no longer accepts a callback" |
| M3 | `mongoose.connect` and `createConnection` dropped callbacks | migrating_to_7.html#dropped-callback-support (list includes `Mongoose.prototype.connect`, `createConnection`) | `connect(uri, cb)` returns a promise; callback behaviour not confirmed without a server |
| M4 | `useNewUrlParser`, `useUnifiedTopology`, `useCreateIndex`, `useFindAndModify` no longer supported | migrating_to_6.html#no-more-deprecation-warning-options | not probed (needs connection) |
| M5 | `sslCA`, `sslCRL`, `sslCert`, `sslKey`, `sslPass`, `sslValidate`, `tlsCertificateFile` replaced by `tls*` options (driver 6) | migrating_to_8.html#mongodb-node-driver-6 | not probed |
| M6 | `Document.remove()` and `Model.remove()` removed | migrating_to_7.html#removed-remove | `doc.remove` and `Model.remove` are undefined |
| M7 | `pre('remove')` hooks replaced by `pre('deleteOne', { document: true, query: false })` | migrating_to_7.html#removed-remove | not probed (hook behaviour needs a database) |
| M8 | `findOneAndRemove()` and `findByIdAndRemove()` removed; use `findOneAndDelete` / `findByIdAndDelete` | migrating_to_8.html#removed-findoneandremove | both undefined |
| M9 | `Model.count()` and `Query.prototype.count()` removed; use `countDocuments` / `estimatedDocumentCount` | migrating_to_8.html#removed-count | `Model.count` and query `count` undefined |
| M10 | `Model.update()`, `Query.update()`, `Document.update()` removed; use `updateOne` / `updateMany` | migrating_to_7.html#removed-update | `Model.update` and `doc.update` undefined |
| M11 | `ObjectId` is a class; calling without `new` throws | migrating_to_7.html#objectid-requires-new | throws "Class constructor ObjectId cannot be invoked without 'new'" |
| M12 | pre middleware no longer receives `next()` | migrating_to_9.html, section "Pre middleware no longer supports `next()`" (CHANGELOG 9.0.0) | `next` argument is `undefined` in a validate pre hook |
| M13 | isAsync middleware `pre(name, true, fn)` removed | migrating_to_9.html, section "`isAsync` middleware no longer supported" | a `(next, done)` hook throws "done is not a function" |
| M14 | `promiseOrCallback` removed | migrating_to_9.html, section "Removed `promiseOrCallback`" | `undefined` |
| M15 | `new` and `returnOriginal` deprecated on `findOneAndUpdate` / `findOneAndReplace`; use `returnDocument` | migrating_to_9.html, section "`new` and `returnOriginal` options deprecated"; CHANGELOG 9.2.0 (#16008) | deprecation warning per guide, not observed offline |
| M16 | `rawResult` removed from find-and-modify methods; use `includeResultMetadata` | migrating_to_8.html, section "Removed `rawResult` option for `findOneAndUpdate()`" | not probed |
| M17 | `noListener` option removed from connections and `useDb()` | migrating_to_9.html, section "Removed `noListener` option from `useDb()`/connections" (CHANGELOG 9.0.0) | **contradicted**: `conn.useDb('x', { noListener: true })` does not throw on 9.11.4. The rule says "no longer supported" and does not claim a throw |

## Preferences

| ID | Point | Source | Probe on 9.11.4 |
|---|---|---|---|
| P1 | `strictQuery` defaults to false since 7.0; unknown filter keys are kept | migrating_to_7.html#strictquery; CHANGELOG 7.0.0 | filter `{ zzz: 1 }` is kept |
| P2 | `doc.deleteOne()` returns a Query since 8.0 | migrating_to_8.html#document-prototype-deleteone-now-returns-a-query | returns an instance of `mongoose.Query` |
| P3 | `countDocuments()` and `estimatedDocumentCount()` replace `count()` | migrating_to_8.html#removed-count | n/a |
| P4 | update pipelines throw unless `updatePipeline: true` (or set globally) | migrating_to_9.html, section "Update pipelines disallowed by default" (CHANGELOG 9.0.0) | building `updateOne({}, [{$set}])` throws "Cannot pass an array to query updates unless the `updatePipeline` option is set" |
| P5 | Node.js 20.19.0 or higher required | migrating_to_9.html, section "Node.js version support"; npm `engines` | `engines.node: >=20.19.0` |
| P6 | `skipOriginalStackTraces` no longer necessary | migrating_to_9.html, section "Removed `skipOriginalStackTraces` option" | the option is still accepted without error, so it is a preference, not a ban |

## Facts

| key | Source |
|---|---|
| `version` 9.11.4, `verified` 2026-10-26 | npm registry dist-tags |
| `node.min` 20.19.0 | migrating_to_9.html, section "Node.js version support"; npm `engines` |
| `driver` mongodb ~7.7 | npm `dependencies` |

## Left out on purpose

- **`doValidate` callback** (migrating_to_9.html, section "`Schema.prototype.doValidate()` now returns a promise"): the guide names `Schema.prototype.doValidate`, which is `undefined` on 9.11.4. The method exists on SchemaType, and the callback form returned without calling the callback in the probe. Not ruled until the discrepancy is resolved upstream.
- **`Schema.Types.Mixed`**: no deprecation or removal in the 6, 7, 8 or 9 guides. Still current.
- **`findByIdAndUpdate` with `new: true`**: the 9.2 deprecation names only `findOneAndUpdate` and `findOneAndReplace`. Not banned.
- **`insertMany` with `rawResult`**: no removal found in the guides. Not banned.
- **`keepAlive`** (deprecated 7.2, migrating_to_7.html#deprecated-keepalive): a no-op name that other libraries also use (Node `http.Agent`). Not banned.
- **`isNew` / `isDeleted`**: CHANGELOG entries are bug fixes with no stable rule. Not banned.
- **Subdocument `deleteOne()` hook timing** (migrating_to_9.html, section "Subdocument `deleteOne()` hooks execute only when subdocument is deleted"): a behaviour change that a regex cannot see.
- **`user.remove()` / `user.update()` on arbitrary variable names**: a regex cannot know the variable is a document. M6 and M10 only match `doc`, `document`, and `*Doc` names, plus capitalised model names.
- **`ObjectId` from a 12-character string, `isValidObjectId(number)`** (migrating_to_8.html, migrating_to_9.html): behaviour changes, not stale call shapes.
- **UUID and `caster` changes, TypeScript generics** (migrating_to_9.html): types, not checkable by regex in JS.
