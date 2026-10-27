import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hookPost, writtenTexts, mergeSettings, sessionBrief, projectRoot, projectLedgers, report, hooksInstalled } from '../src/hook.mjs';

const CLI = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const tmps = [];
test.after(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const write = (root, rel, text) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof text === 'string' ? text : JSON.stringify(text, null, 2));
  return p;
};

const HEAD = ['myelin 1.1', 'id      t', 'about   test', 'fires   zod', 'comments skip', 'status  test', ''].join('\n');
const CURATED = HEAD + String.raw`
! T1 /\.email\(/ when /from\s+['"]zod['"]/   Use z.email().
! T2 /\.nativeEnum\(/ when /from\s+['"]zod['"]/   Use z.enum().
+ R1 /NEVER_PRESENT_REQUIREMENT/   a requirement a fragment could never satisfy
`;
const DERIVED = HEAD.replace('id      t', 'id      derived') + String.raw`
! zod-ZodString-email /\)\s*\??\.email\s*\(/ when /from\s+['"]zod['"]/ ` + '`ZodString.email()` is deprecated in zod@4. Use `z.email()` instead.\n';

function project() {
  const root = mkdtempSync(join(tmpdir(), 'myelin-hook-'));
  tmps.push(root);
  write(root, 'package.json', { name: 'app', dependencies: { zod: '^4', react: '^19' } });
  write(root, '.myelin/zod.myelin', CURATED);
  return root;
}
const FILE = ["import { z } from 'zod';", '', 'export const legacy = z.string().email();', 'export const other = 1;', '', 'export const added = z.string().min(1);', ''].join('\n');
const payload = (root, tool, input, extra = {}) => ({ session_id: 's', cwd: root, hook_event_name: 'PostToolUse', tool_name: tool, tool_input: input, tool_response: {}, ...extra });

async function post(p) {
  const out = [];
  const code = await hookPost(p, { stderr: (s) => out.push(s) });
  return { code, out: out.join('\n') };
}

test('writtenTexts reads what each editing tool introduced', () => {
  assert.deepEqual(writtenTexts('Edit', { new_string: 'a' }), ['a']);
  assert.deepEqual(writtenTexts('Write', { content: 'whole' }), ['whole']);
  assert.deepEqual(writtenTexts('MultiEdit', { edits: [{ new_string: 'a' }, { new_string: '' }, { old_string: 'x' }, { new_string: 'b' }] }), ['a', 'b']);
  assert.deepEqual(writtenTexts('Edit', null), []);
  assert.deepEqual(writtenTexts('Bash', { command: 'ls' }), []);
});

test('an edit that wrote a stale call is reported with its real line, and exits 2', async () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  const r = await post(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const legacy = z.string().email();' }));
  assert.equal(r.code, 2);
  assert.match(r.out, /1 stale or deprecated API use in the code you just wrote to src[\\/]a\.ts\. The edit was applied/);
  assert.match(r.out, /src[\\/]a\.ts:3  T1  Use z\.email\(\)\./, 'line 3 of the file, not line 1 of the snippet');
  assert.match(r.out, /\.myelin\/ignore/);
});

test('only the text just written is judged, not the old code around it', async () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  // the file holds a stale .email() on line 3, but this edit only added line 6
  const r = await post(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const added = z.string().min(1);' }));
  assert.deepEqual(r, { code: 0, out: '' });
});

test('a Write is judged whole, and MultiEdit edit by edit', async () => {
  const root = project();
  const text = ["import { z } from 'zod';", 'export const a = 1;', 'export const e = z.nativeEnum(E);', ''].join('\n');
  const file = write(root, 'src/a.ts', FILE);
  assert.equal((await post(payload(root, 'Write', { file_path: file, content: FILE }))).code, 2);
  write(root, 'src/m.ts', text);
  const m = await post(payload(root, 'MultiEdit', { file_path: join(root, 'src/m.ts'), edits: [{ old_string: 'a', new_string: 'export const a = 1;' }, { old_string: 'b', new_string: 'export const e = z.nativeEnum(E);' }] }));
  assert.equal(m.code, 2);
  assert.match(m.out, /src[\\/]m\.ts:3  T2/, 'the second edit is found on line 3 of the file');
  assert.doesNotMatch(m.out, /T1/);
});

test('requirements are never judged from a fragment', async () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  const r = await post(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const added = z.string().min(1);' }));
  assert.equal(r.code, 0, 'R1 would fail on any fragment');
});

test('rules guarded by an import still see the import when only a fragment was written', async () => {
  const root = project();
  const file = write(root, 'src/b.ts', "import { z } from 'zod';\n\nconst s = z.string().email();\n");
  assert.equal((await post(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'const s = z.string().email();' }))).code, 2);
  const nozod = write(root, 'src/c.ts', 'const s = form.email();\n');
  assert.equal((await post(payload(root, 'Edit', { file_path: nozod, old_string: 'x', new_string: 'const s = form.email();' }))).code, 0);
});

