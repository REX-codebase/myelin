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

// One palette for every image: a quiet dark surface, hairline borders, one accent.
const C = {
  bg: '#0b0f19', card: '#0f1523', line: '#1d2638',
  text: '#e9eef7', mute: '#8a96aa', dim: '#55627a',
  accent: '#5ff4ff', bad: '#ff7a93', good: '#6ee7a0',
};
const W = 1280;
const frame = (H) => `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${C.bg}" stroke="${C.line}"/>`;
const svg = (H, style, body) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">
  <style>${style}</style>
  ${frame(H)}${body}
</svg>`;
const label = (x, y, t, color = C.dim, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" style="font:600 12px ${MONO};letter-spacing:2.5px;fill:${color}">${esc(t)}</text>`;

function fires(lib, text) {
  const l = parse(readFileSync(libPath(lib), 'utf8'));
  return check(l, [{ name: 'x', text }]).violations.filter((v) => v.kind === 'ban').map((v) => v.id);
}

// ---------- 0. hero.svg: wordmark ----------
{
  const H = 320;
  const caps = [0, 1, 2, 3, 4].map((i) => `<rect class="cap" x="${496 + i * 62}" y="64" width="48" height="12" rx="6" fill="${C.accent}" style="animation-delay:${(i * 0.12).toFixed(2)}s"/>`).join('');
  out('hero.svg', svg(H, `
    .cap{opacity:0;animation:in .6s ease-out forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
  `, `
  <line x1="470" y1="70" x2="810" y2="70" stroke="${C.line}" stroke-width="2" stroke-linecap="round"/>
  ${caps}
  <text x="${W / 2}" y="176" text-anchor="middle" style="font:800 80px ${SANS};letter-spacing:18px;fill:${C.text}">MYELIN</text>
  <text x="${W / 2}" y="232" text-anchor="middle" style="font:400 24px ${SANS};fill:${C.mute}">Your AI learned last year's docs. Myelin teaches it this year's.</text>
  ${label(W / 2, 276, 'RULE LEDGERS FOR LLM CODE', C.dim, 'middle')}`));
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
  const rowH = 56, top = 88, H = top + PAIRS.length * rowH + 24;
  const rows = PAIRS.map(([lib, name, bad, good], i) => {
    const y = top + i * rowH;
    const id = fires(lib, bad)[0];
    return `
  <g class="row" style="animation-delay:${(i * 0.12).toFixed(2)}s">
    <line x1="48" y1="${y}" x2="${W - 48}" y2="${y}" stroke="${C.line}"/>
    <text x="48" y="${y + 34}" class="lib">${esc(name)}</text>
    <text x="240" y="${y + 34}" class="bad">${esc(bad)}</text>
    <text x="716" y="${y + 34}" class="arrow">→</text>
    <text x="760" y="${y + 34}" class="good">${esc(good)}</text>
    <text x="${W - 48}" y="${y + 34}" class="id" text-anchor="end">${id}</text>
  </g>`;
  }).join('');
  out('compare.svg', svg(H, `
    .lib{font:600 16px ${SANS};fill:${C.text}}
    .bad{font:15px ${MONO};fill:${C.bad};text-decoration:line-through;text-decoration-color:${C.bad}88}
    .good{font:15px ${MONO};fill:${C.good}}
    .arrow{font:500 18px ${SANS};fill:${C.dim}}
    .id{font:600 12px ${MONO};fill:${C.dim}}
    .row{opacity:0;animation:in .5s ease-out forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
  `, `
  ${label(240, 54, 'WHAT YOUR AI WRITES', C.bad)}
  ${label(760, 54, 'WHAT THE LIBRARY WANTS NOW', C.good)}${rows}`));
}

