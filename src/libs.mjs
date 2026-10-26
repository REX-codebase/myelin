// Bundled library ledgers ("libs") and the benchmark runner.
//
// A lib lives in libs/<id>/ with:
//   <id>.myelin            the ledger
//   SOURCES.md             official sources for every rule
//   bench/bad/*, good/*    labelled corpus
//   bench/expected.json    { "bad/x.js": ["B1"], "good/y.js": [] }
// libs/index.json maps each id to a display name and the npm packages that trigger it.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './parse.mjs';
import { check } from './check.mjs';

export const LIBS_DIR = fileURLToPath(new URL('../libs', import.meta.url));

function readIndex() {
  const p = join(LIBS_DIR, 'index.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/** Path of a bundled ledger by id, or null. */
export function libPath(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  const p = join(LIBS_DIR, id, `${id}.myelin`);
  return existsSync(p) ? p : null;
}

/** Every bundled lib with its parsed header and facts. */
export function listLibs() {
  if (!existsSync(LIBS_DIR)) return [];
  const index = readIndex();
  const out = [];
  for (const id of readdirSync(LIBS_DIR).sort()) {
    const p = libPath(id);
    if (!p) continue;
    const ledger = parse(readFileSync(p, 'utf8'));
    const facts = Object.fromEntries((ledger.facts || []).map((f) => [f.key, f.value]));
    out.push({
      id,
      name: index[id]?.name || id,
      packages: index[id]?.packages || [],
      version: ((facts.version || '').match(/\br?\d+(?:\.\d+)*/) || [facts.version || ''])[0],
      verified: facts.verified || '',
      about: ledger.header.about || '',
      bans: ledger.rules.filter((r) => r.kind === 'ban').length,
      requires: ledger.rules.filter((r) => r.kind === 'require').length,
      snippets: Object.keys(ledger.snippets).length,
      path: p,
      ok: ledger.ok,
    });
  }
  return out;
}

/** Libs whose npm packages appear in a project's package.json. */
export function detectLibs(projectDir) {
  const pkgPath = join(projectDir, 'package.json');
  if (!existsSync(pkgPath)) return { found: [], deps: [] };
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  const found = [];
  for (const lib of listLibs()) {
    const hits = lib.packages.filter((name) =>
      name.endsWith('*') ? deps.some((d) => d.startsWith(name.slice(0, -1))) : deps.includes(name),
    );
    if (hits.length) found.push({ ...lib, matched: hits });
  }
  return { found, deps };
}

/** Bans only: libraries apply to many kinds of tasks, so the benchmark scores bans per file. */
function firedBans(ledger, name, text) {
  const r = check(ledger, [{ name, text }]);
  return [...new Set(r.violations.filter((v) => v.kind === 'ban').map((v) => v.id))].sort();
}

/** Score one lib's labelled corpus. */
export function benchLib(id) {
  const p = libPath(id);
  if (!p) throw new Error(`no bundled lib named ${id}`);
  const ledger = parse(readFileSync(p, 'utf8'));
  if (!ledger.ok) throw new Error(`${p} is not a valid ledger`);
  const benchDir = join(LIBS_DIR, id, 'bench');
  const expPath = join(benchDir, 'expected.json');
  if (!existsSync(expPath)) throw new Error(`${id} has no bench/expected.json`);
  const expected = JSON.parse(readFileSync(expPath, 'utf8'));

  const s = { id, tp: 0, fp: 0, fn: 0, badFiles: 0, badCaught: 0, goodFiles: 0, goodClean: 0, files: [] };
  for (const [rel, want] of Object.entries(expected)) {
    const f = join(benchDir, rel);
    if (!existsSync(f) || !statSync(f).isFile()) throw new Error(`${id}: expected.json names missing file ${rel}`);
    const got = firedBans(ledger, rel, readFileSync(f, 'utf8'));
    const W = new Set(want);
    const G = new Set(got);
    const tp = got.filter((x) => W.has(x)).length;
    const fp = got.filter((x) => !W.has(x)).length;
    const fn = want.filter((x) => !G.has(x)).length;
    s.tp += tp;
    s.fp += fp;
    s.fn += fn;
    const isBad = rel.startsWith('bad/');
    if (isBad) {
      s.badFiles++;
      if (got.length) s.badCaught++;
    } else {
      s.goodFiles++;
      if (!got.length) s.goodClean++;
    }
    s.files.push({ file: rel, expected: [...want].sort(), fired: got, exact: fp === 0 && fn === 0 });
  }
  const div = (a, b) => (b ? a / b : 1);
  s.recall = div(s.tp, s.tp + s.fn);
  s.precision = div(s.tp, s.tp + s.fp);
  s.catchRate = div(s.badCaught, s.badFiles);
  s.cleanRate = div(s.goodClean, s.goodFiles);
  s.bans = ledger.rules.filter((r) => r.kind === 'ban').length;
  return s;
}

export function benchAll(ids) {
  const libs = ids && ids.length ? ids : listLibs().map((l) => l.id);
  return libs.map(benchLib);
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;

export function benchTable(results, { markdown = false } = {}) {
  const head = ['lib', 'bans', 'bad files', 'caught', 'good files', 'clean', 'rule recall', 'precision'];
  const rows = results.map((r) => [
    r.id,
    String(r.bans),
    String(r.badFiles),
    pct(r.catchRate),
    String(r.goodFiles),
    pct(r.cleanRate),
    pct(r.recall),
    pct(r.precision),
  ]);
  const tot = results.reduce(
    (a, r) => ({
      bans: a.bans + r.bans, bad: a.bad + r.badFiles, caught: a.caught + r.badCaught,
      good: a.good + r.goodFiles, clean: a.clean + r.goodClean, tp: a.tp + r.tp, fp: a.fp + r.fp, fn: a.fn + r.fn,
    }),
    { bans: 0, bad: 0, caught: 0, good: 0, clean: 0, tp: 0, fp: 0, fn: 0 },
  );
  const d = (a, b) => (b ? a / b : 1);
  rows.push([
    'TOTAL', String(tot.bans), String(tot.bad), pct(d(tot.caught, tot.bad)), String(tot.good),
    pct(d(tot.clean, tot.good)), pct(d(tot.tp, tot.tp + tot.fn)), pct(d(tot.tp, tot.tp + tot.fp)),
  ]);
  if (markdown) {
    const line = (r) => `| ${r.join(' | ')} |`;
    return [line(head), line(head.map(() => '---')), ...rows.map((r, i) => line(i === rows.length - 1 ? r.map((c) => `**${c}**`) : r))].join('\n');
  }
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const fmt = (r) => r.map((c, i) => (i === 0 ? c.padEnd(w[i]) : c.padStart(w[i]))).join('  ');
  return [fmt(head), fmt(w.map((n) => '-'.repeat(n))), ...rows.map(fmt)].join('\n');
}

/** Run every ledger over every OTHER lib's good files. Any ban that fires is a cross-library false positive. */
export function benchCross(ids) {
  const libs = ids && ids.length ? ids : listLibs().map((l) => l.id);
  const goods = [];
  for (const id of libs) {
    const exp = JSON.parse(readFileSync(join(LIBS_DIR, id, 'bench', 'expected.json'), 'utf8'));
    for (const rel of Object.keys(exp)) if (rel.startsWith('good/')) goods.push({ id, rel, text: readFileSync(join(LIBS_DIR, id, 'bench', rel), 'utf8') });
  }
  let checks = 0;
  const hits = [];
  for (const id of libs) {
    const ledger = parse(readFileSync(libPath(id), 'utf8'));
    for (const g of goods) {
      if (g.id === id) continue;
      checks++;
      for (const ban of firedBans(ledger, g.rel, g.text)) hits.push({ ledger: id, file: `${g.id}/${g.rel}`, ban });
    }
  }
  return { ledgers: libs.length, goodFiles: goods.length, checks, hits };
}
