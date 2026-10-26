import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, markdown } from '../scripts/drift.mjs';
import { libPath } from '../src/libs.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../scripts/drift.mjs', import.meta.url));
const pins = JSON.parse(readFileSync(new URL('../libs/pins.json', import.meta.url), 'utf8'));
const index = JSON.parse(readFileSync(new URL('../libs/index.json', import.meta.url), 'utf8'));

test('every bundled lib has a pin, and no pin is for a lib that does not exist', () => {
  assert.deepEqual(Object.keys(pins).sort(), Object.keys(index).sort());
});

test('each pin is a package that lib detects, at the version its own ledger names', () => {
  for (const [id, pin] of Object.entries(pins)) {
    assert.match(pin.version, /^\d+\.\d+\.\d+$/, `${id}: pin is not a plain version`);
    const detects = index[id].packages.map((p) => p.replace('/*', ''));
    assert.ok(detects.some((p) => p === pin.package), `${id}: ${pin.package} is not one of the packages the lib detects (${detects.join(', ')})`);
    const line = /^= version\s+(.+)$/m.exec(readFileSync(libPath(id), 'utf8'));
    assert.ok(line, `${id}: ledger has no "= version" line`);
    assert.ok(line[1].includes(pin.version), `${id}: pins.json says ${pin.version} but the ledger says "${line[1].slice(0, 70)}"`);
  }
});

test('classify: how far behind a pin is', () => {
  const c = classify;
  assert.equal(c('5.3.0', '5.3.0'), 'current');
  assert.equal(c('5.3.0', '5.3.9'), 'patch');
  assert.equal(c('5.3.0', '5.4.0'), 'minor');
  assert.equal(c('5.3.0', '6.0.0'), 'major');
  assert.equal(c('5.3.0', '5.2.9'), 'ahead');
  assert.equal(c('7.43.0', '7.44.0'), 'minor');
  // 0.x: a new minor can break, so it counts as a major (three.js ships a release as 0.<r>.x)
  assert.equal(c('0.186.1', '0.186.2'), 'patch');
  assert.equal(c('0.186.1', '0.187.0'), 'major');
  assert.equal(c('0.45.4', '0.46.0'), 'major');
  assert.equal(c('1.0.0', 'garbage'), 'unknown');
});

test('the report lists drift first and says what to do about it', () => {
  const md = markdown([
    { id: 'a', package: 'a', pinned: '1.0.0', latest: '1.0.0', status: 'current' },
    { id: 'b', package: 'b', pinned: '1.0.0', latest: '2.0.0', status: 'major' }
  ], '2026-01-01');
  assert.match(md, /\*\*1 behind by a minor or major\.\*\*/);
  assert.ok(md.indexOf('| b |') < md.indexOf('| a |'), 'drift must sort above ledgers that are current');
  assert.match(md, /libs\/pins\.json/);
});

/** A stand-in for registry.npmjs.org, built from the real pins with some overrides. */
function registry(overrides) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const accept = req.headers.accept || '';
      const path = decodeURIComponent(new URL(req.url, 'http://r').pathname.slice(1));
      const name = path.replace(/\/latest$/, '');
      const entry = Object.values(pins).find((p) => p.package === name);
      const o = overrides[name];
      if (!entry || o === 500) { res.writeHead(o === 500 ? 500 : 404); return res.end(); }
      res.writeHead(200, { 'content-type': 'application/json' });
      if (path.endsWith('/latest')) return res.end(JSON.stringify({ version: o?.latest || entry.version }));
      // the packument, only asked for when `latest` is a prerelease
      res.end(JSON.stringify({ versions: Object.fromEntries((o?.versions || [entry.version]).map((v) => [v, {}])), accept }));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

