import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');
const pkg = JSON.parse(read('package.json'));
const V = pkg.version;

test('the changelog has a section for the package version, and nothing newer above it', () => {
  const headings = [...read('CHANGELOG.md').matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.ok(headings.some((h) => h === V || h.startsWith(`${V} `)), `CHANGELOG.md has no "## ${V}" section`);
  const first = headings[0];
  assert.ok(first === 'Unreleased' || first === V || first.startsWith(`${V} `), `the newest changelog heading is "${first}", expected Unreleased or ${V}`);
});

test('the packaging templates point at the package version', () => {
  const brew = read('packaging/homebrew/myelin.rb');
  assert.match(brew, new RegExp(`refs/tags/v${V.replace(/\./g, '\\.')}\\.tar\\.gz`), 'homebrew url is not this version');
  const scoop = JSON.parse(read('packaging/scoop/myelin.json'));
  assert.equal(scoop.version, V);
  assert.ok(scoop.url.includes(`v${V}.zip`), 'scoop url is not this version');
  assert.equal(scoop.extract_dir, `myelin-${V}`);
});

test('docs that tell people to pin a release name a tag that can exist', () => {
  assert.match(read('docs/HOSTS.md'), /REX-codebase\/myelin@v\d+\.\d+\.\d+/, 'the Action example should pin a release tag');
  for (const f of ['install.sh', 'install.ps1']) {
    assert.doesNotMatch(read(f), /v0\.2\.1/, `${f} still uses the old example tag`);
  }
});

test('the release workflow refuses a mismatched tag and publishes what the installers verify', () => {
  const wf = read('.github/workflows/release.yml');
  assert.match(wf, /does not match package\.json version/, 'no tag/version guard');
  assert.match(wf, /CHANGELOG\.md has no/, 'no changelog guard');
  // the Windows installer takes the zip, the others the tarball, and both are checked against SHA256SUMS
  assert.match(wf, /sha256sum myelin-ledger-\*\.tgz myelin-ledger-\*\.zip install\.sh install\.ps1 > SHA256SUMS/);
  assert.match(wf, /myelin-ledger-\*\.tgz myelin-ledger-\*\.zip install\.sh install\.ps1 SHA256SUMS/);
  assert.match(wf, /smoke:/, 'no post-release smoke test of the installers');
  assert.match(wf, /verified its SHA-256/, 'the smoke test must require the verified path');
});

test('the installers fetch the asset names the release workflow publishes', () => {
  assert.match(read('install.sh'), /myelin-ledger-\$\{TAG#v\}\.tgz/);
  assert.match(read('install.ps1'), /'myelin-ledger-' \+ \$tag\.TrimStart\('v'\) \+ '\.zip'/);
});

test('install messages the test suite and the smoke job rely on exist in both installers', () => {
  for (const f of ['install.sh', 'install.ps1']) {
    const s = read(f);
    for (const phrase of ['verified its SHA-256', 'does not match the SHA-256', 'has no entry for', 'No Myelin release has been published yet', 'not checksum-verified', 'SHA-256 verified']) {
      assert.ok(s.includes(phrase), `${f} no longer says "${phrase}"`);
    }
  }
});