// ---------- 2. libs.svg: the library grid ----------
const libs = listLibs();
{
  const cols = 4, gap = 16, pad = 32, ch = 104;
  const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
  const rowsN = Math.ceil((libs.length + 1) / cols);
  const H = pad * 2 + rowsN * ch + (rowsN - 1) * gap;
  const pos = (i) => [pad + (i % cols) * (cw + gap), pad + Math.floor(i / cols) * (ch + gap)];
  const cards = libs.map((l, i) => {
    const [x, y] = pos(i);
    return `
  <g class="c" style="animation-delay:${(i * 0.05).toFixed(2)}s">
    <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="10" fill="${C.card}" stroke="${C.line}"/>
    <text x="${x + 20}" y="${y + 38}" class="n">${esc(l.name)}</text>
    <text x="${x + 20}" y="${y + 62}" class="v">${esc(l.version)}</text>
    <text x="${x + 20}" y="${y + 84}" class="m">${l.bans} bans · ${l.snippets} snippets</text>
  </g>`;
  }).join('');
  const [ax, ay] = pos(libs.length);
  const add = `
  <g class="c" style="animation-delay:${(libs.length * 0.05).toFixed(2)}s">
    <rect x="${ax}" y="${ay}" width="${cw}" height="${ch}" rx="10" fill="none" stroke="${C.line}" stroke-dasharray="4 5"/>
    <text x="${ax + cw / 2}" y="${ay + 48}" text-anchor="middle" class="n" style="fill:${C.mute}">+ your library</text>
    <text x="${ax + cw / 2}" y="${ay + 72}" text-anchor="middle" class="m">source link + bench file = PR</text>
  </g>`;
  out('libs.svg', svg(H, `
    .n{font:600 17px ${SANS};fill:${C.text}}
    .v{font:500 14px ${MONO};fill:${C.accent}}
    .m{font:13px ${SANS};fill:${C.mute}}
    .c{opacity:0;animation:in .45s ease-out forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
  `, cards + add));
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
  const stats = [
    [libs.length, 'libraries', C.text],
    [bans, 'verified bans', C.text],
    [`${tot.caught}/${tot.bad}`, 'stale files caught', C.bad],
    [`${tot.clean}/${tot.good}`, 'current files left clean', C.good],
    [cross.hits.length, `false alarms in ${cross.checks.toLocaleString('en-US')} cross-checks`, C.accent],
  ];
  const colW = (W - 96) / stats.length;
  const statSvg = stats.map(([big, small, color], i) => {
    const x = 48 + colW * i + colW / 2;
    return `
  <text x="${x}" y="100" text-anchor="middle" style="font:700 46px ${SANS};fill:${color}">${big}</text>
  <text x="${x}" y="130" text-anchor="middle" style="font:14px ${SANS};fill:${C.mute}">${esc(small)}</text>`;
  }).join('');
  let bars = '';
  let H = 168;
  if (wild) {
    const pairs = [['three', 'three.js'], ['nextjs', 'Next.js']];
    const y0 = 168;
    bars = `<line x1="48" y1="${y0}" x2="${W - 48}" y2="${y0}" stroke="${C.line}"/>
  ${label(48, y0 + 36, 'IN THE WILD · OFFICIAL EXAMPLES, OLD RELEASE VS CURRENT')}`;
    pairs.forEach(([lib, name], i) => {
      const o = wild.find((r) => r.lib === lib && r.kind === 'old');
      const n = wild.find((r) => r.lib === lib && r.kind === 'new');
      if (!o || !n) return;
      const y = y0 + 60 + i * 104, bw = 600, x = 500;
      const bar = (yy, r, color) => `
  <rect x="${x}" y="${yy}" width="${bw}" height="22" rx="6" fill="${C.card}"/>
  <rect x="${x}" y="${yy}" width="${Math.max(4, bw * r.rate).toFixed(1)}" height="22" rx="6" fill="${color}" class="b"/>
  <text x="${x + bw + 16}" y="${yy + 17}" style="font:600 15px ${MONO};fill:${color}">${(r.rate * 100).toFixed(1)}%</text>
  <text x="${x - 16}" y="${yy + 17}" text-anchor="end" style="font:14px ${SANS};fill:${C.mute}">${esc(r.label.replace(/^three\.js |^Next\.js /, ''))}</text>`;
      bars += `
  <text x="48" y="${y + 24}" style="font:600 20px ${SANS};fill:${C.text}">${name}</text>
  <text x="48" y="${y + 46}" style="font:13px ${SANS};fill:${C.dim}">files flagged as stale</text>
  ${bar(y + 2, o, C.bad)}${bar(y + 38, n, C.good)}`;
    });
    H = y0 + 60 + pairs.length * 104 + 8;
  }
  out('bench.svg', svg(H, `
    .b{transform-box:fill-box;transform-origin:left;animation:g 1s cubic-bezier(.2,.8,.2,1) both}
    @keyframes g{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  `, statSvg + bars));
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
  const lh = 30, top = 84, H = top + lines.length * lh + 20;
  const color = { p: C.text, f: C.bad, d: C.mute, s: C.bg, g: C.good };
  const body = lines.map(([k, t], i) => `<text x="40" y="${top + i * lh}" class="l" fill="${color[k]}" style="animation-delay:${(0.4 + i * 0.5).toFixed(2)}s">${esc(t)}</text>`).join('\n  ');
  const total = (0.4 + lines.length * 0.5 + 4).toFixed(1);
  out('demo.svg', svg(H, `
    .l{font:15px ${MONO};white-space:pre;opacity:0;animation:t ${total}s steps(1) infinite}
    @keyframes t{0%{opacity:1}96%{opacity:1}100%{opacity:0}}
  `, `
  <line x1="0" y1="52" x2="${W}" y2="52" stroke="${C.line}"/>
  <circle cx="30" cy="26" r="5" fill="${C.line}"/><circle cx="50" cy="26" r="5" fill="${C.line}"/><circle cx="70" cy="26" r="5" fill="${C.line}"/>
  <text x="${W / 2}" y="31" text-anchor="middle" style="font:12px ${MONO};fill:${C.dim}">myelin · three.js r186</text>
  ${body}`));
}