function runScript(url, args) {
  // async on purpose: the registry lives in this process, so spawnSync would deadlock it
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, MYELIN_NPM_REGISTRY: url } });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('against a registry: current, minor, 0.x major, scoped names, a prerelease latest, and an outage', async () => {
  const { server, url } = await registry({
    openai: { latest: '7.44.0' },                                        // minor
    three: { latest: '0.187.0' },                                        // 0.x minor = major
    '@tanstack/react-query': { latest: '5.104.9' },                      // patch, scoped name
    prisma: { latest: '8.0.0-rc.27', versions: ['7.10.1', '7.10.0', '8.0.0-rc.27'] }, // prerelease latest
    zod: 500                                                             // registry error
  });
  try {
    const r = await runScript(url, ['--json']);
    assert.equal(r.status, 0, r.stderr);
    const rows = Object.fromEntries(JSON.parse(r.stdout).map((x) => [x.id, x]));
    assert.equal(rows.react.status, 'current');
    assert.equal(rows.openai.status, 'minor');
    assert.equal(rows.three.status, 'major');
    assert.equal(rows['tanstack-query'].status, 'patch', 'a scoped package name must reach the registry encoded');
    assert.equal(rows.prisma.status, 'current', 'a prerelease latest tag must not count as drift');
    assert.equal(rows.prisma.npmLatestTag, '8.0.0-rc.27');
    assert.equal(rows.zod.status, 'unknown');
    assert.match(rows.zod.error, /500/);
  } finally { server.close(); }
});

test('--strict fails on drift and passes when everything is current', async () => {
  const drifted = await registry({ eslint: { latest: '11.0.0' } });
  const clean = await registry({});
  try {
    assert.equal((await runScript(drifted.url, ['--strict'])).status, 1);
    assert.equal((await runScript(clean.url, ['--strict'])).status, 0);
    assert.equal((await runScript(drifted.url, [])).status, 0, 'without --strict, drift is reported but is not a failure');
  } finally { drifted.server.close(); clean.server.close(); }
});

// ---- the weekly issue: open on drift, edit in place, close when resolved (POSIX shell, stubbed gh)

const ISSUE = fileURLToPath(new URL('../scripts/drift-issue.sh', import.meta.url));
const posix = process.platform !== 'win32';

/** Run drift-issue.sh with a fake `gh` that logs its arguments and "finds" the issue number given. */
function issue(env, existing = '') {
  const dir = mkdtempSync(join(tmpdir(), 'myelin-gh-'));
  const log = join(dir, 'calls.log');
  writeFileSync(join(dir, 'gh'), `#!/bin/sh\necho "$@" >> "${log}"\ncase "$1 $2" in "issue list") printf '%s' "${existing}" ;; esac\n`);
  chmodSync(join(dir, 'gh'), 0o755);
  const r = spawnSync('sh', [ISSUE], { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, ...env } });
  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
  return { ...r, calls, mutations: calls.filter((c) => /^issue (create|edit|close)/.test(c)) };
}

test('drift and no issue open: opens one with the report as its body', { skip: !posix }, () => {
  const r = issue({ DRIFT: 'true', BODY: 'drift.md' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.mutations.length, 1);
  assert.match(r.mutations[0], /^issue create --title Ledger drift: pinned versions are behind npm --body-file drift\.md$/);
});

test('drift and an issue already open: edits it in place instead of opening another', { skip: !posix }, () => {
  const r = issue({ DRIFT: 'true', BODY: 'drift.md' }, '7');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.mutations, ['issue edit 7 --body-file drift.md']);
});

test('no drift and an issue open: closes it, saying why', { skip: !posix }, () => {
  const r = issue({ DRIFT: 'false', BODY: 'drift.md' }, '7');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.mutations.length, 1);
  assert.match(r.mutations[0], /^issue close 7 --comment Every ledger is back in step/);
});

test('no drift and no issue: does nothing', { skip: !posix }, () => {
  const r = issue({ DRIFT: 'false', BODY: 'drift.md' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.mutations, []);
});

test('refuses to run without knowing whether there is drift', { skip: !posix }, () => {
  const r = issue({ DRIFT: '', BODY: 'drift.md' });
  assert.notEqual(r.status, 0);
  assert.deepEqual(r.mutations, []);
});

test('the workflow does nothing on a registry outage, and runs weekly', () => {
  const wf = readFileSync(new URL('../.github/workflows/drift.yml', import.meta.url), 'utf8');
  assert.match(wf, /cron: "[^"]+ \* \* 1"/, 'expected a weekly (Monday) schedule');
  assert.match(wf, /workflow_dispatch/);
  assert.match(wf, /if: steps\.compare\.outputs\.unknown == '0'/, 'an outage must not open or close the issue');
  assert.match(wf, /issues: write/);
});
