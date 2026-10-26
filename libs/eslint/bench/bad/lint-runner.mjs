import { FlatESLint } from "eslint/use-at-your-own-risk";

process.env.ESLINT_USE_FLAT_CONFIG = "true";

const eslint = new FlatESLint({ fix: true });
const results = await eslint.lintFiles(["src/**/*.js"]);
await FlatESLint.outputFixes(results);
const formatter = await eslint.loadFormatter("stylish");
console.log(await formatter.format(results));
