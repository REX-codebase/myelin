#!/usr/bin/env node
// "In the wild" benchmark: run a bundled ledger over official example code from an OLD release
// and from the CURRENT release. A good ledger fires on most old files and almost none of the new ones.
// Usage: node eval/wild/run.mjs [dir] [--json]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { parse } from '../../src/parse.mjs';
import { check } from '../../src/check.mjs';
import { libPath } from '../../src/libs.mjs';

const args = process.argv.slice(2);
const DIR = args.find((a) => !a.startsWith('--')) || '.wild';
const JSON_OUT = args.includes('--json');

const SUITES = [
  { lib: 'three', label: 'three.js r150 examples (2023)', dir: 'three-r150/examples', exts: ['html'], kind: 'old' },
  { lib: 'three', label: 'three.js r186 WebGPU examples', dir: 'three-r186/examples', exts: ['html'], match: /\/webgpu_[^/]*$/, kind: 'new' },
  { lib: 'nextjs', label: 'Next.js 14.2 App Router examples', dir: 'next-14/examples', exts: ['js', 'jsx', 'ts', 'tsx'], match: /\/app\//, kind: 'old' },
  { lib: 'nextjs', label: 'Next.js 16.4.3 App Router examples', dir: 'next-16/examples', exts: ['js', 'jsx', 'ts', 'tsx'], match: /\/app\//, kind: 'new' },
];

function walk(d, exts, match, out = []) {
  for (const n of readdirSync(d).sort()) {
    if (n === 'node_modules' || n === '.git') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, exts, match, out);
    else if (exts.includes(extname(p).slice(1)) && (!match || match.test(p))) out.push(p);
  }
  return out;
}

const results = [];
for (const s of SUITES) {
  const root = join(DIR, s.dir);
  if (!existsSync(root)) {
    console.error(`missing ${root}: run sh eval/wild/fetch.sh ${DIR}`);
    process.exit(2);
  }
  const ledger = parse(readFileSync(libPath(s.lib), 'utf8'));
  const files = walk(root, s.exts, s.match);
  const perRule = {};
  const flaggedFiles = [];
  for (const f of files) {
    const ids = [...new Set(check(ledger, [{ name: f, text: readFileSync(f, 'utf8') }]).violations.filter((v) => v.kind === 'ban').map((v) => v.id))];
    if (ids.length) flaggedFiles.push({ file: relative(DIR, f), ids });
    for (const id of ids) perRule[id] = (perRule[id] || 0) + 1;
  }
  results.push({ ...s, match: undefined, files: files.length, flagged: flaggedFiles.length, rate: files.length ? flaggedFiles.length / files.length : 0, perRule, flaggedFiles: s.kind === 'new' ? flaggedFiles : flaggedFiles.length });
}

if (JSON_OUT) console.log(JSON.stringify(results, null, 2));
else {
  for (const r of results) {
    const top = Object.entries(r.perRule).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`${r.kind.padEnd(3)}  ${r.label.padEnd(38)} ${String(r.flagged).padStart(4)}/${String(r.files).padEnd(4)} flagged (${(r.rate * 100).toFixed(1)}%)  ${top}`);
    if (r.kind === 'new') for (const f of r.flaggedFiles) console.log(`       ${f.file}  [${f.ids.join(',')}]`);
  }
}
