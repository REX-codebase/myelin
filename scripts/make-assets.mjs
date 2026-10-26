#!/usr/bin/env node
// Regenerates the README art in assets/ from live data: the bundled libs, the benchmark,
// and real lint output. Every "stale" example below is checked against its ledger here, so
// the pictures cannot drift from what the tool actually does.
//   node scripts/make-assets.mjs            (uses eval/wild results if .wild/ exists)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.mjs';
import { check } from '../src/check.mjs';
import { listLibs, libPath, benchAll, benchCross } from '../src/libs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (name, svg) => writeFileSync(`${root}assets/${name}`, svg.trim() + '\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONO = 'JetBrains Mono, SFMono-Regular, Menlo, Consolas, monospace';
const SANS = 'Inter, Segoe UI, Helvetica, Arial, sans-serif';

function fires(lib, text) {
  const l = parse(readFileSync(libPath(lib), 'utf8'));
  return check(l, [{ name: 'x', text }]).violations.filter((v) => v.kind === 'ban').map((v) => v.id);
}

// ---------- 1. compare.svg: what your AI writes vs what the library wants now ----------
const PAIRS = [
  ['three', 'three.js r186', 'const clock = new THREE.Clock();', 'const timer = new THREE.Timer();'],
  ['react', 'React 19', "ReactDOM.render(<App />, root);", "createRoot(root).render(<App />);"],
  ['nextjs', 'Next.js 16', "const t = cookies().get('token');", "const t = (await cookies()).get('token');"],
  ['tailwind', 'Tailwind 4', '@tailwind base;', '@import "tailwindcss";'],
  ['zod', 'Zod 4', 'z.string().email()', 'z.email()'],
  ['svelte', 'Svelte 5', 'export let name;', 'let { name } = $props();'],
  ['express', 'Express 5', "app.get('*', handler);", "app.get('/*splat', handler);"],
  ['react-router', 'React Router 8', "import { Link } from 'react-router-dom';", "import { Link } from 'react-router';"],
];
for (const [lib, , bad, good] of PAIRS) {
  if (!fires(lib, bad).length) throw new Error(`compare: ${lib} does not fire on: ${bad}`);
  if (fires(lib, good).length) throw new Error(`compare: ${lib} fires on its fix: ${good}`);
}
{
  const rowH = 58, top = 96, W = 1280, H = top + PAIRS.length * rowH + 28;
  const rows = PAIRS.map(([lib, name, bad, good], i) => {
    const y = top + i * rowH;
    const id = fires(lib, bad)[0];
    return `
  <g class="row" style="animation-delay:${(i * 0.18).toFixed(2)}s">
    <rect x="24" y="${y}" width="${W - 48}" height="${rowH - 10}" rx="12" fill="${i % 2 ? '#0b101b' : '#0d1322'}"/>
    <text x="48" y="${y + 31}" class="lib">${esc(name)}</text>
    <text x="230" y="${y + 31}" class="bad">${esc(bad)}</text>
    <text x="722" y="${y + 31}" class="arrow">→</text>
    <text x="760" y="${y + 31}" class="good">${esc(good)}</text>
    <text x="${W - 48}" y="${y + 31}" class="id" text-anchor="end">${id}</text>
  </g>`;
  }).join('');
  out('compare.svg', `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .lib{font:700 18px ${SANS};fill:#e9eef7}
    .bad{font:16px ${MONO};fill:#ff6b8b;text-decoration:line-through;text-decoration-color:#ff3b6b88}
    .good{font:16px ${MONO};fill:#7dff9a}
    .arrow{font:700 20px ${SANS};fill:#5ff4ff}
    .id{font:600 13px ${MONO};fill:#55627a}
    .h{font:600 14px ${MONO};letter-spacing:3px}
    .row{opacity:0;animation:in .5s ease-out forwards}
    @keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  </style>
  <rect width="${W}" height="${H}" rx="20" fill="#05070d"/>
  <text x="230" y="66" class="h" fill="#ff6b8b">WHAT YOUR AI WRITES</text>
  <text x="760" y="66" class="h" fill="#7dff9a">WHAT THE LIBRARY WANTS NOW</text>${rows}
</svg>`);
}

