import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.mjs';
import { check } from '../src/check.mjs';
import { fixPlan } from '../src/fix.mjs';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const HUT = fileURLToPath(new URL('../examples/three-webgpu-hut/hut.myelin', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'myelin-fix-'));

const HEAD = 'myelin 1\nid      t\nabout   t\nfires   x\nstatus  t\n';
const ledger = parse(HEAD + '\n! B1 /Math\\.random\\(/   Use the seeded rng. -> $rng\n\n$ rng\nexport const r = 1;\n$$\n');

test('fixPlan groups a rule across files so its snippet appears once', () => {
  const result = check(ledger, [
    { name: 'a.js', text: 'Math.random()' },
    { name: 'b.js', text: 'x;\nMath.random()' },
  ]);
  const plan = fixPlan(ledger, result);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].id, 'B1');
  assert.equal(plan[0].snippet, 'export const r = 1;');
  assert.deepEqual(plan[0].places, [
    { unit: 'a.js', line: 1 },
    { unit: 'b.js', line: 2 },
  ]);
});

test('fixPlan has no snippet for a rule without a pointer', () => {
  const l = parse(HEAD + '\n! B1 /zz/ plain message\n');
  assert.ok(l.ok, JSON.stringify(l.problems));
  const plan = fixPlan(l, check(l, [{ name: 'a.js', text: 'zz' }]));
  assert.equal(plan[0].snippet, null);
});

test('fix prints each failing rule once with its snippet and exits 1', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'a.js'), 'const x = Math.random();\n');
  writeFileSync(join(dir, 'b.js'), 'const y = Math.random();\n');
  const r = run('fix', HUT, dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.stdout.match(/^FIX B1 /gm).length, 1);
  assert.equal(r.stdout.match(/snippet \$rng/g).length, 1);
  assert.match(r.stdout, /makeRng/);
  assert.match(r.stdout, /a\.js:1, .*b\.js:1/);
  assert.match(r.stdout, /FIX R1  /);
  assert.match(r.stdout, /missing from all files/);
});

test('fix does not change the files it checks', () => {
  const dir = tmp();
  const f = join(dir, 'a.js');
  writeFileSync(f, 'const x = Math.random();\n');
  const before = readFileSync(f, 'utf8');
  const mtime = statSync(f).mtimeMs;
  run('fix', HUT, f);
  assert.equal(readFileSync(f, 'utf8'), before);
  assert.equal(statSync(f).mtimeMs, mtime);
});

test('fix on a clean file exits 0 and prints no FIX lines', () => {
  const dir = tmp();
  const ledgerFile = join(dir, 'ban.myelin');
  writeFileSync(ledgerFile, HEAD + '\n! B1 /Math\\.random\\(/   Use the seeded rng.\n');
  const f = join(dir, 'a.js');
  writeFileSync(f, 'export {};\n');
  const r = run('fix', ledgerFile, f);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /^FIX /m);
  assert.match(r.stdout, /clean/);
});

test('fix --json gives the fixes next to the violations', () => {
  const dir = tmp();
  const f = join(dir, 'a.js');
  writeFileSync(f, 'Math.random()\n');
  const r = run('fix', HUT, f, '--json');
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, false);
  const b1 = j.fixes.find((x) => x.id === 'B1');
  assert.equal(b1.kind, 'ban');
  assert.match(b1.snippet, /makeRng/);
});

test('fix accepts comma-separated lib ids and honours --ext', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'scene.js'), "import * as THREE from 'three/webgpu';\nconst clock = new THREE.Clock();\n");
  writeFileSync(join(dir, 'notes.txt'), "import * as THREE from 'three/webgpu';\nconst clock = new THREE.Clock();\n");
  const r = run('fix', 'three,react', dir, '--json', '--ext=js');
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.results.length, 2);
  assert.equal(j.results[0].counts.units, 1);
  assert.ok(j.results[0].fixes.some((x) => x.id === 'B5'));
});

test('fix usage errors exit 2', () => {
  assert.equal(run('fix').status, 2);
  assert.equal(run('fix', HUT).status, 2);
});
