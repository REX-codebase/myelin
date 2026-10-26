// Plan for `myelin fix`: one entry per failing rule, so a rule's fix message and
// snippet print once even when the rule fails in many files. Read-only by design:
// the snippet is a suggestion the author applies, never written into the file.
export function fixPlan(ledger, result) {
  const byId = new Map();
  for (const v of result.violations) {
    if (!byId.has(v.id)) {
      const snippet = v.ref ? (ledger.snippets[v.ref]?.code ?? null) : null;
      byId.set(v.id, { id: v.id, kind: v.kind, message: v.message, ref: v.ref, snippet, places: [] });
    }
    byId.get(v.id).places.push({ unit: v.unit, line: v.line });
  }
  return [...byId.values()];
}
