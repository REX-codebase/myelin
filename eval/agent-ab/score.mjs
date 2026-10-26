// Scores every run of the agent A/B: lints the first draft and the final page against the
// three ledger, renders the final page, and keeps three.js's own console output as ground truth.
// usage: node score.mjs <runs-dir> <three-package-dir>
// <runs-dir>/<task>/<arm>-<n>/{draft.html,index.html}; writes <runs-dir>/results.json and
// screenshots to <runs-dir>/<task>/shots-final/.
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const [runsDir, threeDir] = process.argv.slice(2).map((p) => p && resolve(p));
if (!runsDir || !threeDir) {
  console.error('usage: node score.mjs <runs-dir> <three-package-dir>');
  process.exit(2);
}
const HERE = new URL('.', import.meta.url).pathname;
const BIN = join(HERE, '../../bin/myelin.mjs');
const RUN = /^(control|skill|myelin)-\d+$/;

function lint(file) {
  if (!existsSync(file)) return null;
  const r = spawnSync(process.execPath, [BIN, 'lint', 'three', file, '--json'], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  return { ok: j.ok, rules: [...new Set(j.violations.map((v) => v.id))].sort() };
}

// three.js prints "THREE.<Thing>: ..." for deprecations and removals; those are the warnings
// a ledger should have predicted. Errors and exceptions are kept separately.
const threeWarning = (l) => /^\[warning\] THREE\./.test(l);
const failure = (l) => /^\[(error|exception)\]/.test(l);

const results = {};
for (const task of readdirSync(runsDir).filter((t) => existsSync(join(runsDir, t)) && !t.startsWith('.') && !t.includes('.'))) {
  const runs = readdirSync(join(runsDir, task)).filter((r) => RUN.test(r)).sort();
  const pages = runs.map((r) => join(runsDir, task, r, 'index.html')).filter(existsSync);
  const shotDir = join(runsDir, task, 'shots-final');
  const r = spawnSync(process.execPath, [join(HERE, 'render.mjs'), threeDir, shotDir, ...pages], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (r.status !== 0) throw new Error(`render failed for ${task}: ${r.stderr}`);
  const rendered = JSON.parse(readFileSync(join(shotDir, 'render.json'), 'utf8'));
  for (const run of runs) {
    const dir = join(runsDir, task, run);
    const logs = rendered[run]?.logs || [];
    const firstLint = existsSync(join(dir, 'lint-first.txt')) ? readFileSync(join(dir, 'lint-first.txt'), 'utf8').trim() : null;
    results[`${task}/${run}`] = {
      task,
      arm: run.replace(/-\d+$/, ''),
      draft: lint(join(dir, 'draft.html')),
      final: lint(join(dir, 'index.html')),
      agentFirstLint: firstLint,
      threeWarnings: logs.filter(threeWarning),
      errors: logs.filter(failure),
      webgpu: rendered[run]?.webgpu ?? null,
    };
  }
}
writeFileSync(join(runsDir, 'results.json'), JSON.stringify(results, null, 1));

const row = (k, v) => `${k.padEnd(22)} draft ${v.draft ? (v.draft.ok ? 'clean' : v.draft.rules.join(',')) : 'missing'}`.padEnd(50) +
  ` final ${v.final ? (v.final.ok ? 'clean' : v.final.rules.join(',')) : 'missing'}`.padEnd(30) +
  ` warn ${v.threeWarnings.length}  err ${v.errors.length}`;
for (const [k, v] of Object.entries(results)) console.log(row(k, v));
