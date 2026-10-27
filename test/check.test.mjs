import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.mjs';
import { check, snippetUnits } from '../src/check.mjs';
import { renderGate, renderHeader } from '../src/gate.mjs';

const HEAD = ['myelin 1', 'id      t', 'about   test ledger', 'fires   alpha', 'status  test', ''].join('\n');
const ledger = parse(
  HEAD +
    '\n' +
    String.raw`! B1 /Math\.random\(/   no random
! B2 /DirectionalLight/ unless /bias/   needs bias
+ R1 /export/   need export

$ code
export const a = 1;
$$
`,
);

test('fixture ledger is valid', () => {
  assert.ok(ledger.ok, JSON.stringify(ledger.problems));
});

test('a ban fires and reports its line number', () => {
  const r = check(ledger, [{ name: 'a.js', text: 'export {};\nconst x = Math.random();' }]);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'B1');
  assert.equal(r.violations[0].line, 2);
});

test('unless exempts a unit when it matches', () => {
  const bad = check(ledger, [{ name: 'a.js', text: 'export new DirectionalLight()' }]);
  assert.deepEqual(bad.violations.map((v) => v.id), ['B2']);
  const ok = check(ledger, [{ name: 'a.js', text: 'export new DirectionalLight(); light.shadow.bias = 1' }]);
  assert.ok(ok.ok);
});

test('requirements are checked across all units together', () => {
  const r = check(ledger, [
    { name: 'a.js', text: 'export const x = 1;' },
    { name: 'b.js', text: 'const y = 2;' },
  ]);
  assert.ok(r.ok);
});

test('a missing requirement is reported without a unit', () => {
  const r = check(ledger, [{ name: 'a.js', text: 'const y = 2;' }]);
  assert.equal(r.violations[0].kind, 'require');
  assert.equal(r.violations[0].unit, null);
});

test('checking twice gives the same answer', () => {
  const units = [{ name: 'a.js', text: 'Math.random()' }];
  assert.deepEqual(check(ledger, units), check(ledger, units));
});

test('gate text lists every rule and optional snippets', () => {
  const text = renderGate(ledger, { snippets: ['code'] });
  assert.match(text, /MUST NOT/);
  assert.match(text, /B1:/);
  assert.match(text, /allowed only if the output also matches \/bias\//);
  assert.match(text, /^\$ code$/m);
  assert.match(text, /BEFORE YOU ANSWER/);
  assert.doesNotMatch(renderGate(ledger), /^\$ code$/m);
  assert.match(renderGate(ledger, { snippets: 'all' }), /^\$ code$/m);
});

test('header render is short and keeps the fire-words', () => {
  const h = renderHeader(ledger);
  assert.match(h, /^myelin 1/);
  assert.match(h, /fires   alpha/);
  assert.ok(h.split('\n').length <= 6);
});

function ledgersIn(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? ledgersIn(p) : p.endsWith('.myelin') ? [p] : [];
  });
}

test('every example ledger validates and passes its own rules', () => {
  const root = fileURLToPath(new URL('../examples', import.meta.url));
  const files = ledgersIn(root);
  assert.ok(files.length >= 3);
  for (const f of files) {
    const l = parse(readFileSync(f, 'utf8'));
    assert.ok(l.ok, `${f}: ${JSON.stringify(l.problems.filter((p) => p.level === 'error'))}`);
    const r = check(l, snippetUnits(l));
    assert.ok(r.ok, `${f}: ${JSON.stringify(r.violations)}`);
  }
});

test('comments are checked by default, skipped with "comments skip"', () => {
  const plain = check(ledger, [{ name: 'a.js', text: 'export {};\n// Math.random(' }]);
  assert.deepEqual(plain.violations.map((v) => v.id), ['B1']);
});

test('a ban does not fire on a comment that mentions it (C-style units)', () => {
  const ledger = parse(HEAD.replace('status  test', 'comments skip\nstatus  test') + '\n' + String.raw`! B1 /Math\.random\(/   no random
`);
  assert.ok(ledger.ok, JSON.stringify(ledger.problems));
  const r = check(ledger, [{ name: 'a.js', text: 'export {};\n// Math.random( is banned\n/* Math.random( */ const u = "https://x.dev/a";' }]);
  assert.ok(r.ok, JSON.stringify(r.violations));
  const h = check(ledger, [{ name: 'a.html', text: '<!-- Math.random( --><script>export {}</script>' }]);
  assert.ok(h.ok);
  const live = check(ledger, [{ name: 'a.js', text: 'export {};\nconst s = "//"; Math.random();' }]);
  assert.deepEqual(live.violations.map((v) => v.id), ['B1']);
  assert.equal(live.violations[0].line, 2);
});

test('a quote in a regex literal does not hide a comment on the same line', () => {
  const ledger = parse(HEAD.replace('status  test', 'comments skip\nstatus  test') + '\n' + String.raw`! B1 /Math\.random\(/   no random
`);
  assert.ok(ledger.ok, JSON.stringify(ledger.problems));
  const r = check(ledger, [{ name: 'a.js', text: "const re = /\"/; /* Math.random() */\nconst q = /'/; // Math.random()\n" }]);
  assert.ok(r.ok, JSON.stringify(r.violations));
});

