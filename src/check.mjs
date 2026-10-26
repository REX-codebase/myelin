// Check text units against a parsed ledger.
//   units: [{ name: string, text: string }]
// Bans are checked per unit. Requirements are checked against all units together.
// An `unless` regex on a ban exempts the whole unit when it matches (unit-wide, not per call).

function lineOf(re, text) {
  const m = re.exec(text);
  if (!m) return null;
  return text.slice(0, m.index).split('\n').length;
}

export function check(ledger, units) {
  const violations = [];
  const bans = ledger.rules.filter((r) => r.kind === 'ban');
  const reqs = ledger.rules.filter((r) => r.kind === 'require');
  const all = units.map((u) => u.text).join('\n');

  for (const u of units) {
    for (const r of bans) {
      if (!r.re.test(u.text)) continue;
      if (r.unless && r.unless.re.test(u.text)) continue;
      violations.push({
        id: r.id,
        kind: 'ban',
        unit: u.name,
        line: lineOf(r.re, u.text),
        message: r.message,
        ref: r.ref,
      });
    }
  }
  for (const r of reqs) {
    if (!r.re.test(all)) {
      violations.push({ id: r.id, kind: 'require', unit: null, line: null, message: r.message, ref: r.ref });
    }
  }
  return {
    ok: violations.length === 0,
    violations,
    counts: { bans: bans.length, requires: reqs.length, units: units.length },
  };
}

export function snippetUnits(ledger) {
  return Object.entries(ledger.snippets).map(([id, s]) => ({ name: '$' + id, text: s.code }));
}