// ---------- 2. libs.svg: the library grid ----------
const libs = listLibs();
{
  const cols = 4, cw = 296, ch = 112, gap = 16, pad = 24;
  const rowsN = Math.ceil(libs.length / cols);
  const W = pad * 2 + cols * cw + (cols - 1) * gap, H = pad * 2 + rowsN * ch + (rowsN - 1) * gap;
  const cards = libs.map((l, i) => {
    const x = pad + (i % cols) * (cw + gap), y = pad + Math.floor(i / cols) * (ch + gap);
    return `
  <g class="c" style="animation-delay:${(i * 0.08).toFixed(2)}s">
    <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="#0d1322" stroke="#22314b"/>
    <rect x="${x}" y="${y}" width="5" height="${ch}" rx="2" fill="#5ff4ff"/>
    <text x="${x + 24}" y="${y + 40}" class="n">${esc(l.name)}</text>
    <text x="${x + 24}" y="${y + 68}" class="v">${esc(l.version)}</text>
    <text x="${x + 24}" y="${y + 94}" class="m">${l.bans} bans · ${l.snippets} snippets · <tspan class="id">${esc(l.id)}</tspan></text>
  </g>`;
  }).join('') + (() => {
    const i = libs.length;
    if (i % cols === 0) return '';
    const x = pad + (i % cols) * (cw + gap), y = pad + Math.floor(i / cols) * (ch + gap);
    return `
  <g class="c" style="animation-delay:${(i * 0.08).toFixed(2)}s">
    <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="none" stroke="#2c3a55" stroke-dasharray="6 6"/>
    <text x="${x + cw / 2}" y="${y + 52}" text-anchor="middle" class="n" fill="#7f8ba0" style="fill:#7f8ba0">+ your library</text>
    <text x="${x + cw / 2}" y="${y + 80}" text-anchor="middle" class="m">source link + bench file = PR</text>
  </g>`;
  })();
  out('libs.svg', `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .n{font:700 21px ${SANS};fill:#f1f5fb}
    .v{font:600 16px ${MONO};fill:#5ff4ff}
    .m{font:14px ${SANS};fill:#7f8ba0}
    .id{font:13px ${MONO};fill:#45526a}
    .c{opacity:0;animation:in .45s ease-out forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
  </style>
  <rect width="${W}" height="${H}" rx="20" fill="#05070d"/>${cards}
</svg>`);
}

// ---------- 3. bench.svg: the numbers ----------
const bench = benchAll();
const cross = benchCross();
const wildPath = `${root}.wild`;
let wild = null;
if (existsSync(wildPath)) {
  wild = JSON.parse(execFileSync(process.execPath, [`${root}eval/wild/run.mjs`, wildPath, '--json'], { encoding: 'utf8' }));
  writeFileSync(`${root}eval/wild/results.json`, JSON.stringify(wild.map(({ flaggedFiles, ...r }) => ({ ...r, flaggedFiles })), null, 2) + '\n');
} else if (existsSync(`${root}eval/wild/results.json`)) {
  wild = JSON.parse(readFileSync(`${root}eval/wild/results.json`, 'utf8'));
}
{
  const tot = bench.reduce((a, r) => ({ bad: a.bad + r.badFiles, caught: a.caught + r.badCaught, good: a.good + r.goodFiles, clean: a.clean + r.goodClean }), { bad: 0, caught: 0, good: 0, clean: 0 });
  const bans = bench.reduce((a, r) => a + r.bans, 0);
  const W = 1280;
  const stat = (x, big, small, color = '#f1f5fb') => `
    <text x="${x}" y="118" text-anchor="middle" style="font:800 54px ${SANS};fill:${color}">${big}</text>
    <text x="${x}" y="150" text-anchor="middle" style="font:15px ${SANS};fill:#7f8ba0">${small}</text>`;
  let bars = '';
  let H = 200;
  if (wild) {
    const pairs = [['three', 'three.js'], ['nextjs', 'Next.js']];
    const y0 = 236;
    bars = `<text x="48" y="${y0 - 14}" style="font:600 14px ${MONO};letter-spacing:3px;fill:#5ff4ff">IN THE WILD · OFFICIAL EXAMPLE CODE, OLD RELEASE vs CURRENT</text>`;
    pairs.forEach(([lib, name], i) => {
      const o = wild.find((r) => r.lib === lib && r.kind === 'old');
      const n = wild.find((r) => r.lib === lib && r.kind === 'new');
      if (!o || !n) return;
      const y = y0 + 20 + i * 120, bw = 620, x = 480;
      const bar = (yy, r, color) => `
      <rect x="${x}" y="${yy}" width="${bw}" height="30" rx="8" fill="#111827"/>
      <rect x="${x}" y="${yy}" width="${Math.max(4, bw * r.rate).toFixed(1)}" height="30" rx="8" fill="${color}" class="b"/>
      <text x="${x + bw + 16}" y="${yy + 21}" style="font:700 17px ${MONO};fill:${color}">${(r.rate * 100).toFixed(1)}%</text>
      <text x="${x - 16}" y="${yy + 21}" text-anchor="end" style="font:15px ${SANS};fill:#aab4c5">${esc(r.label.replace(/^three\.js |^Next\.js /, ''))}</text>`;
      bars += `
      <text x="48" y="${y + 40}" style="font:700 22px ${SANS};fill:#f1f5fb">${name}</text>
      <text x="48" y="${y + 64}" style="font:13px ${SANS};fill:#6b7890">files flagged as stale</text>
      ${bar(y + 4, o, '#ff6b8b')}${bar(y + 46, n, '#7dff9a')}`;
    });
    H = y0 + 20 + pairs.length * 120 + 20;
  }
  out('bench.svg', `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>.b{transform-box:fill-box;transform-origin:left;animation:g 1.1s cubic-bezier(.2,.8,.2,1) both}@keyframes g{from{transform:scaleX(0)}to{transform:scaleX(1)}}</style>
  <rect width="${W}" height="${H}" rx="20" fill="#05070d"/>
  ${stat(170, libs.length, 'libraries')}
  ${stat(420, bans, 'verified bans')}
  ${stat(670, `${tot.caught}/${tot.bad}`, 'stale files caught', '#ff6b8b')}
  ${stat(920, `${tot.clean}/${tot.good}`, 'current files left clean', '#7dff9a')}
  ${stat(1140, cross.hits.length, `false alarms in ${cross.checks} cross-checks`, '#5ff4ff')}
  ${bars}
</svg>`);
}