// ---- myelin 1.1: `when` and unit context ------------------------------------------------

const HEAD11 = HEAD.replace('myelin 1', 'myelin 1.1');
const guarded = parse(
  HEAD11 +
    '\n' +
    String.raw`! W1 /\.email\(/ when /from\s+['"]zod['"]/   Use z.email().
! W2 /\.url\(/ unless /\/\/ ok/ when /from\s+['"]zod['"]/   Use z.url().
`,
);

test('myelin 1.1 ledger with when/unless is valid and exposes both guards', () => {
  assert.ok(guarded.ok, JSON.stringify(guarded.problems));
  assert.equal(guarded.version, 1);
  assert.equal(guarded.minor, 1);
  assert.equal(guarded.rules[0].when.source, String.raw`from\s+['"]zod['"]`);
  assert.equal(guarded.rules[0].unless, null);
  assert.ok(guarded.rules[1].when && guarded.rules[1].unless, 'guards parse in either order');
});

test('when limits a ban to units that match the guard', () => {
  const hit = check(guarded, [{ name: 'a.ts', text: "import { z } from 'zod';\nz.string().email();" }]);
  assert.deepEqual(hit.violations.map((v) => v.id), ['W1']);
  assert.equal(hit.violations[0].line, 2);
  const other = check(guarded, [{ name: 'b.ts', text: 'form.email(); // not zod' }]);
  assert.ok(other.ok, 'the same call in a file that does not import zod is fine');
});

test('unless still lifts a guarded ban', () => {
  const t = "import { z } from 'zod';\nz.string().url(); // ok";
  assert.ok(check(guarded, [{ name: 'a.ts', text: t }]).ok);
  assert.deepEqual(check(guarded, [{ name: 'a.ts', text: "import { z } from 'zod';\nz.string().url();" }]).violations.map((v) => v.id), ['W2']);
});

test('a unit context decides when/unless while only the text is matched', () => {
  const file = "import { z } from 'zod';\n\nconst a = 1;\nz.string().email();\n";
  const written = 'z.string().email();';
  const r = check(guarded, [{ name: 'a.ts', text: written, context: file }]);
  assert.deepEqual(r.violations.map((v) => v.id), ['W1'], 'the import is outside the snippet but inside the file');
  assert.equal(r.violations[0].line, 1, 'lines are relative to the checked text');
  const legacy = "import { z } from 'zod';\nz.string().email(); // old line the model did not touch\n";
  assert.ok(check(guarded, [{ name: 'a.ts', text: 'const b = 2;', context: legacy }]).ok, 'old code outside the snippet is not judged');
});

test('when needs "myelin 1.1" so a 1.0 reader can never read it as message text', () => {
  const old = parse(HEAD + '\n' + String.raw`! W1 /\.email\(/ when /zod/   msg` + '\n');
  assert.equal(old.ok, false);
  assert.match(old.problems.find((p) => p.level === 'error').message, /myelin 1\.1/);
  assert.equal(parse('myelin 1.2\nid x\nabout y\nfires z\n').ok, false, 'unknown minor versions are rejected');
  assert.equal(parse('myelin 2\nid x\nabout y\nfires z\n').ok, false);
  assert.ok(parse('myelin 1.0\nid x\nabout y\nfires z\nstatus s\n').ok);
});

test('when is rejected on requirements and when repeated', () => {
  const req = parse(HEAD11 + '\n' + String.raw`+ R1 /x/ when /y/   msg` + '\n');
  assert.match(req.problems.find((p) => p.level === 'error').message, /only allowed on ! rules/);
  const twice = parse(HEAD11 + '\n' + String.raw`! B1 /x/ when /y/ when /z/   msg` + '\n');
  assert.match(twice.problems.find((p) => p.level === 'error').message, /twice/);
  const open = parse(HEAD11 + '\n' + String.raw`! B1 /x/ when /y   msg` + '\n');
  assert.match(open.problems.find((p) => p.level === 'error').message, /not closed/);
});

test('gate text and header show the guard and the 1.1 version line', () => {
  assert.match(renderGate(guarded), /W1: .*only applies to code that matches \/from\\s\+\['"\]zod\['"\]\//);
  assert.match(renderHeader(guarded), /^myelin 1\.1$/m);
});

test('comments skip masks the context as well as the text', () => {
  const l = parse(HEAD11.replace('status  test', 'comments skip\nstatus  test') + '\n' + String.raw`! W1 /\.email\(/ when /from\s+['"]zod['"]/   msg` + '\n');
  assert.ok(l.ok, JSON.stringify(l.problems));
  const r = check(l, [{ name: 'a.ts', text: 'z.string().email();', context: "// import x from 'zod'\nz.string().email();" }]);
  assert.ok(r.ok, 'an import that only appears in a comment does not enable the rule');
});
