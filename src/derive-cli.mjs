// `myelin derive`: the command around derive.mjs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import * as ui from './ui.mjs';
import { derive, derivedPath, fingerprint, rootsOf } from './derive.mjs';
import { CliError, projectDir } from './util.mjs';

/**
 * Is the derived ledger in `dir` still the one for what is installed?
 * Reads package.json files only; it never scans declarations.
 *   missing   no .myelin/derived.myelin
 *   current   same installed versions as when it was written
 *   stale     something was installed, upgraded or removed since
 */
export function derivedState(dir) {
  const file = derivedPath(dir);
  if (!existsSync(file)) return { state: 'missing', file };
  const m = readFileSync(file, 'utf8').match(/^= fingerprint\s+(\w+)\s*$/m);
  const { roots } = rootsOf(dir);
  if (!roots.length) return { state: 'current', file, note: 'no dependencies are installed to compare with' };
  return { state: m && m[1] === fingerprint(roots) ? 'current' : 'stale', file };
}

const listFlag = (v, name) => {
  if (v === undefined) return null;
  if (v === true) throw new CliError(`--${name} needs a value, e.g. --${name}=zod,react`);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
};

export function deriveCommand(flags, log = (s) => console.log(s)) {
  const dir = projectDir(flags);
  if (flags.out === true) throw new CliError('--out needs a path, e.g. --out=.myelin/derived.myelin');
  const only = listFlag(flags.only, 'only');

  if (flags.check) {
    const r = derivedState(dir);
    if (flags.json) log(JSON.stringify({ ok: r.state === 'current', state: r.state, file: relative(dir, r.file) || r.file }, null, 2));
    else if (r.state === 'current') ui.ok(`${relative(dir, r.file)} matches what is installed`);
    else if (r.state === 'missing') ui.fail(`no ${relative(dir, r.file)}; run: myelin derive`);
    else ui.fail(`${relative(dir, r.file)} is out of date with node_modules; run: myelin derive`);
    return r.state === 'current' ? 0 : 1;
  }

  const res = derive(dir, { only });
  if (res.error) throw new CliError(`derive: ${res.error}`, 1);
  const { stats } = res;

  if (flags.explain) {
    const q = flags.explain === true ? '' : String(flags.explain).toLowerCase();
    const rows = stats.skips.filter((s) => s.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    if (flags.json) log(JSON.stringify(rows, null, 2));
    else {
      for (const s of rows) log(`${s.name.padEnd(44)} ${s.reason.padEnd(10)} ${s.detail}`);
      log(`${rows.length} deprecated API(s) left out${q ? ` matching "${q}"` : ''}. A rule that would fire on live code is worse than a missing one.`);
    }
    return 0;
  }

  if (flags.stdout) {
    process.stdout.write(res.text);
    return 0;
  }

  const out = flags.out ? resolve(String(flags.out)) : derivedPath(dir);
  mkdirSync(dirname(out), { recursive: true });
  const before = existsSync(out) ? readFileSync(out, 'utf8') : null;
  if (before !== res.text) writeFileSync(out, res.text);
  const rel = relative(dir, out);
  const shown = rel && !rel.startsWith('..') ? rel : out;

  const packages = [...stats.packages].map(([name, p]) => ({ name, version: p.version, rules: p.rules })).sort((a, b) => b.rules - a.rules || a.name.localeCompare(b.name));
  if (flags.json) {
    log(JSON.stringify({ file: shown, rules: stats.rules, deprecated: stats.decls, merged: stats.merged, skipped: stats.skipped, packages, notes: res.notes }, null, 2));
    return 0;
  }

  log(ui.banner());
  log('');
  ui.step(`Read the type declarations of ${new Set(res.roots.map((r) => r.name)).size} installed package(s) in ${dir}`);
  if (packages.length) {
    log(ui.table(packages.map((p) => [p.name, p.version || '?', String(p.rules)]), { head: ['package', 'version', 'rules'], align: ['l', 'l', 'r'] }));
  }
  log('');
  const left = Object.values(stats.skipped).reduce((a, b) => a + b, 0);
  ui.ok(`${stats.rules} rule(s) ${before === res.text ? 'already up to date in' : 'written to'} ${shown}`);
  ui.note(`${stats.decls} deprecated API(s) found: ${stats.decls - left} turned into rules (similar ones merged), ${left} left out as too ambiguous to match safely`);
  ui.note('see what was left out and why: myelin derive --explain');
  if (res.notes.truncated.length) ui.warn(`stopped early on ${res.notes.truncated.join(', ')} (very large type graph); its rules may be incomplete`);
  if (!stats.rules) ui.note('the installed packages carry no usable @deprecated tags, so there is nothing to check yet');
  log('');
  ui.note('check code:   myelin lint derived src/');
  ui.note('guard agents: myelin hook install');
  return 0;
}
