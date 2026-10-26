# Sources: drizzle ledger

Version researched: **drizzle-orm 0.45.4 + drizzle-kit 0.31.11** (npm dist-tag `latest` for both, checked 2026-10-26).
Not targeted: **drizzle-orm 1.0.0-rc.5** (npm dist-tag `rc`; GitHub release list shows it as a release candidate, 21 Oct 2026). The v1 docs describe v1 as "latest", and the get-started page installs `drizzle-orm@rc`, but the npm `latest` tag is still 0.x, so this ledger targets the stable line. When v1 is tagged `latest`, D6, D8, D9, D10 and D11 need rethinking and new v1 rules belong in a new ledger version.

Access note: `orm.drizzle.team` is blocked from this sandbox (egress policy, 403), and the GitHub API is not attached for drizzle-team. Official docs were read from the public docs source repo `github.com/drizzle-team/drizzle-orm-docs` (shallow clone at commit 75cad5e, 2026-10-23, pages under `src/content/docs/`). Shipped APIs were read from the npm tarballs (`.d.ts` and `bin.cjs`), which are the authoritative 0.x surface. Public URLs below are the docs' published locations.

Primary sources:
- U21 = drizzle-kit 0.21 upgrade guide: https://orm.drizzle.team/docs/upgrade-21 (docs source `upgrade-21.mdx`)
- CFG = drizzle.config reference: https://orm.drizzle.team/docs/drizzle-config-file (`pg/drizzle-config-file.mdx`)
- GS = Get started with PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql (`pg/get-started-postgresql.mdx`)
- PULL = drizzle-kit pull: https://orm.drizzle.team/docs/drizzle-kit-pull (`pg/drizzle-kit-pull.mdx`)
- IDX = Indexes and constraints: https://orm.drizzle.team/docs/indexes-constraints (`pg/indexes-constraints.mdx`)
- INS = Insert / upsert: https://orm.drizzle.team/docs/insert (`pg/insert.mdx`)
- RQB = Relational queries: https://orm.drizzle.team/docs/rqb (`pg/rqb.mdx`)
- MIG = Migrations: https://orm.drizzle.team/docs/migrations (`pg/migrations.mdx`)
- CT = Column types: https://orm.drizzle.team/docs/column-types (`pg/column-types.mdx`)
- V1 = v1 changes (for the "not banned" list): https://orm.drizzle.team/docs/v0-v1-changes (`pg/v0-v1-changes.mdx`), relations: `pg/relations-v1-v2.mdx`
- T-ORM = drizzle-orm@0.45.4 typings: https://www.npmjs.com/package/drizzle-orm/v/0.45.4 (files `pg-core/table.d.ts`, `pg-core/primary-keys.d.ts`, `pg-core/query-builders/insert.d.ts`, `pg-core/columns/serial.d.ts`, `table.d.ts`, `sql/sql.d.ts`, `relations.d.ts`, `node-postgres/driver.d.ts`, `node-postgres/index.d.ts`, `postgres-js/index.d.ts`, `node-postgres/migrator.d.ts`, `migrator.d.ts`, `utils.d.ts`, `package.json` exports)
- T-KIT = drizzle-kit@0.31.11 package: https://www.npmjs.com/package/drizzle-kit/v/0.31.11 (files `index.d.ts` Dialect/Driver/dbCredentials unions; `bin.cjs` command list and `legacyCommand`)
- ZOD = drizzle-zod@0.8.3: https://www.npmjs.com/package/drizzle-zod/v/0.8.3 (`schema.d.ts`; peer `drizzle-orm >=0.36.0`)

