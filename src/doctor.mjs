// `myelin doctor`: a health check for this install and the project in --dir. It reads local
// files only. It never looks for a newer version, so it never touches the network.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as ui from './ui.mjs';
import { listLibs } from './libs.mjs';
import { parse } from './parse.mjs';
import { pkgVersion, projectDir } from './util.mjs';
import { blockState } from './setup.mjs';

const MARK = { ok: ui.green, warn: ui.yellow, fail: ui.red };
const cell = (s) => `${MARK[s](ui.glyph(s))} ${s}`;

// status: 'ok' | 'warn' | 'fail'. Only 'fail' is a hard failure and sets the exit code.
export function checks(dir) {
  const out = [];
  const add = (name, status, detail) => out.push({ name, status, detail });

  const node = process.versions.node;
  const major = Number(node.split('.')[0]);
  add('node', major >= 18 ? 'ok' : 'fail', major >= 18 ? `v${node}` : `v${node} (myelin needs 18 or newer)`);
  add('myelin', 'ok', pkgVersion());
  add('location', 'ok', resolve(process.argv[1] || 'unknown'));

  const libs = listLibs();
  const broken = libs.filter((l) => !l.ok).map((l) => l.id);
  add(
    'bundled ledgers',
    libs.length && !broken.length ? 'ok' : 'fail',
    !libs.length ? 'none found' : broken.length ? `invalid: ${broken.join(', ')}` : `${libs.length} parse and validate`,
  );

  const mdir = join(dir, '.myelin');
  const files = existsSync(mdir)
    ? readdirSync(mdir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith('.myelin'))
        .map((d) => d.name)
        .sort()
    : [];
  if (!files.length) {
    add('.myelin', 'warn', `no ledgers in ${dir} (run myelin setup)`);
  } else {
    const bad = files.filter((f) => !parse(readFileSync(join(mdir, f), 'utf8')).ok);
    const names = files.map((f) => f.replace(/\.myelin$/, '')).join(', ');
    add('.myelin', bad.length ? 'fail' : 'ok', bad.length ? `invalid: ${bad.join(', ')}` : `${files.length} ledger(s): ${names}`);
  }

  const agents = ['AGENTS.md', 'CLAUDE.md'].filter((n) => existsSync(join(dir, n)));
  const states = agents.map((n) => [n, blockState(readFileSync(join(dir, n), 'utf8'))]);
  const good = states.filter(([, s]) => s === 'ok').map(([n]) => n);
  if (good.length) add('agent file', 'ok', `${good.join(', ')} has the myelin block`);
  else if (states.some(([, s]) => s === 'broken')) add('agent file', 'warn', 'myelin markers are unbalanced; fix by hand, then run myelin setup');
  else add('agent file', 'warn', 'no AGENTS.md or CLAUDE.md with a myelin block (run myelin setup)');

  return out;
}

export function doctor(flags) {
  const dir = projectDir(flags);
  const list = checks(dir);
  const fails = list.filter((c) => c.status === 'fail').length;
  const warns = list.filter((c) => c.status === 'warn').length;

  if (flags.json) {
    console.log(JSON.stringify({ ok: fails === 0, dir, checks: list }, null, 2));
    return fails ? 1 : 0;
  }

  console.log(ui.banner());
  console.log('');
  ui.step(`Checking ${dir}`);
  console.log(ui.table(list.map((c) => [cell(c.status), c.name, c.detail]), { head: ['status', 'check', 'detail'] }));
  console.log('');
  if (fails) ui.fail(`${fails} check(s) failed${warns ? `, ${warns} warning(s)` : ''}`);
  else if (warns) ui.warn(`${warns} warning(s); nothing is broken`);
  else ui.ok('All checks passed');
  return fails ? 1 : 0;
}
