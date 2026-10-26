import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listLibs, libPath, benchAll, benchCross, detectLibs } from '../src/libs.mjs';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'myelin-libs-'));

test('every bundled lib is a valid ledger with a version and sources', () => {
  const libs = listLibs();
  assert.ok(libs.length >= 10, `expected at least 10 libs, got ${libs.length}`);
  const index = JSON.parse(readFileSync(fileURLToPath(new URL('../libs/index.json', import.meta.url)), 'utf8'));
  for (const l of libs) {
    assert.ok(l.ok, `${l.id} is invalid`);
    assert.ok(l.version, `${l.id} has no "= version" fact`);
    assert.ok(l.verified, `${l.id} has no "= verified" fact`);
    assert.ok(l.bans >= 5, `${l.id} has only ${l.bans} bans`);
    assert.ok(index[l.id], `${l.id} is missing from libs/index.json`);
    assert.ok(existsSync(join(libPath(l.id), '..', 'SOURCES.md')), `${l.id} has no SOURCES.md`);
  }
});

test('every lib catches its stale corpus and leaves its current corpus clean', () => {
  for (const r of benchAll()) {
    const off = r.files.filter((f) => !f.exact).map((f) => `${f.file}: expected [${f.expected}] fired [${f.fired}]`);
    assert.deepEqual(off, [], `${r.id} bench mismatch`);
    assert.ok(r.badFiles >= 5 && r.goodFiles >= 4, `${r.id} corpus too small`);
  }
});

test('no ledger fires on another library\'s current code', () => {
  const r = benchCross();
  assert.deepEqual(r.hits, []);
});

test('lint accepts a bundled lib id and several comma-separated', () => {
  const dir = tmp();
  const f = join(dir, 'scene.js');
  writeFileSync(f, "import * as THREE from 'three/webgpu';\nconst clock = new THREE.Clock();\n");
  let r = run('lint', 'three', f);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL B5/);
  r = run('lint', 'three,react', f, '--json');
  assert.equal(r.status, 1);
  const j = JSON.parse(r.stdout);
  assert.equal(j.results.length, 2);
  assert.equal(j.results[1].ok, true);
});

test('unknown lib gives a usage error', () => {
  const r = run('lint', 'no-such-lib', BIN);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /myelin libs/);
});

test('libs, detect and use', () => {
  let r = run('libs');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /three\s+r186/);
  const dir = tmp();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '16.4.3', react: '19.3.0', '@tailwindcss/postcss': '4.3.3' } }));
  const found = detectLibs(dir).found.map((x) => x.id).sort();
  assert.deepEqual(found, ['nextjs', 'react', 'tailwind']);
  r = run('detect', dir);
  assert.match(r.stdout, /myelin lint .*nextjs/);
  r = run('use', 'zod', dir);
  assert.equal(r.status, 0);
  assert.ok(existsSync(join(dir, '.myelin', 'zod.myelin')));
  r = run('use', 'zod', dir);
  assert.equal(r.status, 1, 'refuses to overwrite without --force');
});

test('gate works with a lib id', () => {
  const r = run('gate', 'react');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /react/i);
});
