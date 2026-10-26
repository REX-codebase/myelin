# Sources: prisma ledger

Version researched: **Prisma ORM 7.10.1** (`@prisma/client` npm `latest`, published 2026-10-16; `prisma` CLI `prev` tag = 7.10.1).
Note: the `prisma` CLI package's npm `latest` tag currently points at **8.0.0-rc.27** (2026-10-23), and prisma.io/docs now defaults to Prisma ORM 8, but the official release-status page says "Prisma ORM 8 is a release candidate ... General availability is expected in October 2026". Prisma 8 is a different runtime (`@prisma/orm-postgres`, contract files, `definePrismaConfig`) and lacks `$extends`, most nested writes etc. today, so this ledger targets stable 7.x. Prisma 7 docs: https://www.prisma.io/docs/orm/v7
Researched: 2026-10-26.

Primary sources:
- U7 = Upgrade to Prisma ORM 7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 (also at https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- R7 = 7.0.0 release notes: https://github.com/prisma/orm/releases/tag/7.0.0
- U6 = Upgrade to v6: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v6
- U5 = Upgrade to v5: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v5
- G = Generators (v7): https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators
- CFG = Prisma Config reference (v7): https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
- PCR = Prisma Client API reference (v7): https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference
- R616 = 6.16.0 release notes: https://github.com/prisma/orm/releases/tag/6.16.0
- RS = Release status: https://www.prisma.io/docs/orm/release-status

| Rule | Source | What changed |
|---|---|---|
| B1 | U7#schema-changes; R7 ("swapping the prisma-client-js provider for prisma-client"); G ("The default generator for Prisma Client is prisma-client, which ... requires a custom output path"; prisma-client-js marked deprecated) | prisma-client-js "will be removed in future releases"; output is required. |
| B2 | U7#schema-changes (`import { PrismaClient } from "@prisma/client"` -> `"./generated/prisma/client"`); R7 ("Generated Client and types move out of node_modules") | Import from the generated output. Regex only matches import/require of the bare package, so `"@prisma/client"` as a package.json dependency is allowed. |
| B3 | R7 ("new PrismaClient() support has been removed", "new PrismaClient({}) support has been removed"; requires adapter or accelerateUrl); PCR#adapter ("Required unless using accelerateUrl") | Lifted for a file that mentions adapter/accelerateUrl anywhere (unit-wide). |
| B4 | R7 ("new PrismaClient({ datasources: .. }) support has been removed", "new PrismaClient({datasourceUrl: ..}) support has been removed"); U7#driver-adapters | Pass the URL to the driver adapter. |
| B5 | U7#schema-changes ("url, directUrl, and shadowDatabaseUrl in the datasource block are deprecated. You can configure them in the Prisma Config"); https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference ("Connection URLs (url, directUrl, shadowDatabaseUrl) are configured in prisma.config.ts, not in the schema file.") | Schema datasource keeps only provider. |
| B6 | U7#client-middleware-removed ("The client middleware API has been removed. If possible, use Client Extensions.") | $use -> $extends({ query }). |
| B7 | U5#removed-rejectonnotfound | "With Prisma ORM 5, the deprecated parameter rejectOnNotFound has been removed." -> findUniqueOrThrow / findFirstOrThrow (PCR#finduniqueorthrow). |
| B8 | U5#removal-of-the-beforeexit-hook-from-the-library-engine | "The beforeExit hook has been removed from the Prisma ORM library engine ... we recommend using built-in Node.js exit events." |
| B9 | R616 ("if you used binaryTargets, you can also get rid of these"); G (prisma-client field table has no binaryTargets; engineType listed for prisma-client-js as library/binary; prisma-client example shows engineType = "client"); CFG#engine-removed ("The engine property has been removed in Prisma ORM v7.") | Rust-free client, no engine binaries. `engineType = "client"` is allowed. |
| B10 | R616 ("you can now also drop the queryCompiler and driverAdapter feature flags from the previewFeatures array"); U6#full-text-search-on-postgresql and U6#preview-features-promoted-to-general-availability (fullTextIndex GA; fullTextSearch GA for MySQL, fullTextSearchPostgres for PostgreSQL); U7#metrics-removed ("Metrics preview feature was deprecated in 6.14.0 and has been removed for Prisma ORM 7.0.0") | Obsolete preview flags. |
| B11 | U6#removed-notfounderror | "In Prisma v6, we removed the NotFoundError in favor of PrismaClientKnownRequestError with error code P2025". |
| B12 | U7#removed-cli-flags ("--skip-generate flag was removed from prisma migrate dev and prisma db push. The --skip-seed flag was removed"); U7#removed-db-execute-flags (--schema, --url removed from db execute); U7#migrate-diff-changes (--from-url/--to-url/--from-schema-datasource/--to-schema-datasource -> --from/to-config-datasource; --shadow-database-url -> config) | CLI flags removed in 7. |
| B13 | CFG#datasourcedirecturl-removed ("removed in Prisma ORM v7 in favor of the url property"); CFG#adapter-removed ("The adapter property has been removed in Prisma ORM v7. Migrations for driver adapters work automatically") ; U7#schema-changes ("If you were previously using directUrl to run migrations then you need to pass the directUrl value in the url field of prisma.config.ts") | prisma.config.ts options removed in 7. |
| B14 | U7#various-environment-variables-have-been-removed | Exact list of 12 removed env vars. |
| B15 | G#clientts and the generated structure listing (browser.ts, client.ts, enums.ts, models.ts, models/, commonInputTypes.ts; no index file); all v7 examples import "./generated/prisma/client" | Importing the bare output directory (the 6.x prisma-client-js custom-output habit) does not resolve. |

Facts / preferences:
- Facts (ESM, Node 20.19+, TS 5.4+, dotenv no longer auto-loaded, migrate dev no longer seeds/generates): U7#prerequisites, #esm-support, #environment-variables, #seeding-changes, #removed-cli-flags.
- P1 singleton: general Prisma guidance (https://www.prisma.io/docs/guides/frameworks/nextjs uses a globalThis cache). Not re-verified line by line for v7.
- P2 pool defaults: https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool ("pg ... connectionTimeoutMillis ... v7 default 0 (no timeout)"; example `connectionTimeoutMillis: 5_000`).
- P3 Uint8Array: U6#usage-of-buffer.
- P4 seeding: U7#seeding-changes; CFG#migrationsseed.
- P5 MongoDB: U7 ("Prisma ORM v7 does not yet support MongoDB. You should continue using Prisma ORM v6 for now.").
- P6 array shortcuts: U5#removed-array-shortcuts.
- Prisma 6 support window / Prisma 8 RC status: RS.

Judgment calls / left out:
- Accelerate (`prisma://`, `@prisma/extension-accelerate`): retired 2026-12-01 per U7, but still valid today with `accelerateUrl`, so not banned.
- `package.json` "prisma": { "seed" } key: could not confirm from v7 docs whether it is still read; kept as preference P4 only.
- Array-shortcut regex (`in: 5`): would flag `in: ids` where ids is an array variable.
- No Prisma 8 rules: RC only, API still changing.
