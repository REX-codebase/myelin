// Check text units against a parsed ledger.
//   units: [{ name: string, text: string }]
// Bans are checked per unit. Requirements are checked against all units together.
// An `unless` regex on a ban exempts the whole unit when it matches (unit-wide, not per call).

const CSTYLE = /\.(m?[jt]sx?|cjs|cts|mts|html?|svelte|vue|css|scss|less|prisma)$/i;

// Blank out comments (keeping newlines and length) so a ban never fires on a
// comment that merely mentions the banned API, e.g. "// PCFSoftShadowMap removed".
// String and template literals are kept, so URLs like "https://..." survive.
// Applies only to units whose name has a C-style-comment extension, and only
// for ledgers whose header says `comments skip` (eslint rules target comments).
export function maskComments(text, name = '') {
  if (!CSTYLE.test(name)) return text;
  const html = /\.(html?|svelte|vue)$/i.test(name);
  const out = text.split('');
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (html && text.startsWith('<!--', i)) {
      const e = text.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      blank(i, end); i = end; continue;
    }
    if (c === '/' && d === '/') {
      const e = text.indexOf('\n', i);
      const end = e < 0 ? n : e;
      blank(i, end); i = end; continue;
    }
    if (c === '/' && d === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      blank(i, end); i = end; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) {
        if (text[j] === '\\') j++;
        else if (c !== '`' && text[j] === '\n') break;
        j++;
      }
      // Unterminated: this quote is not a string (a regex like /"/, or an
      // apostrophe in prose). Skipping to end of line would hide a comment after it.
      if (text[j] !== c) { i++; continue; }
      i = j + 1; continue;
    }
    i++;
  }
  return out.join('');
}

function lineOf(re, text) {
  const m = re.exec(text);
  if (!m) return null;
  return text.slice(0, m.index).split('\n').length;
}

export function check(ledger, units) {
  const violations = [];
  const bans = ledger.rules.filter((r) => r.kind === 'ban');
  const reqs = ledger.rules.filter((r) => r.kind === 'require');
  if (ledger.header && ledger.header.comments === 'skip') {
    units = units.map((u) => ({ ...u, text: maskComments(u.text, u.name) }));
  }
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
