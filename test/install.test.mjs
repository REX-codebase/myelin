import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs the real installer for this platform against a local stand-in for GitHub:
// install.sh on macOS and Linux, install.ps1 on Windows. Set MYELIN_TEST_PS=pwsh
// to use PowerShell 7 instead of Windows PowerShell 5.1.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WIN = process.platform === 'win32';
const PS = process.env.MYELIN_TEST_PS || 'powershell';
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const TAG = 'v9.9.9';
const ASSET = `myelin-ledger-${TAG.slice(1)}.${WIN ? 'zip' : 'tgz'}`;

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: WIN, cwd: ROOT, ...opts });
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

let mock, dir, assets;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'myelin-install-test-'));
  assets = join(dir, 'assets');
  mkdirSync(assets);
  // The "release": this checkout, packed the way the release workflow packs it.
  const pack = run('npm', ['pack', ROOT, '--pack-destination', dir, '--silent']);
  assert.equal(pack.status, 0, pack.stderr);
  const tgz = join(dir, `myelin-ledger-${VERSION}.tgz`);
  if (WIN) {
    // npm packs to a tarball with a package/ folder; the Windows installer takes a zip of the same layout.
    const x = join(dir, 'x');
    mkdirSync(x);
    // relative paths: GNU tar on Windows reads "C:\..." as a remote host
    assert.equal(run('tar', ['-xzf', `myelin-ledger-${VERSION}.tgz`, '-C', 'x'], { cwd: dir }).status, 0, 'tar could not unpack the npm tarball');
    const zip = run('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${join(x, 'package')}' -DestinationPath '${join(assets, ASSET)}'`]);
    assert.equal(zip.status, 0, zip.stderr);
    assert.equal(run('git', ['archive', '--format=zip', '--prefix=myelin-main/', 'HEAD', '-o', join(assets, 'ref.zip')]).status, 0);
  } else {
    renameSync(tgz, join(assets, ASSET));
    assert.equal(run('git', ['archive', '--format=tar.gz', '--prefix=myelin-main/', 'HEAD', '-o', join(assets, 'ref.tar.gz')]).status, 0);
  }
  writeFileSync(join(assets, 'SHA256SUMS'), `${sha256(join(assets, ASSET))}  ${ASSET}\n`);
  writeFileSync(join(assets, 'TAG'), TAG);
  // The mock must be its own process: spawnSync below blocks this one, and a server in it could not answer.
  mock = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'test', 'support', 'mock-github.mjs'), assets], { stdio: ['pipe', 'pipe', 'inherit'] });
    child.stdout.once('data', (d) => resolve({ child, url: String(d).trim() }));
    child.once('error', reject);
  });
});

after(() => {
  mock?.child.kill();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

/** Install with a fresh home. `mutate` may change the served files first; they are restored afterwards. */
function install({ env = {}, mutate } = {}) {
  const home = mkdtempSync(join(dir, 'h-'));
  const myelinHome = join(home, 'myelin');
  const backup = new Map();
  const touch = (name, fn) => { const p = join(assets, name); backup.set(name, existsSync(p) ? readFileSync(p) : null); fn(p); };
  if (mutate) mutate(touch);
  try {
    const base = {
      ...process.env,
      MYELIN_GITHUB_URL: mock.url, MYELIN_CODELOAD_URL: mock.url,
      MYELIN_HOME: myelinHome, NO_COLOR: '1', MYELIN_REF: '', ...env
    };
    const r = WIN
      ? run(PS, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(ROOT, 'install.ps1')], { env: { ...base, MYELIN_NO_MODIFY_PATH: '1', LOCALAPPDATA: home } })
      : run('sh', [join(ROOT, 'install.sh')], { env: { ...base, HOME: home, MYELIN_BIN: join(home, 'bin'), SHELL: '/bin/sh' } });
    const app = join(myelinHome, 'app', 'bin', 'myelin.mjs');
    return { ...r, out: `${r.stdout}\n${r.stderr}`, installed: existsSync(app), app };
  } finally {
    for (const [name, content] of backup) {
      const p = join(assets, name);
      if (content === null) rmSync(p, { force: true }); else writeFileSync(p, content);
    }
  }
}

const version = (app) => spawnSync(process.execPath, [app, 'version'], { encoding: 'utf8' }).stdout.trim();

test('default: installs the latest release and verifies its SHA-256', () => {
  const r = install();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /verified its SHA-256/);
  assert.match(r.out, /\(release v9\.9\.9, SHA-256 verified\)/);
  assert.ok(r.installed);
  assert.equal(version(r.app), VERSION);
});

test('a download that does not match the published SHA-256 is refused and nothing is installed', () => {
  const r = install({ mutate: (touch) => touch('SHA256SUMS', (p) => writeFileSync(p, `${'0'.repeat(64)}  ${ASSET}\n`)) });
  assert.notEqual(r.status, 0, 'a tampered download must fail');
  assert.match(r.out, /does not match the SHA-256/);
  assert.equal(r.installed, false);
});

test('a corrupted tarball is refused even when SHA256SUMS is untouched', () => {
  const r = install({ mutate: (touch) => touch(ASSET, (p) => writeFileSync(p, Buffer.concat([readFileSync(p), Buffer.from('tampered')]))) });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /does not match the SHA-256/);
  assert.equal(r.installed, false);
});

test('SHA256SUMS without an entry for the asset is refused', () => {
  const r = install({ mutate: (touch) => touch('SHA256SUMS', (p) => writeFileSync(p, `${'a'.repeat(64)}  something-else.tgz\n`)) });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /has no entry for/);
  assert.equal(r.installed, false);
});

test('a release without SHA256SUMS cannot be verified, so it is refused', () => {
  const r = install({ mutate: (touch) => touch('SHA256SUMS', (p) => rmSync(p)) });
  assert.notEqual(r.status, 0);
  assert.equal(r.installed, false);
});

test('before the first release it installs main, and says plainly that this is not verified', () => {
  const r = install({ mutate: (touch) => touch('NO_RELEASE', (p) => writeFileSync(p, '')) });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /No Myelin release has been published yet/);
  assert.match(r.out, /not checksum-verified/);
  assert.match(r.out, /\(ref main, not verified\)/);
  assert.ok(r.installed);
});

test('an explicit release tag takes the verified path', () => {
  const r = install({ env: { MYELIN_REF: TAG } });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /verified its SHA-256/);
});

test('a release tag that was never published fails and installs nothing', () => {
  const r = install({ env: { MYELIN_REF: 'v0.0.1' } });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /Could not download|not found|404/i);
  assert.equal(r.installed, false);
});

test('an explicit branch or commit installs as before, labelled as unverified', () => {
  const r = install({ env: { MYELIN_REF: 'main' } });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /not checksum-verified/);
  assert.match(r.out, /not verified\)/);
  assert.ok(r.installed);
});

test('a ref with unsafe characters is rejected before anything is fetched', () => {
  const r = install({ env: { MYELIN_REF: '../../etc/passwd' } });
  assert.notEqual(r.status, 0);
  assert.match(r.out, /Invalid ref/);
  assert.equal(r.installed, false);
});
