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
