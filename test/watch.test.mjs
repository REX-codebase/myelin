import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watchTargets } from '../src/watch.mjs';

const BIN = fileURLToPath(new URL('../bin/myelin.mjs', import.meta.url));
const HUT = fileURLToPath(new URL('../examples/three-webgpu-hut/hut.myelin', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'myelin-watch-'));

test('watchTargets lists directories and files, skipping node_modules and .git', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'src', 'deep'), { recursive: true });
  mkdirSync(join(dir, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(dir, '.git'));
  writeFileSync(join(dir, 'src', 'deep', 'a.js'), '');
  writeFileSync(join(dir, 'node_modules', 'pkg', 'x.js'), '');
  const got = watchTargets([dir, join(dir, 'missing')]);
  assert.ok(got.includes(join(dir, 'src', 'deep')));
  assert.ok(got.includes(join(dir, 'src', 'deep', 'a.js')));
  assert.ok(!got.some((p) => p.includes('node_modules')));
  assert.ok(!got.some((p) => p.includes('.git')));
  assert.ok(!got.some((p) => p.includes('missing')));
});

test('lint --watch re-runs on a change and exits 0 on SIGINT', async () => {
  const dir = tmp();
  const f = join(dir, 'a.js');
  writeFileSync(f, 'export {};\n');
  const child = spawn(process.execPath, [BIN, 'lint', HUT, dir, '--ext=js', '--watch'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  const until = (re, ms = 10000) =>
    new Promise((resolve, reject) => {
      const t0 = Date.now();
      const tick = () => {
        if (re.test(out)) return resolve();
        if (Date.now() - t0 > ms) return reject(new Error(`timed out waiting for ${re}; got:\n${out}`));
        setTimeout(tick, 50);
      };
      tick();
    });
  try {
    await until(/bans, .* unit\(s\) checked: /);
    assert.equal((out.match(/\] lint/g) || []).length, 1);
    writeFileSync(f, 'Math.random()\n');
    await until(/\] lint[\s\S]*\] lint[\s\S]*checked: /);
    assert.equal((out.match(/\] lint/g) || []).length, 2, 'the edit triggered one re-run');
    assert.match(out, /watching /);
  } finally {
    const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
    child.kill('SIGINT');
    const code = await exited;
    assert.equal(code, 0);
  }
});
