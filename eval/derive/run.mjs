#!/usr/bin/env node
// Benchmark `myelin derive`: how much of what a hand-curated ledger knows does a ledger read from
// the installed type declarations recover, and does it stay quiet on current code?
//
//   sh eval/derive/fetch.sh           # once: installs eval/derive/package.json, clones inputs
//   node eval/derive/run.mjs [dir]    # dir defaults to .derive
//   node eval/derive/run.mjs --json   # machine-readable
//   node eval/derive/run.mjs --write  # also refresh eval/derive/results.json
//   node eval/derive/run.mjs --check  # exit 1 if any figure differs from the committed results.json
//
// Four measurements, each with the way it can mislead:
//   1 labelled corpus   stale files caught / current files flagged, against libs/*/bench
//   2 ceiling           the same corpus against EVERY deprecated name matched loosely. No deprecation-based
//                       approach can do better than this, so it bounds what derive could ever recover.
//   3 official examples old and current example code (eval/wild), derived vs curated ledgers
//   4 real code bases   five open-source repos pinned to a commit, SOURCE ONLY (their dependencies are never installed)
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from '../../src/parse.mjs';
import { check } from '../../src/check.mjs';
import { libPath } from '../../src/libs.mjs';
import { derive, rootsOf, importGate } from '../../src/derive.mjs';
import { surface } from '../../src/surface.mjs';

const args = process.argv.slice(2);
const DIR = args.find((a) => !a.startsWith('--')) || '.derive';
const JSON_OUT = args.includes('--json');
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const project = join(DIR, 'project');
for (const need of [project, join(DIR, 'apps'), join(DIR, 'wild')]) {
  if (!existsSync(need)) {
    console.error(`missing ${need}: run sh eval/derive/fetch.sh ${DIR}`);
    process.exit(2);
  }
}

const read = (f) => readFileSync(f, 'utf8');
const lineText = (text, n) => (text.split('\n')[n - 1] || '').trim().slice(0, 100);

// ---- the ledgers ---------------------------------------------------------------------------------

const t0 = performance.now();
const res = derive(project);
if (res.error) {
  console.error(`derive: ${res.error}`);
  process.exit(2);
}
const derived = parse(res.text);
const deriveMs = Math.round(performance.now() - t0);

// The ceiling: every deprecated name, matched as a bare identifier wherever the package is imported.
function looseLedger() {
  const { roots } = rootsOf(project);
  const s = surface(roots);
  const lines = ['myelin 1.1', 'id      ceiling', 'about   upper bound', 'fires   x', 'comments skip', 'status  experiment', ''];
  const seen = new Set();
  let n = 0;
  for (const [file, gates] of s.gates) {
    for (const d of s.scans.get(file).decls) {
      if (!/^[A-Za-z$][\w$]*$/.test(d.name) || d.name.length < 3) continue;
      const specs = d.module ? [d.module, 'node:' + d.module] : [...gates];
      const key = d.name + '\0' + specs.join();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`! L${n++} /(?<![\\w$])${d.name.replace(/\$/g, '\\$')}(?![\\w$])/ when /${importGate(specs)}/ ceiling`);
    }
  }
  return parse(lines.join('\n') + '\n');
}
const ceiling = looseLedger();

// ---- 1 + 2: the labelled corpus ------------------------------------------------------------------

// Only the libraries this benchmark installs (eval/derive/package.json). A ledger for a package that is not
// installed here (Firebase) or that is not on npm at all (Blender) would only add files derive cannot see.
const installed = Object.keys(JSON.parse(read(join(ROOT, 'eval', 'derive', 'package.json'))).dependencies);
const libIndex = JSON.parse(read(join(ROOT, 'libs', 'index.json')));
const isInstalled = (lib) => (libIndex[lib]?.packages || []).some((p) => installed.includes(p) || (p.endsWith('*') && installed.some((d) => d.startsWith(p.slice(0, -1)))));

