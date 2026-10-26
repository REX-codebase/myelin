import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const PKG = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const REACT = fileURLToPath(new URL('../libs/react/react.myelin', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'myelin-setup-'));

// Runs the CLI with stdio piped (never a TTY). Colour overrides are cleared unless passed.
const run = (dir, args, env = {}) => {
  const e = { ...process.env, ...env };
  for (const k of ['FORCE_COLOR', 'NO_COLOR']) if (!(k in env)) delete e[k];
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd: dir, env: e });
};

// A project whose package.json depends on react and tailwindcss.
function reactProject() {
  const dir = tmp();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '19.3.0', tailwindcss: '4.3.3' } }));
  return dir;
}

test('setup --yes --dry-run writes nothing', () => {
  const dir = reactProject();
  const before = readdirSync(dir).sort();
  const r = run(dir, ['setup', '--yes', '--dry-run']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /dry run/);
  assert.match(r.stdout, /react/);
  assert.deepEqual(readdirSync(dir).sort(), before);
});

test('setup --yes copies the detected ledgers and writes an AGENTS.md block', () => {
  const dir = reactProject();
  const pkgBefore = readFileSync(join(dir, 'package.json'), 'utf8');
  const r = run(dir, ['setup', '--yes']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(dir, '.myelin', 'react.myelin')));
  assert.ok(existsSync(join(dir, '.myelin', 'tailwind.myelin')));
  assert.equal(readFileSync(join(dir, '.myelin', 'react.myelin'), 'utf8'), readFileSync(REACT, 'utf8'));
  const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /^<!-- myelin:start -->$/m);
  assert.match(agents, /^<!-- myelin:end -->$/m);
  assert.match(agents, /myelin lint \.myelin\/react\.myelin,\.myelin\/tailwind\.myelin /);
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), pkgBefore, 'setup never edits package.json');
  assert.match(r.stdout, /"myelin:lint": "myelin lint react,tailwind \./);
});

test('re-running keeps one block and leaves text outside the markers alone', () => {
  const dir = reactProject();
  writeFileSync(join(dir, 'AGENTS.md'), '# Team notes\n\nKeep this line.\n');
  assert.equal(run(dir, ['setup', '--yes']).status, 0);
  const first = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(run(dir, ['setup', '--yes']).status, 0);
  const second = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(second, first);
  assert.equal(second.split('<!-- myelin:start -->').length - 1, 1);
  assert.match(second, /^# Team notes\n\nKeep this line\.\n/);

  // A different set of libs replaces the block in place rather than adding a second one.
  assert.equal(run(dir, ['setup', '--yes', '--libs=react']).status, 0);
  const third = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(third.split('<!-- myelin:start -->').length - 1, 1);
  assert.match(third, /^# Team notes\n\nKeep this line\.\n/);
  assert.doesNotMatch(third, /tailwind\.myelin/);
});

test('setup refuses a broken block instead of guessing', () => {
  const dir = reactProject();
  writeFileSync(join(dir, 'AGENTS.md'), '<!-- myelin:start -->\nno end marker\n');
  const r = run(dir, ['setup', '--yes']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /broken myelin block/);
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), '<!-- myelin:start -->\nno end marker\n');
});

test('--target picks the file, and none skips it', () => {
  const dir = reactProject();
  assert.equal(run(dir, ['setup', '--yes', '--target=none']).status, 0);
  assert.ok(existsSync(join(dir, '.myelin', 'react.myelin')), 'ledgers are still copied');
  assert.ok(!existsSync(join(dir, 'AGENTS.md')));
  assert.ok(!existsSync(join(dir, 'CLAUDE.md')));

  assert.equal(run(dir, ['setup', '--yes', '--target=claude']).status, 0);
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /<!-- myelin:start -->/);
  assert.ok(!existsSync(join(dir, 'AGENTS.md')));
});

test('doctor --json is valid JSON with a node check', () => {
  const r = run(tmp(), ['doctor', '--json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, true);
  const node = j.checks.find((c) => c.name === 'node');
  assert.ok(node, 'has a node check');
  assert.equal(node.status, 'ok');
});

test('--version and -v print just the version', () => {
  for (const flag of ['--version', '-v']) {
    const r = run(tmp(), [flag]);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, `${PKG.version}\n`);
  }
});

test('no ANSI codes when NO_COLOR is set or output is not a TTY', () => {
  const esc = /\x1b\[/;
  assert.doesNotMatch(run(tmp(), ['help']).stdout, esc, 'piped output is plain');
  assert.doesNotMatch(run(tmp(), ['help'], { NO_COLOR: '1', FORCE_COLOR: '1' }).stdout, esc, 'NO_COLOR beats FORCE_COLOR');
  assert.doesNotMatch(run(tmp(), ['doctor'], { NO_COLOR: '1' }).stdout, esc);
  assert.match(run(tmp(), ['help'], { FORCE_COLOR: '1' }).stdout, esc, 'FORCE_COLOR is honoured');
});

test('help is grouped, and an unknown command suggests the nearest one', () => {
  const help = run(tmp(), ['help']);
  assert.equal(help.status, 0);
  for (const s of ['Get started', 'Everyday', 'Authoring', 'myelin setup', 'myelin doctor']) assert.match(help.stdout, new RegExp(s));
  const typo = run(tmp(), ['lnit']);
  assert.equal(typo.status, 2);
  assert.match(typo.stderr, /Did you mean "lint"/);
});

test('setup usage errors exit 2 without writing anything', () => {
  const dir = reactProject();
  assert.equal(run(dir, ['setup', '--yes', '--libs=no-such-lib']).status, 2);
  assert.equal(run(dir, ['setup', '--yes', '--target=vim']).status, 2);
  assert.equal(run(dir, ['setup', '--yes', '--dir']).status, 2);
  assert.deepEqual(readdirSync(dir), ['package.json']);
});

test('setup with no matching libs writes nothing and exits 0', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { left_pad: '1.0.0' } }));
  const r = run(dir, ['setup', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /nothing to write/);
  assert.deepEqual(readdirSync(dir).sort(), ['package.json', 'src']);
});
