import { readRegexLiteral } from './regex.mjs';

const REQUIRED_HEADER = ['id', 'about', 'fires'];
const REF = /\s*->\s*\$([\w-]+)\s*$/;

// Parse a .myelin file into a ledger object. Never throws on bad input:
// problems are collected in ledger.problems, and ledger.ok is false when any is an error.
export function parse(text) {
  // A BOM is what Windows editors write; it is not part of the version line.
  const lines = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const ledger = {
    version: null,
    header: {},
    facts: [],
    rules: [],
    prefs: [],
    snippets: {},
    problems: [],
    ok: false,
  };
  const problem = (level, line, message) => ledger.problems.push({ level, line, message });
  const done = () => {
    ledger.ok = !ledger.problems.some((p) => p.level === 'error');
    return ledger;
  };

  // ---- L0 header -------------------------------------------------------
  const first = lines[0].match(/^myelin\s+(\d+)\s*$/);
  if (!first) {
    problem('error', 1, 'first line must be "myelin <version>", for example "myelin 1"');
    return done();
  }
  ledger.version = Number(first[1]);
  if (ledger.version !== 1) {
    problem('error', 1, `unsupported version ${ledger.version}`);
    return done();
  }

  let i = 1;
  for (; i < lines.length && lines[i].trim() !== ''; i++) {
    if (lines[i].startsWith('#')) continue;
    const m = lines[i].match(/^([A-Za-z][\w.-]*)\s+(.*)$/);
    if (!m) {
      problem('warn', i + 1, 'unrecognized header line ignored');
      continue;
    }
    ledger.header[m[1]] = m[2].trim();
  }
  for (const k of REQUIRED_HEADER) {
    if (!ledger.header[k]) problem('error', 1, `header is missing required key "${k}"`);
  }
  if (!ledger.header.status) {
    problem('warn', 1, 'header has no "status" line; say honestly how far this ledger has been tested');
  }
  ledger.header.fires = (ledger.header.fires || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  // ---- L1 rules and L2 snippets ---------------------------------------
  const ids = new Map();
  const claim = (id, n) => {
    if (ids.has(id)) problem('error', n, `duplicate id "${id}" (first used on line ${ids.get(id)})`);
    else ids.set(id, n);
  };
  const compile = (lit, n) => {
    try {
      // g and y make RegExp.test() stateful; a ledger never needs them.
      return new RegExp(lit.source, lit.flags.replace(/[gy]/g, ''));
    } catch (e) {
      problem('error', n, `invalid regex /${lit.source}/${lit.flags}: ${e.message}`);
      return null;
    }
  };

  function parseRule(line, n) {
    const m = line.match(/^([!+])\s+([\w-]+)\s+(\/.*)$/);
    if (!m) {
      problem('error', n, 'malformed rule; expected "<!|+> ID /regex/ message"');
      return;
    }
    const kind = m[1] === '!' ? 'ban' : 'require';
    const id = m[2];
    const lit = readRegexLiteral(m[3], 0);
    if (!lit) {
      problem('error', n, 'regex literal is not closed with "/"');
      return;
    }
    let tail = m[3].slice(lit.end).trim();
    let unless = null;
    const um = tail.match(/^unless\s+(\/.*)$/);
    if (um) {
      const ul = readRegexLiteral(um[1], 0);
      if (!ul) {
        problem('error', n, '"unless" regex is not closed with "/"');
        return;
      }
      if (kind === 'require') problem('error', n, '"unless" is only allowed on ! rules');
      const ure = compile(ul, n);
      if (ure) unless = { source: ul.source, flags: ul.flags.replace(/[gy]/g, ''), re: ure };
      tail = um[1].slice(ul.end).trim();
    }
    claim(id, n);
    const re = compile(lit, n);
    if (!re) return;
    const refm = tail.match(REF);
    const ref = refm ? refm[1] : null;
    const message = tail.replace(REF, '').trim();
    if (!message) problem('warn', n, `rule ${id} has no message`);
    if (re.test('')) {
      problem(
        'warn',
        n,
        kind === 'ban'
          ? `rule ${id}: regex matches empty text, so this ban always fires`
          : `rule ${id}: regex matches empty text, so this requirement always passes`,
      );
    }
    ledger.rules.push({
      kind,
      id,
      source: lit.source,
      flags: lit.flags.replace(/[gy]/g, ''),
      re,
      unless,
      message,
      ref,
      line: n,
    });
  }

  let snip = null;
  const snipIds = new Set();
  for (; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;

    if (snip) {
      if (line.trim() === '$$') {
        ledger.snippets[snip.id] = { code: snip.lines.join('\n'), line: snip.line };
        snip = null;
      } else {
        snip.lines.push(line);
      }
      continue;
    }
    if (line.trim() === '' || line.startsWith('#')) continue;

    const s = line.match(/^\$\s+([\w-]+)\s*$/);
    if (s) {
      if (snipIds.has(s[1])) problem('error', n, `duplicate snippet "${s[1]}"`);
      snipIds.add(s[1]);
      snip = { id: s[1], line: n, lines: [] };
      continue;
    }

    const c = line[0];
    if (c === '!' || c === '+') {
      parseRule(line, n);
    } else if (c === '~') {
      const m = line.match(/^~\s+([\w-]+)\s+(.*)$/);
      if (!m) {
        problem('error', n, 'malformed preference; expected "~ ID message"');
      } else {
        claim(m[1], n);
        ledger.prefs.push({ id: m[1], message: m[2].trim(), line: n });
      }
    } else if (c === '=') {
      const m = line.match(/^=\s+(\S+)\s+(.*)$/);
      if (!m) problem('error', n, 'malformed fact; expected "= key value"');
      else ledger.facts.push({ key: m[1], value: m[2].trim(), line: n });
    } else {
      problem('warn', n, 'unrecognized line ignored');
    }
  }
  if (snip) problem('error', snip.line, `snippet $${snip.id} is not closed with $$`);

  // ---- cross-checks -----------------------------------------------------
  const referenced = new Set();
  for (const r of ledger.rules) {
    if (r.ref) {
      referenced.add(r.ref);
      if (!ledger.snippets[r.ref]) problem('error', r.line, `rule ${r.id} points at missing snippet $${r.ref}`);
    }
  }
  for (const id of Object.keys(ledger.snippets)) {
    if (!referenced.has(id)) {
      problem('warn', ledger.snippets[id].line, `snippet $${id} is not referenced by any rule`);
    }
  }
  return done();
}

export function problemsOf(ledger, level) {
  return ledger.problems.filter((p) => p.level === level);
}
