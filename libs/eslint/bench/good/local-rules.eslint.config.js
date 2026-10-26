import { defineConfig } from "eslint/config";

const noGlobalFetch = {
	meta: {
		type: "problem",
		docs: { description: "disallow the global fetch in favour of the http client" },
		schema: [],
		messages: { useClient: "Use the http client wrapper instead of global fetch in {{file}}." },
	},
	create(context) {
		const sourceCode = context.sourceCode;
		return {
			CallExpression(node) {
				if (node.callee.type !== "Identifier" || node.callee.name !== "fetch") return;
				const scope = sourceCode.getScope(node);
				const ref = scope.references.find((r) => r.identifier === node.callee);
				if (ref && !ref.resolved) {
					const before = sourceCode.getTokenBefore(node, { includeComments: true });
					if (!before || before.type !== "Block") {
						context.report({ node, messageId: "useClient", data: { file: context.filename } });
					}
				}
			},
		};
	},
};

export default defineConfig([
	{
		files: ["src/**/*.js"],
		plugins: { local: { rules: { "no-global-fetch": noGlobalFetch } } },
		rules: { "local/no-global-fetch": "error" },
	},
]);
