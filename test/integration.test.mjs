import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const tmps = [];
test.after(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const write = (root, rel, text) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof text === 'string' ? text : JSON.stringify(text, null, 2));
};
const run = (dir, args) => {
  const e = { ...process.env };
  delete e.FORCE_COLOR;
  delete e.NO_COLOR;
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd: dir, env: e });
};

/** A project with one installed package that deprecates a function, and a source file using it. */
function project({ installed = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'myelin-int-'));
  tmps.push(root);
  write(root, 'package.json', { name: 'app', dependencies: { gadget: '^1' } });
  write(root, 'src/a.ts', "import { oldWay, newWay } from 'gadget';\noldWay();\nnewWay();\n");
  if (installed) {
    write(root, 'node_modules/gadget/package.json', { name: 'gadget', version: '2.0.0', types: 'index.d.ts' });
    write(root, 'node_modules/gadget/index.d.ts', '/** @deprecated Use `newWay` instead. */\nexport declare function oldWay(): void;\nexport declare function newWay(): void;\n');
  }
  return root;
}

test('setup --yes derives a ledger when dependencies are installed, and names it in the agent block', () => {
  const dir = project();
  const r = run(dir, ['setup', '--yes']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /create\s+\.myelin[\\/]derived\.myelin\s+1 rules read from 1 installed package\b/);
  assert.ok(existsSync(join(dir, '.myelin', 'derived.myelin')));
  assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /ledgers: derived\./);
  assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /myelin lint \.myelin\/derived\.myelin /);
  assert.match(r.stdout, /lint src\/ with derived: 1 failure/, 'the wizard shows what the project already uses');
});

test('--yes never touches the agent settings; --hook does, and --dry-run writes nothing', () => {
  const dir = project();
  const before = readdirSync(dir).sort();
  const dry = run(dir, ['setup', '--yes', '--hook', '--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /add hooks\s+\.claude[\\/]settings\.json/);
  assert.deepEqual(readdirSync(dir).sort(), before);
  assert.equal(run(dir, ['setup', '--yes']).status, 0);
  assert.ok(!existsSync(join(dir, '.claude')), '--yes alone does not install hooks');
  assert.equal(run(dir, ['setup', '--yes', '--hook']).status, 0);
  assert.match(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'), /myelin hook post/);
  const again = run(dir, ['setup', '--yes', '--hook']);
  assert.match(again.stdout, /unchanged\s+\.claude[\\/]settings\.json/);
});

test('--no-derive skips it, and a project with nothing installed is not an error', () => {
  const skipped = project();
  assert.equal(run(skipped, ['setup', '--yes', '--no-derive']).status, 0);
  assert.ok(!existsSync(join(skipped, '.myelin', 'derived.myelin')));
  const bare = project({ installed: false });
  const r = run(bare, ['setup', '--yes']);
  assert.equal(r.status, 0);
  assert.ok(!existsSync(join(bare, '.myelin', 'derived.myelin')));
  const forced = run(bare, ['setup', '--yes', '--derive']);
  assert.match(forced.stdout, /--derive needs installed dependencies/);
});

test('detect lists the derived ledger once it exists, so the GitHub Action lints with it', () => {
  const dir = project();
  assert.doesNotMatch(run(dir, ['detect']).stdout, /derived/);
  assert.equal(run(dir, ['derive']).status, 0);
  assert.match(run(dir, ['detect']).stdout, /derived\s+\(\.myelin\/derived\.myelin\)/);
  const ids = JSON.parse(run(dir, ['detect', '--json']).stdout).map((x) => x.id);
  assert.ok(ids.includes('derived'));
});

test('doctor tells a missing, current and stale derived ledger apart, and notices the hook', () => {
  const dir = project();
  const status = () => JSON.parse(run(dir, ['doctor', '--json']).stdout).checks;
  const row = (name) => status().find((c) => c.name === name);
  assert.equal(row('derived ledger').status, 'warn');
  assert.match(row('derived ledger').detail, /not written yet/);
  run(dir, ['derive']);
  assert.equal(row('derived ledger').status, 'ok');
  write(dir, 'node_modules/gadget/package.json', { name: 'gadget', version: '3.0.0', types: 'index.d.ts' });
  assert.match(row('derived ledger').detail, /older than node_modules/);
  assert.equal(row('agent hook'), undefined, 'no .claude folder, so no opinion');
  mkdirSync(join(dir, '.claude'));
  assert.equal(row('agent hook').status, 'warn');
  run(dir, ['hook', 'install']);
  assert.equal(row('agent hook').status, 'ok');
});

test('lint and fix accept --ignore and the derived ledger name', () => {
  const dir = project();
  run(dir, ['derive']);
  assert.equal(run(dir, ['lint', 'derived', 'src/']).status, 1);
  const fix = run(dir, ['fix', 'derived', 'src/']);
  assert.match(fix.stdout, /FIX gadget-oldWay/);
  assert.equal(run(dir, ['lint', 'derived', 'src/', '--ignore=gadget-oldWay']).status, 0);
  assert.equal(run(dir, ['lint', 'derived', 'src/', '--ignore']).status, 2);
});

test('the gate for the derived ledger is a short list of sentences', () => {
  const dir = project();
  run(dir, ['derive']);
  const g = run(dir, ['gate', 'derived']);
  assert.equal(g.status, 0);
  assert.match(g.stdout, /- `oldWay\(\)` is deprecated in gadget@2\.0\.0\. Use `newWay` instead\./);
  assert.doesNotMatch(g.stdout, /\(\?</);
});

test('help lists the new commands and an unknown one still gets a suggestion', () => {
  const help = run(tmps[0] || tmpdir(), ['help']).stdout;
  for (const s of ['myelin derive', 'myelin hook install', 'Agents']) assert.ok(help.includes(s), s);
  assert.match(run(tmpdir(), ['dervie']).stderr, /Did you mean "derive"/);
  assert.match(run(tmpdir(), ['hok']).stderr, /Did you mean "hook"/);
});