function corpus(ledger) {
  const libs = [];
  let bad = 0, badHit = 0, good = 0, goodHit = 0;
  const goodHits = [];
  for (const lib of readdirSync(join(ROOT, 'libs')).sort()) {
    const exp = join(ROOT, 'libs', lib, 'bench', 'expected.json');
    if (!existsSync(exp) || !isInstalled(lib)) continue;
    const row = { lib, stale: 0, staleFlagged: 0, current: 0, currentFlagged: 0 };
    for (const rel of Object.keys(JSON.parse(read(exp)))) {
      const text = read(join(ROOT, 'libs', lib, 'bench', rel));
      const r = check(ledger, [{ name: rel, text }]);
      if (rel.startsWith('bad/')) {
        row.stale++;
        if (r.violations.length) row.staleFlagged++;
      } else {
        row.current++;
        if (r.violations.length) {
          row.currentFlagged++;
          for (const v of r.violations) goodHits.push({ file: `${lib}/${rel}`, line: v.line, rule: v.id, text: lineText(text, v.line) });
        }
      }
    }
    libs.push(row);
    bad += row.stale; badHit += row.staleFlagged; good += row.current; goodHit += row.currentFlagged;
  }
  return { libs, stale: bad, staleFlagged: badHit, current: good, currentFlagged: goodHit, currentHits: goodHits };
}
const labelled = corpus(derived);
const bound = corpus(ceiling);

// ---- 3: official examples, old and current -------------------------------------------------------

function walk(d, exts, match, out = []) {
  for (const n of readdirSync(d).sort()) {
    if (n === 'node_modules' || n === '.git') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, exts, match, out);
    else if (exts.includes(extname(p).slice(1)) && (!match || match.test(p))) out.push(p);
  }
  return out;
}
const hitsOf = (ledger, files, base) => {
  const flagged = new Set();
  const byRule = {};
  const lines = [];
  for (const f of files) {
    const text = read(f);
    const r = check(ledger, [{ name: f, text }]);
    if (r.violations.length) flagged.add(f);
    for (const v of r.violations) {
      byRule[v.id] = (byRule[v.id] || 0) + 1;
      lines.push({ file: relative(base, f), line: v.line, rule: v.id, text: lineText(text, v.line) });
    }
  }
  return { flagged, byRule, lines };
};
const curatedOf = (lib) => parse(read(libPath(lib)));