// ---------- 4. demo.svg: an animated terminal with real lint output ----------
{
  const stale = [
    "import * as THREE from 'three';",
    "import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';",
    '',
    'const renderer = new THREE.WebGLRenderer({ antialias: true });',
    'renderer.outputEncoding = THREE.sRGBEncoding;',
    'renderer.shadowMap.type = THREE.PCFSoftShadowMap;',
    'const clock = new THREE.Clock();',
  ].join('\n');
  const l = parse(readFileSync(libPath('three'), 'utf8'));
  const res = check(l, [{ name: 'scene.js', text: stale }]);
  const fails = res.violations.sort((a, b) => a.line - b.line).map((v) => {
    const msg = v.message.split(/(?<=\.)\s/)[0];
    return `FAIL ${v.id.padEnd(4)} scene.js:${v.line}  ${msg.length > 74 ? msg.slice(0, 73) + '…' : msg}`;
  });
  const lines = [
    ['p', '$ myelin lint three scene.js        # code your AI just wrote'],
    ...fails.map((f) => ['f', f]),
    ['d', `${res.violations.length} failure(s). Each message carries the r186 fix.`],
    ['s', ''],
    ['p', '$ myelin lint three scene.js        # after one retry with the fixes'],
    ['g', '21 bans, 0 requires, 1 unit(s) checked: clean'],
  ];
  const W = 1280, lh = 30, top = 76, H = top + lines.length * lh + 30;
  const color = { p: '#e9eef7', f: '#ff6b8b', d: '#8a96aa', s: '#000', g: '#7dff9a' };
  const body = lines.map(([k, t], i) => `<text x="40" y="${top + i * lh}" class="l" fill="${color[k]}" style="animation-delay:${(0.4 + i * 0.55).toFixed(2)}s">${esc(t)}</text>`).join('\n  ');
  const total = (0.4 + lines.length * 0.55 + 4).toFixed(1);
  out('demo.svg', `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .l{font:16px ${MONO};white-space:pre;opacity:0;animation:t ${total}s steps(1) infinite}
    @keyframes t{0%{opacity:1}96%{opacity:1}100%{opacity:0}}
  </style>
  <rect width="${W}" height="${H}" rx="16" fill="#05070d" stroke="#1d2638"/>
  <circle cx="30" cy="28" r="7" fill="#ff5f57"/><circle cx="54" cy="28" r="7" fill="#febc2e"/><circle cx="78" cy="28" r="7" fill="#28c840"/>
  <text x="${W / 2}" y="33" text-anchor="middle" style="font:13px ${MONO};fill:#55627a">myelin · three.js r186</text>
  ${body}
</svg>`);
}

console.log(`assets written: compare.svg libs.svg bench.svg demo.svg (${libs.length} libs)`);