| Rule | Source | What changed / why |
|---|---|---|
| D1 | U21 step 2 ("`driver` ... ONLY if you are using `aws-data-api`, `turso`, `d1-http`, `expo`"; "Drizzle driver selection follows the current strategy"); T-KIT `index.d.ts` `Driver` = `d1-http`, `expo`, `aws-data-api`, `pglite`, `durable-sqlite` | `driver: "pg"` is not a 0.31 config value. Postgres needs no driver key. (The studio error text in bin.cjs still lists "pg"; that stale message was not relied on.) |
| D2 | T-KIT `index.d.ts` `Dialect` = `postgresql`, `mysql`, `sqlite`, `turso`, `singlestore`, `gel`; U21 "dialect ... can be postgresql, mysql, or sqlite" | `dialect: "pg"` is not valid; the value is `"postgresql"`. |
| D3 | U21 ("If you were using `connectionString` or `uri` in `dbCredentials`, you should now use `url`"; "`url` - a unified parameter"); T-KIT postgres `dbCredentials` = `{ url }` or `{ host, port, user, password, database, ssl }` | `connectionString` and `uri` were replaced by `url` in drizzle-kit 0.21. Lookahead-free match inside one `{...}` object only. |
| D4 | U21 step 1 ("Remove all `:dialect` prefixes from your drizzle-kit commands ... `drizzle-kit push:mysql` to `drizzle-kit push`"); T-KIT `bin.cjs` `legacyCommand("generate:pg", "generate")` etc. | Dialect-suffixed commands are legacy. In 0.31 the handler only prints "This command is deprecated, please use updated '...' command" and does not run anything. |
| D5 | T-KIT `bin.cjs` command list: `generate`, `migrate`, `pull`, `push`, `studio`, `up`, `check`, `drop`, `export`; no `introspect` command (only the hidden `introspect:pg` legacy alias); PULL | `drizzle-kit introspect` is not a command. Use `drizzle-kit pull`. |
| D6 | T-ORM `pg-core/table.d.ts`: both object-form overloads of `pgTable` marked `@deprecated The third parameter of pgTable is changing and will only accept an array instead of an object`, with the array form as "New API" in the example; IDX (array form) | Third argument of `pgTable` must be an array of constraints/indexes. Object form `(t) => ({ ... })` is deprecated in 0.45 typings. The `pgTable(name, (t) => ({...}))` columns-callback form (in `sql-schema-declaration.mdx`) is a different, valid overload and is not banned. |
| D7 | T-ORM `pg-core/primary-keys.d.ts`: `@deprecated: Please use primaryKey({ columns: [] }) instead of this function` on `primaryKey(...columns)`; overload `primaryKey({ columns })` exists | Positional table-level `primaryKey(t.a, t.b)` is deprecated. The column-level `.primaryKey()` method is unaffected (regex excludes a `.` before the name). |
| D8 | T-ORM `table.d.ts` `InferModel`: `@deprecated Use one of the alternatives: InferSelectModel / InferInsertModel, or table.$inferSelect / table.$inferInsert`; `InferSelectModel` and `InferInsertModel` exported | `InferModel` is deprecated. |
| D9 | T-ORM `pg-core/query-builders/insert.d.ts` `PgInsertOnConflictDoUpdateConfig`: `/** @deprecated use either targetWhere or setWhere */ where?: SQL`; INS shows `targetWhere` and `setWhere` | `onConflictDoUpdate({ where })` is deprecated. `targetWhere` filters conflict rows, `setWhere` filters the update. Regex allows one nesting level of braces inside the config (for `set: {...}`). |
| D10 | T-ORM `sql/sql.d.ts` line ~202: `/** @deprecated Use sql.placeholder instead. */ export declare function placeholder(...)`; RQB uses `sql.placeholder("id")` | Top-level `placeholder()` is deprecated. The regex excludes `sql.placeholder(` via the `.` lookbehind. |
| D11 | T-ORM `package.json` exports (drizzle-orm@0.45.4): no `zod`, `valibot`, `typebox`, `typebox-legacy`, `arktype` or `effect-schema` subpath; V1 "Validator packages consolidated into drizzle-orm" (v1 only); ZOD `drizzle-zod@0.8.3` exports `createInsertSchema` and `createSelectSchema`, peer `drizzle-orm >=0.36.0` | `drizzle-orm/zod` and the other validator subpaths exist only in the v1 release candidate. On the stable line, use `drizzle-zod`. |
| D12 | T-ORM `pg-core/index.d.ts` exports schema builders only (no `drizzle` function in `pg-core/*.d.ts`); `node-postgres/driver.d.ts` exports `drizzle`; GS imports `drizzle` from `drizzle-orm/node-postgres` and `drizzle-orm/postgres-js` | `drizzle` is not in `drizzle-orm/pg-core`. |
| D13 | T-ORM `node-postgres/index.d.ts` and `postgres-js/index.d.ts` re-export only `driver` and `session`; `node-postgres/migrator.d.ts` exports `migrate(db, config)`; MIG imports `drizzle-orm/node-postgres/migrator` | `migrate` lives in the migrator subpath. |
| D14 (pref) | GS: `drizzle({ client: pool })` and `drizzle({ connection: {...} })`; T-ORM `node-postgres/driver.d.ts` still accepts positional `drizzle(client)` | Style preference only: both forms type-check in 0.45, so no ban. |
| D15 (pref) | T-ORM `pg-core/columns/serial.d.ts` has no `@deprecated`; CT documents both `serial()` and `integer().generatedAlwaysAsIdentity()` (with `startWith`) | Preference, not a ban: identity is the SQL-standard choice; `serial()` still works. |