// ---------- 5. how.svg: ledger -> model -> script -> current code ----------
{
  const H = 236;
  const steps = [
    ['01', 'Ledger', 'what changed since', 'the model was trained', 'three.myelin'],
    ['02', 'Model', 'reads the rules', 'before it writes', 'myelin gate'],
    ['03', 'Script', 'checks every ban', 'in every file', 'myelin lint'],
    ['04', 'Current code', 'or CI fails with', 'the exact fix', 'exit 0 / exit 1'],
  ];
  const bw = 250, gap = (W - 96 - bw * steps.length) / (steps.length - 1);
  const cards = steps.map(([n, title, a, b, cmd], i) => {
    const x = 48 + i * (bw + gap), last = i === steps.length - 1;
    const arrow = last ? '' : `<path d="M${x + bw + 14} 118 H${x + bw + gap - 14} m-6 -5 l6 5 l-6 5" fill="none" stroke="${C.dim}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `
  <g class="s" style="animation-delay:${(i * 0.15).toFixed(2)}s">
    <rect x="${x}" y="48" width="${bw}" height="140" rx="10" fill="${C.card}" stroke="${last ? C.good + '66' : C.line}"/>
    <text x="${x + 22}" y="80" style="font:600 12px ${MONO};letter-spacing:2px;fill:${last ? C.good : C.accent}">${n}</text>
    <text x="${x + 22}" y="108" style="font:600 20px ${SANS};fill:${C.text}">${title}</text>
    <text x="${x + 22}" y="132" style="font:14px ${SANS};fill:${C.mute}">${a}</text>
    <text x="${x + 22}" y="152" style="font:14px ${SANS};fill:${C.mute}">${b}</text>
    <text x="${x + 22}" y="174" style="font:12px ${MONO};fill:${C.dim}">${cmd}</text>
  </g>${arrow}`;
  }).join('');
  out('how.svg', svg(H, `
    .s{opacity:0;animation:in .5s ease-out forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
  `, cards));
}

console.log(`assets written: hero.svg compare.svg libs.svg bench.svg demo.svg how.svg (${libs.length} libs)`);
