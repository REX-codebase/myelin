// .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: { mocha: true },
      rules: { 'no-unused-expressions': 'off' },
    },
  ],
  rules: {
    'no-console': 'warn',
  },
};