test('a hook never gets in the way: every unsupported situation is a silent exit 0', async () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  const stale = { file_path: file, old_string: 'x', new_string: 'z.string().email();' };
  assert.equal((await post(payload(root, 'Bash', { command: 'ls' }))).code, 0, 'not an editing tool');
  assert.equal((await post(payload(root, 'Edit', { ...stale, file_path: write(root, 'notes.txt', 'z.string().email()') }))).code, 0, 'not a source file');
  assert.equal((await post(payload(root, 'Edit', { ...stale, file_path: write(root, 'node_modules/x/index.js', "import 'zod'; z.string().email()") }))).code, 0, 'inside node_modules');
  assert.equal((await post(payload(root, 'Edit', { ...stale, file_path: join(root, 'src/missing.ts') }))).code, 0, 'file is gone');
  assert.equal((await post(payload(root, 'Edit', { file_path: file }))).code, 0, 'no new text');
  assert.equal((await post(payload(root, 'Edit', {}))).code, 0);
  assert.equal((await post(null)).code, 0);
  assert.equal((await post('garbage')).code, 0);
  process.env.MYELIN_HOOK = 'off';
  try {
    assert.equal((await post(payload(root, 'Edit', stale))).code, 0, 'MYELIN_HOOK=off');
  } finally {
    delete process.env.MYELIN_HOOK;
  }
  const bare = mkdtempSync(join(tmpdir(), 'myelin-bare-'));
  tmps.push(bare);
  const f = write(bare, 'a.ts', "import { z } from 'zod';\nz.string().email();");
  assert.equal((await post(payload(bare, 'Edit', { file_path: f, old_string: 'x', new_string: 'z.string().email();' }))).code, 0, 'no ledgers and nothing to detect');
  write(root, '.myelin/broken.myelin', 'this is not a ledger');
  assert.equal((await post(payload(root, 'Edit', stale))).code, 2, 'a broken ledger is skipped, the valid one still works');
});

test('a project can switch a rule off with .myelin/ignore', async () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  const edit = payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const legacy = z.string().email();' });
  assert.equal((await post(edit)).code, 2);
  write(root, '.myelin/ignore', '# we know about this one\nT1   # because reasons\n');
  assert.equal((await post(edit)).code, 0);
});

