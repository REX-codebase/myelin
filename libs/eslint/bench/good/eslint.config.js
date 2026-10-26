import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
	globalIgnores(["dist/", "coverage/"]),
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node,
			},
		},
		rules: {
			"no-console": "warn",
		},
	},
	{
		files: ["test/**/*.js"],
		languageOptions: {
			globals: {
				...globals.mocha,
			},
		},
		rules: {
			"no-unused-expressions": "off",
		},
	},
]);