Checked and left out (not stale for 0.45.4, or not regex-safe):
- **relations() + db.query** (RQB v1): current in `relations.d.ts`; v1 replaces it with `defineRelations` (V1, RQB). Banning it would break stable code. The RQB v2 object `where: { col: { eq } }` form (in `rqb.mdx`) is not in the 0.45 `DBQueryConfig` typings (`where` is `SQL` or a callback), so the ledger's good examples use `where: eq(...)`.
- **positional `drizzle(pool)` / `drizzle(process.env.DATABASE_URL)`**: valid overloads in `node-postgres/driver.d.ts`; covered only by D14 preference.
- **`serial()`**: not deprecated in 0.45 typings; covered only by D15 preference.
- **`drizzle({ casing })` and `snakeCase.table`**: `casing` is a v1 change (V1). Left out as a v1 item, not a 0.x ban.
- **`.enableRLS()`, `getTableColumns`**: deprecated in v1 (V1), but no `@deprecated` tag in 0.45 typings. Not banned.
- **`drizzle-kit push --strict`**: still a flag in 0.31 (`push` command options); removed in v1 (V1). Not banned.
- **`param()`** and **`sql.fromList`** (deprecated in `sql/sql.d.ts`): `param` is too generic a name for a safe regex; `fromList` is rare. Left out.
- **`primaryKey` for mysql/sqlite/gel/singlestore**: the same positional form is deprecated there too, so D7 also fires on it. The ledger is Postgres-scoped, but the regex does not check the dialect.
- **Import from `drizzle-orm/migrator` (root)**: not checked against the 0.45 root exports, so not banned.

Uncertainties:
- v1 is the docs default and the direction of travel. A future ledger version targeting v1 would flip several rules (D6, D8, D9, D10, D11) and add the RQB v1 removal and `defineRelations`.
- D6 misses a third argument that is not a literal `{...}` or identifier, and it does not cover `pgTable` aliases such as `pgTableCreator` results (the regex matches `pgTable(` only).
- D9 allows one nesting level of braces inside the `onConflictDoUpdate` config, so a config with two levels of nesting before `where:` would be missed.
- D12 and D13 match a multi-line import, but not one whose braces include a string literal.
- The `: pg` legacy commands are described from reading the bundled `legacyCommand` handler. The message text was read directly, but "does nothing" is my reading of the code, not a documented behaviour.
- Snippets are not executed and not type-checked; the bench corpus is regex-level only.