const SUITES = [
  { lib: 'three', label: 'three.js r150 examples (2023)', dir: 'three-r150/examples', exts: ['html'], kind: 'old' },
  { lib: 'three', label: 'three.js r186 WebGPU examples', dir: 'three-r186/examples', exts: ['html'], match: /\/webgpu_[^/]*$/, kind: 'current' },
  { lib: 'nextjs', label: 'Next.js 14.2 App Router examples', dir: 'next-14/examples', exts: ['js', 'jsx', 'ts', 'tsx'], match: /\/app\//, kind: 'old' },
  { lib: 'nextjs', label: 'Next.js 16.4.3 App Router examples', dir: 'next-16/examples', exts: ['js', 'jsx', 'ts', 'tsx'], match: /\/app\//, kind: 'current' },
];
const wild = SUITES.map((s) => {
  const root = join(DIR, 'wild', s.dir);
  const files = walk(root, s.exts, s.match);
  const d = hitsOf(derived, files, join(DIR, 'wild'));
  const c = hitsOf(curatedOf(s.lib), files, join(DIR, 'wild'));
  const both = [...d.flagged].filter((f) => c.flagged.has(f)).length;
  return {
    label: s.label, kind: s.kind, files: files.length,
    derivedFlagged: d.flagged.size, curatedFlagged: c.flagged.size, both, derivedOnly: d.flagged.size - both,
    derivedByRule: d.byRule, derivedHits: s.kind === 'current' ? d.lines : undefined,
  };
});

// ---- 4: real apps, source only -------------------------------------------------------------------

const APPS = ['taxonomy', 'ai-chatbot', 'shadcn-ui', 'tanstack-query', 'openai-node'];
const apps = APPS.map((name) => {
  const root = join(DIR, 'apps', name);
  const files = walk(root, ['ts', 'tsx', 'js', 'jsx'], null);
  const d = hitsOf(derived, files, root);
  return { app: name, commit: existsSync(join(root, '.git')) ? (spawnSync('git', ['-C', root, 'rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).stdout || '').trim() : '', files: files.length, filesFlagged: d.flagged.size, hits: d.lines, byRule: d.byRule };
});

// ---- report --------------------------------------------------------------------------------------

const out = {
  derive: { ms: deriveMs, rules: res.stats.rules, deprecatedApis: res.stats.decls, leftOut: Object.values(res.stats.skipped).reduce((a, b) => a + b, 0), packages: res.stats.packages.size, files: res.stats.files },
  labelled: { ...labelled, ceilingStaleFlagged: bound.staleFlagged, ceilingCurrentFlagged: bound.currentFlagged },
  wild, apps,
};

if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else {
  const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
  const d = out.derive;
  console.log(`derived ledger: ${d.rules} rules from ${d.deprecatedApis} deprecated APIs (${d.leftOut} left out) in ${d.packages} packages, ${d.files} declaration files, ${d.ms} ms\n`);
  console.log('1  labelled corpus (libs/*/bench)');
  console.log(`   stale files caught    ${labelled.staleFlagged}/${labelled.stale} (${pct(labelled.staleFlagged, labelled.stale)})`);
  console.log(`   current files flagged ${labelled.currentFlagged}/${labelled.current}`);
  for (const h of labelled.currentHits) console.log(`     ${h.file}:${h.line} ${h.rule}  ${h.text}`);
  console.log(`2  ceiling: every deprecated name matched loosely would catch ${bound.staleFlagged}/${bound.stale} (${pct(bound.staleFlagged, bound.stale)}) and flag ${bound.currentFlagged}/${bound.current} current files`);
  console.log('\n3  official examples');
  for (const w of wild) console.log(`   ${w.kind.padEnd(7)} ${w.label.padEnd(36)} ${String(w.files).padStart(4)} files  derived ${String(w.derivedFlagged).padStart(3)}  curated ${String(w.curatedFlagged).padStart(3)}  both ${String(w.both).padStart(3)}  derived only ${String(w.derivedOnly).padStart(3)}`);
  for (const w of wild.filter((x) => x.kind === 'current')) for (const h of w.derivedHits) console.log(`     ${h.file}:${h.line} ${h.rule}  ${h.text}`);
  console.log('\n4  real code bases (source only)');
  for (const a of apps) {
    console.log(`   ${a.app.padEnd(12)} ${a.files} files, ${a.filesFlagged} flagged, ${a.hits.length} hits: ${Object.entries(a.byRule).map(([k, v]) => `${k}×${v}`).join('  ')}`);
    for (const h of a.hits) console.log(`     ${h.file}:${h.line} ${h.rule}  ${h.text}`);
  }
}
if (args.includes('--write')) writeFileSync(join(ROOT, 'eval', 'derive', 'results.json'), JSON.stringify(out, null, 2) + '\n');

// --check: the committed results are the contract. A change to the generator that moves a number has to
// say so by refreshing results.json (and the prose that quotes it) in the same change.
if (args.includes('--check')) {
  const flat = (o, pre = '', acc = {}) => {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'ms') continue; // timing is not a result
      if (v && typeof v === 'object') flat(v, `${pre}${k}.`, acc);
      else acc[pre + k] = v;
    }
    return acc;
  };
  const want = flat(JSON.parse(read(join(ROOT, 'eval', 'derive', 'results.json'))));
  const got = flat(JSON.parse(JSON.stringify(out)));
  const moved = [...new Set([...Object.keys(want), ...Object.keys(got)])].filter((k) => want[k] !== got[k]).sort();
  if (moved.length) {
    console.error(`\nthe derive benchmark moved from eval/derive/results.json (${moved.length} figure(s)):`);
    for (const k of moved.slice(0, 40)) console.error(`  ${k}: ${JSON.stringify(want[k])} -> ${JSON.stringify(got[k])}`);
    console.error('If the change is intended, run with --write and update BENCHMARKS.md and docs/DERIVE.md to match.');
    process.exit(1);
  }
  console.log('\nthe derive benchmark matches eval/derive/results.json');
}
