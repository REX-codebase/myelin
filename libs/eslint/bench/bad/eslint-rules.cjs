// eslint-rules/no-global-fetch.js, loaded with --rulesdir
module.exports = function (context) {
  return {
    CallExpression(node) {
      if (node.callee.name !== 'fetch') return;
      const scope = context.getScope();
      const filename = context.getFilename();
      const variable = scope.references.find((r) => r.identifier === node.callee);
      if (variable && !variable.resolved) {
        const comment = context.getSourceCode().getJSDocComment(node);
        if (!comment) {
          context.report({ node, message: `Use the http client wrapper instead of global fetch in ${filename}` });
        }
      }
    },
  };
};
