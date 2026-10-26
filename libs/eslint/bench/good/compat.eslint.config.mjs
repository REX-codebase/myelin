import { defineConfig } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
	baseDirectory: import.meta.dirname,
	recommendedConfig: js.configs.recommended,
});

export default defineConfig([
	js.configs.recommended,
	...compat.extends("airbnb-base", "plugin:import/recommended"),
	{
		files: ["**/*.js"],
		rules: { "no-var": "error" },
	},
]);
