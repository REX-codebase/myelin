/* eslint-env node */
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    plugins: ["jsdoc"],
    rules: {
      "valid-jsdoc": "error",
      "require-jsdoc": ["warn", { require: { FunctionDeclaration: true } }],
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: { describe: "readonly", it: "readonly" },
    },
  },
];
