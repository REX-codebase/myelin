# eslint ledger: sources

Researched 2026-10-26. Current stable: **eslint 10.13.0** (npm `latest`; `maintenance` = 9.39.5; `@eslint/js` latest 10.0.1). Node ^20.19.0 || ^22.13.0 || >=24.

Sources:
- V10: Migrate to v10.x, https://eslint.org/docs/latest/use/migrate-to-10.0.0
- V9: Migrate to v9.x, https://eslint.org/docs/latest/use/migrate-to-9.0.0
- MG: Configuration Migration Guide, https://eslint.org/docs/latest/use/configure/migration-guide
- CF: Configuration Files, https://eslint.org/docs/latest/use/configure/configuration-files
- CLI: Command Line Interface Reference, https://eslint.org/docs/latest/use/command-line-interface
- V8: Migrate to v8.0.0, https://eslint.org/docs/latest/use/migrate-to-8.0.0
- TSE: typescript-eslint package docs, https://typescript-eslint.io/packages/typescript-eslint/
- Version: https://registry.npmjs.org/eslint (dist-tags)

| ID | Change | Source |
|---|---|---|
| L1 | `"eslint:recommended"` / `"eslint:all"` strings no longer accepted in flat config; use `js.configs.recommended` from `@eslint/js` (or `extends: ["js/recommended"]`) | V9 "eslint:recommended and eslint:all no longer accepted in flat config"; MG "Predefined and Shareable Configs"; CF "Use Predefined Configurations" |
| L2 | eslintrc `extends` strings (`plugin:x/y`) replaced by imported config objects or `"x/config"` strings after registering the plugin; FlatCompat is the documented bridge (exempted) | MG "Import Plugins and Custom Parsers", "Use eslintrc Configs in Flat Config"; CF "Extending Configurations" |
| L3 | `env` does not exist in flat config; use `languageOptions.globals` with the `globals` package | MG "Configure Language Options", CLI "--env" |
| L4 | plugins are JavaScript objects in flat config | MG "Import Plugins and Custom Parsers" |
| L5 | custom parser is an imported module assigned to `languageOptions.parser` | MG "Custom Parsers" |
| L6 | `root` option no longer exists | MG "Additional Changes" |
| L7 | eslintrc `overrides` replaced by glob-based config objects | MG "Glob-Based Configs" |
| L8 | `.eslintignore`, `ignorePatterns`, `--ignore-path` not supported; use `ignores` / `globalIgnores()` | MG "Ignore Files", "--ignore-path"; CF globalIgnores |
| L9 | `/* eslint-env */` comments reported as errors in v10 | V10 "eslint-env comments are reported as errors"; MG "eslint-env Configuration Comments" |
| L10 | `ESLINT_USE_FLAT_CONFIG=false` escape hatch gone (old config format no longer supported in v10); `FlatESLint` and `LegacyESLint` removed, use `ESLint`; `CLIEngine` removed in v8 | V10 "Old config format no longer supported"; V9 "FlatESLint is now ESLint"; V8 "The CLIEngine class has been removed" |
| L11 | `--env`, `--ignore-path`, `--no-eslintrc` (now `--no-config-lookup`), `--resolve-plugins-relative-to`, `--rulesdir` not supported | MG "CLI Flag Changes" |
| L12 | package.json `eslintConfig` no longer supported | MG "package.json Configuration No Longer Supported" |
| L13 | `.eslintrc.*` format no longer supported in v10 | V10 "Old config format no longer supported" |
| L14 | context methods removed: `getScope/getAncestors/markVariableAsUsed/getDeclaredVariables` (v9, moved to `sourceCode.*(node)`), `getSource/getAllComments/...` (v9), `getCwd/getFilename/getPhysicalFilename/getSourceCode/parserOptions/parserPath` (v10, now properties) | V9 "Removed multiple context methods"; V10 "Removal of deprecated context members"; https://eslint.org/docs/latest/use/troubleshooting/v9-rule-api-changes |
| L15 | `SourceCode#getTokenOrCommentBefore/After`, `isSpaceBetweenTokens`, `getJSDocComment` removed (v10); `sourceCode.getComments()` removed (v9) | V10 "Removal of deprecated SourceCode methods"; V9 "Removed sourceCode.getComments()" |
| L16 | core `require-jsdoc` and `valid-jsdoc` rules removed | V9 "Removed require-jsdoc and valid-jsdoc rules" |
| L17 | `tseslint.config(...)` deprecated in favour of ESLint core `defineConfig(...)` | TSE "config(...) (deprecated)" |
| L18 | function-style rules no longer supported | V9 "Function-style rules are no longer supported" |
| L19 | `files` cannot be a single string, must be an array | MG "Additional Changes" |
| P2 | `--ext` still exists (re-added in 9.x) and is for `--no-config-lookup` runs | CLI "--ext" |
| P3 | dotfiles not ignored by default | MG "Ignore Files" (Important note) |
| P5 | `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error` added to recommended | V10 "eslint:recommended has been updated" |
| P6 | plugin compatibility | Observed 2026-10-26 in a sandbox: eslint-plugin-react 7.37.5 (npm latest; peer `eslint ^3..^8 \|\| ^9.7`) throws `contextOrFilename.getFilename is not a function` under eslint 10.13.0; typescript-eslint 8.72.0 peer `typescript >=4.8.4 <6.1.0` and refuses TS 7.0 at runtime |

Verification: all three snippets and the good bench configs (except the FlatCompat one, which names third-party eslintrc configs) were loaded and run with eslint 10.13.0, @eslint/js, globals, typescript-eslint 8.72 + typescript 6.x, eslint-plugin-jsdoc.

Left out on purpose:
- `--ext` flag ban: the brief asked to verify removal; the current CLI reference documents `--ext` again, so it is not banned.
- Top-level `parserOptions` (eslintrc) vs `languageOptions.parserOptions` (flat): not distinguishable by regex.
- `FlatCompat` usage: still documented as the bridge, so it exempts L2 instead of being banned.
