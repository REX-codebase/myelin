#!/usr/bin/env node
// Score saved model outputs against a ledger. This script never calls a model.
//
//   node eval/run-eval.mjs <ledger> <outputs-dir> [--csv=results.csv]
//
// Layout of <outputs-dir>:   <model>/<condition>/<run>   where <run> is a file or a directory of files.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, check } from '../src/index.mjs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  }),
);
const [ledgerPath, dir] = args.filter((a) => !a.startsWith('--'));

if (!ledgerPath || !dir || !existsSync(ledgerPath) || !existsSync(dir)) {
  console.error('usage: node eval/run-eval.mjs <ledger> <outputs-dir> [--csv=results.csv]');
  process.exit(2);
}

const ledger = parse(readFileSync(ledgerPath, 'utf8'));
if (!ledger.ok) {
  console.error(`${ledgerPath} is not a valid ledger`);
  process.exit(1);
}

const subdirs = (p) => readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()).sort();

function filesIn(p) {
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p).sort().flatMap((n) => filesIn(join(p, n)));
}

const rows = [];
for (const model of subdirs(dir)) {
  for (const condition of subdirs(join(dir, model))) {
    const base = join(dir, model, condition);
    for (const run of readdirSync(base).sort()) {
      const units = filesIn(join(base, run)).map((f) => ({ name: f, text: readFileSync(f, 'utf8') }));
      const result = check(ledger, units);
      rows.push({
        model,
        condition,
        run,
        violations: result.violations.length,
        passed: result.ok,
        rules: [...new Set(result.violations.map((v) => v.id))].join(' '),
      });
    }
  }
}

if (!rows.length) {
  console.error('no runs found; expected <outputs-dir>/<model>/<condition>/<run>');
  process.exit(1);
}

const groups = new Map();
for (const r of rows) {
  const k = `${r.model}\u0000${r.condition}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const header = ['model', 'condition', 'runs', 'passes', 'pass%', 'mean violations'];
const table = [header];
for (const [k, rs] of groups) {
  const [model, condition] = k.split('\u0000');
  const passes = rs.filter((r) => r.passed).length;
  const mean = rs.reduce((a, r) => a + r.violations, 0) / rs.length;
  table.push([model, condition, String(rs.length), String(passes), `${Math.round((100 * passes) / rs.length)}%`, mean.toFixed(2)]);
}
const widths = header.map((_, i) => Math.max(...table.map((r) => r[i].length)));
for (const r of table) console.log(r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd());

if (flags.csv && typeof flags.csv === 'string') {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = ['model,condition,run,violations,passed,rules'];
  for (const r of rows) lines.push([r.model, r.condition, r.run, r.violations, r.passed, r.rules].map(esc).join(','));
  writeFileSync(flags.csv, lines.join('\n') + '\n');
  console.log(`wrote ${flags.csv}`);
}
