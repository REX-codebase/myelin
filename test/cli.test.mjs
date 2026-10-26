import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.mjs';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const EVAL = fileURLToPath(new URL('../eval/run-eval.mjs', import.meta.url));
const HUT = fileURLToPath(new URL('../examples/three-webgpu-hut/hut.myelin', import.meta.url));
const EXAMPLES = fileURLToPath(new URL('../examples', import.meta.url));

const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'myelin-test-'));

test('validate accepts a good ledger', () => {
  const r = run('validate', HUT);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ok \(/);
});

test('validate rejects a bad ledger with exit 1', () => {
  const dir = tmp();
  const f = join(dir, 'bad.myelin');
  writeFileSync(f, 'myelin 1\nid x\n');
  const r = run('validate', f);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /missing required key/);
});

test('self passes on all examples (directory argument)', () => {
  const r = run('self', EXAMPLES);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /clean/);
});

test('self --json is parseable', () => {
  const r = run('self', HUT, '--json');
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).ok, true);
});

test('lint fails on a bad file and names the rules', () => {
  const dir = tmp();
  const f = join(dir, 'bad.js');
  writeFileSync(f, "const x = Math.random();\nimport 'three/nodes';\n");
  const r = run('lint', HUT, f);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL B1  .*bad\.js:1/);
  assert.match(r.stdout, /FAIL B2/);
  assert.match(r.stdout, /FAIL R1  missing/);
});

test('lint scans a directory and honours --ext', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'a.js'), 'Math.random()');
  writeFileSync(join(dir, 'src', 'notes.txt'), 'Math.random()');
  const r = run('lint', HUT, dir, '--json');
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).counts.units, 1);
});

test('lint on the ledger snippets themselves is clean', () => {
  const dir = tmp();
  const ledger = parse(readFileSync(HUT, 'utf8'));
  writeFileSync(join(dir, 'all.js'), Object.values(ledger.snippets).map((s) => s.code).join('\n'));
  const r = run('lint', HUT, dir);
  assert.equal(r.status, 0, r.stdout);
});

test('gate prints rules, and snippets on request', () => {
  const plain = run('gate', HUT);
  assert.equal(plain.status, 0);
  assert.match(plain.stdout, /MUST NOT/);
  assert.doesNotMatch(plain.stdout, /^\$ rng$/m);
  const withSnip = run('gate', HUT, '--snippets=rng');
  assert.match(withSnip.stdout, /^\$ rng$/m);
  assert.match(withSnip.stdout, /makeRng/);
  assert.equal(run('gate', HUT, '--snippets=nope').status, 1);
});

test('header and snippet commands', () => {
  assert.match(run('header', HUT).stdout, /^myelin 1/);
  assert.match(run('snippet', HUT, 'rng').stdout, /makeRng/);
  assert.equal(run('snippet', HUT, 'nope').status, 1);
});

test('init writes a valid ledger and will not overwrite', () => {
  const dir = tmp();
  const f = join(dir, 'new.myelin');
  assert.equal(run('init', f).status, 0);
  assert.ok(existsSync(f));
  assert.equal(run('validate', f).status, 0);
  assert.equal(run('self', f).status, 0);
  assert.equal(run('init', f).status, 1);
});

test('usage errors exit 2', () => {
  assert.equal(run().status, 2);
  assert.equal(run('validate', '/no/such/file.myelin').status, 2);
  assert.equal(run('bogus').status, 2);
});

test('eval harness scores conditions per model', () => {
  const root = tmp();
  const ledger = parse(readFileSync(HUT, 'utf8'));
  const good = Object.values(ledger.snippets).map((s) => s.code).join('\n');
  mkdirSync(join(root, 'modelA', 'baseline'), { recursive: true });
  mkdirSync(join(root, 'modelA', 'myelin'), { recursive: true });
  writeFileSync(join(root, 'modelA', 'baseline', 'run1.js'), 'const x = Math.random();');
  writeFileSync(join(root, 'modelA', 'myelin', 'run1.js'), good);
  const csv = join(root, 'out.csv');
  const r = spawnSync(process.execPath, [EVAL, HUT, root, `--csv=${csv}`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /modelA\s+baseline\s+1\s+0\s+0%/);
  assert.match(r.stdout, /modelA\s+myelin\s+1\s+1\s+100%/);
  assert.match(readFileSync(csv, 'utf8'), /modelA,baseline,run1\.js|"modelA","baseline","run1\.js"/);
});

test('--version prints the version and --ext without a value is a usage error', () => {
  let r = run('--version');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\d+\.\d+\.\d+/);
  r = run('lint', 'zod', 'libs/zod/bench/good', '--ext');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--ext needs a value/);
});
