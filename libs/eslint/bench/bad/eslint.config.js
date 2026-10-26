// eslint.config.js (early flat config)
export default [
  "eslint:recommended",
  {
    files: "src/**/*.js",
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      semi: ["error", "always"],
    },
  },
];