test('two ledgers flagging the same line report it once, the curated one first', async () => {
  const root = project();
  write(root, '.myelin/derived.myelin', DERIVED);
  const file = write(root, 'src/a.ts', FILE);
  const r = await post(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const legacy = z.string().email();' }));
  assert.equal(r.code, 2);
  assert.match(r.out, /T1/);
  assert.doesNotMatch(r.out, /zod-ZodString-email/, 'the derived finding on the same line is dropped');
  const led = projectLedgers(root);
  assert.deepEqual(led.map((l) => l.name.replace(/\\/g, '/')), ['.myelin/zod.myelin', '.myelin/derived.myelin']);
});

test('a long list of findings is cut with a count', () => {
  const v = Array.from({ length: 15 }, (_, i) => ({ id: `R${i}`, line: i + 1, message: 'm', ledger: 'l' }));
  const out = report({ name: 'a.ts', violations: v });
  assert.match(out, /15 stale or deprecated API uses/);
  assert.match(out, /\.\.\. and 3 more/);
});

test('projectRoot finds the nearest .myelin/, but only inside the session\'s own project', () => {
  const root = project();
  mkdirSync(join(root, 'packages/web/src'), { recursive: true });
  assert.equal(projectRoot(join(root, 'packages/web/src'), root), root);
  mkdirSync(join(root, 'packages/web/.myelin'), { recursive: true });
  assert.equal(projectRoot(join(root, 'packages/web/src'), root), join(root, 'packages/web'), 'a package below the working directory');
  assert.equal(projectRoot(join(root, 'packages/web/src'), join(root, 'packages/web/src')), join(root, 'packages/web'), 'a session started in a subfolder');
  const elsewhere = mkdtempSync(join(tmpdir(), 'myelin-elsewhere-'));
  tmps.push(elsewhere);
  assert.equal(projectRoot(join(root, 'packages/web/src'), elsewhere), elsewhere, 'another project\'s ledger is never loaded');
});

test('an edit outside the session\'s project is not checked, even if that other project has ledgers', async () => {
  const mine = project();
  const theirs = project();
  const file = write(theirs, 'src/a.ts', FILE);
  const r = await post(payload(mine, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const legacy = z.string().email();' }));
  assert.deepEqual(r, { code: 0, out: '' });
});

test('the session brief names only rules for packages the project imports, within a budget', () => {
  const root = project();
  write(root, '.myelin/derived.myelin', HEAD.replace('id      t', 'id      derived') + '\n' + [
    String.raw`! zod-A /\.a\(/ when /from\s+['"]zod['"]/ ` + '`A.a()` is deprecated in zod@4. Use `b` instead.',
    String.raw`! zod-B /\.b\(/ when /from\s+['"]zod['"]/ ` + '`B.b()` is deprecated in zod@4.',
    String.raw`! vue-C /\.c\(/ when /from\s+['"]vue['"]/ ` + '`C.c()` is deprecated in vue@3. Use `d` instead.',
    '',
  ].join('\n'));
  write(root, 'src/a.ts', "import { z } from 'zod';\n");
  const brief = sessionBrief(root);
  assert.match(brief, /^Myelin is active in this project/);
  assert.match(brief, /A\.a\(\)/);
  assert.doesNotMatch(brief, /C\.c\(\)/, 'vue is not used here');
  assert.ok(brief.indexOf('A.a()') < brief.indexOf('B.b()'), 'a rule that says what to use comes first');
  const tiny = sessionBrief(root, { budget: 60 });
  assert.match(tiny, /more rule\(s\) not shown; they are still enforced/);
  assert.equal(sessionBrief(mkdtempSync(join(tmpdir(), 'myelin-none-'))), '');
});

test('mergeSettings adds the hooks once, keeps everything else, and removes only its own', () => {
  const base = { permissions: { allow: ['Bash(ls)'] }, hooks: { PostToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo other' }] }] } };
  const added = mergeSettings(base);
  assert.equal(added.hooks.PostToolUse.length, 2);
  assert.equal(added.hooks.SessionStart.length, 1);
  assert.deepEqual(added.permissions, base.permissions);
  assert.match(added.hooks.PostToolUse[1].hooks[0].command, /command -v myelin .*exec myelin hook post/);
  assert.equal(added.hooks.PostToolUse[1].matcher, 'Edit|MultiEdit|Write');
  assert.deepEqual(mergeSettings(added), added, 'idempotent');
  const gone = mergeSettings(added, { remove: true });
  assert.deepEqual(gone, base);
  assert.deepEqual(mergeSettings({}, { remove: true }), {}, 'nothing left behind');
  assert.deepEqual(mergeSettings(mergeSettings({}), { remove: true }), {});
});

test('hook install writes .claude/settings.json, supports --local and --dry-run, and refuses bad JSON', () => {
  const root = mkdtempSync(join(tmpdir(), 'myelin-install-'));
  tmps.push(root);
  const run = (...a) => spawnSync(process.execPath, [CLI, 'hook', ...a, `--dir=${root}`], { encoding: 'utf8' });
  const dry = run('install', '--dry-run');
  assert.equal(dry.status, 0);
  assert.ok(!existsSync(join(root, '.claude')), 'dry run writes nothing');
  assert.match(dry.stdout, /PostToolUse/);
  const a = run('install');
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /added the Myelin hooks to \.claude[\\/]settings\.json/);
  assert.equal(hooksInstalled(root), 'settings.json');
  assert.match(run('install').stdout, /already in/);
  assert.equal(run('install', '--local').status, 0);
  assert.ok(existsSync(join(root, '.claude', 'settings.local.json')));
  assert.match(run('uninstall').stdout, /removed the Myelin hooks/);
  assert.equal(hooksInstalled(root), 'settings.local.json');
  write(root, '.claude/settings.json', '{ not json');
  const bad = run('install');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /not valid JSON/);
  assert.equal(spawnSync(process.execPath, [CLI, 'hook', 'bogus'], { encoding: 'utf8' }).status, 2);
});

test('end to end: the CLI reads a hook payload on stdin and answers with exit 2 and a message on stderr', () => {
  const root = project();
  const file = write(root, 'src/a.ts', FILE);
  const input = JSON.stringify(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'export const legacy = z.string().email();' }));
  const r = spawnSync(process.execPath, [CLI, 'hook', 'post'], { input, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /src[\\/]a\.ts:3  T1  Use z\.email\(\)\./);
  const clean = spawnSync(process.execPath, [CLI, 'hook', 'post'], { input: JSON.stringify(payload(root, 'Edit', { file_path: file, old_string: 'x', new_string: 'const ok = 1;' })), encoding: 'utf8' });
  assert.deepEqual([clean.status, clean.stdout, clean.stderr], [0, '', '']);
  const junk = spawnSync(process.execPath, [CLI, 'hook', 'post'], { input: '{{{', encoding: 'utf8' });
  assert.deepEqual([junk.status, junk.stdout, junk.stderr], [0, '', '']);
  const s = spawnSync(process.execPath, [CLI, 'hook', 'session'], { input: JSON.stringify({ cwd: root }), encoding: 'utf8' });
  assert.equal(s.status, 0);
  assert.match(s.stdout, /Myelin is active in this project/);
  assert.match(s.stdout, /Use z\.email\(\)\./);
});
