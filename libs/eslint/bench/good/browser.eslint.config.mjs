import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";

export default defineConfig([
	globalIgnores(["build/", "**/.*"]),
	{
		files: ["src/**/*.{js,jsx}"],
		plugins: { js, jsdoc },
		extends: ["js/recommended"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"jsdoc/require-jsdoc": "warn",
		},
	},
]);
