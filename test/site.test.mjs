import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.mjs';
import { check } from '../src/check.mjs';
import { libPath } from '../src/libs.mjs';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const scene = read('../site/scene.js');
const page = read('../site/index.html');
const ledger = parse(readFileSync(libPath('three'), 'utf8'));

test('the landing page scene passes Myelin\'s own three.js ledger', () => {
  assert.ok(ledger.ok, JSON.stringify(ledger.problems));
  const r = check(ledger, [{ name: 'site/scene.js', text: scene }]);
  assert.deepEqual(r.violations.map((v) => `${v.id} line ${v.line}`), []);
});

test('the import map pins the release the ledger targets', () => {
  const pinned = /npm three@([\d.]+)/.exec(read('../libs/three/three.myelin'));
  assert.ok(pinned, 'ledger has no "npm three@x.y.z" version fact');
  const urls = [...page.matchAll(/cdn\.jsdelivr\.net\/npm\/three@([\d.]+)\//g)].map((m) => m[1]);
  assert.ok(urls.length >= 4, 'expected the import map and preloads to name a three.js version');
  assert.deepEqual([...new Set(urls)], [pinned[1]]);
});

test('the page keeps a working fallback when WebGL is unavailable', () => {
  assert.match(page, /<div id="gl"/, 'canvas host is missing');
  assert.match(page, /<script type="module" src="scene\.js">/);
  assert.match(page, /class="stage"/, 'SVG hero fallback was removed');
  assert.match(page, /html\.gl \.stage/, 'fallback is not swapped out once the scene is live');
  assert.match(scene, /classList\.add\('gl'\)/, 'scene never marks itself live');
  assert.match(scene, /catch\(\(err\)/, 'scene failures are not caught');
});

test('the scene respects reduced motion and data saver', () => {
  assert.match(scene, /prefers-reduced-motion: reduce/);
  assert.match(scene, /saveData/);
});

test('page events the scene listens for are emitted by the page', () => {
  for (const name of ['pair', 'fail', 'pass', 'copy']) {
    assert.match(scene, new RegExp(`'myelin:${name}'`), `scene does not listen for myelin:${name}`);
    assert.match(page, new RegExp(`emit\\('${name}'`), `page never emits ${name}`);
  }
});

test('every library link has a terminal in the arbor', () => {
  const links = (page.match(/<ul class="libs[\s\S]*?<\/ul>/) || [''])[0].match(/<li/g) || [];
  const branches = Number(/const N_BRANCH = (\d+)/.exec(scene)[1]);
  assert.equal(branches, links.length, 'N_BRANCH must equal the number of library links, including "Add yours"');
});

test('pulse light cannot overflow into NaN', () => {
  // An idle pulse sits at d = -999. exp(+150) is inf in float32 and inf * 0 is NaN,
  // which blacks out every lit surface, so the trail exponent must be clamped.
  assert.match(scene, /exp\(min\(x, 0\)\.div\(trailL\)\)/, 'trail exponent is not clamped to <= 0');
});

test('every addon the scene imports is preloaded, so the module graph is not a waterfall', () => {
  const addons = [...scene.matchAll(/from 'three\/addons\/([^']+)'/g)].map((m) => m[1]);
  assert.ok(addons.length >= 4, 'expected the scene to import several addons');
  for (const a of addons) assert.ok(page.includes(`examples/jsm/${a}"`), `no modulepreload for ${a}`);
  // the addons' own dependency, which would otherwise be a second serial round trip
  assert.ok(page.includes('display/GaussianBlurNode.js"'), 'GaussianBlurNode (imported by DepthOfFieldNode) is not preloaded');
  for (const core of ['three.core.js', 'three.webgpu.js', 'three.tsl.js']) assert.ok(page.includes(`build/${core}"`), `no modulepreload for ${core}`);
});

test('the quality ladder only drops work, never adds it, and ends above a legible floor', () => {
  assert.match(scene, /const LADDER = \[/);
  assert.match(scene, /ratioScale \*= 0\.8/, 'pixel rung does not scale the ratio down');
  assert.match(scene, /MathU\.clamp\(ratioScale \* Math\.min\(window\.devicePixelRatio \|\| 1, RATIO_CAP,[\s\S]*?, 0\.6, 2\)/, 'pixel ratio is not floored at 0.6');
  assert.match(scene, /\.\.\.LADDER\[rung\+\+\]\(\)|!LADDER\[rung\+\+\]\(\)/, 'ladder does not skip rungs that are already spent');
});

test('the page loads nothing from a third party except the pinned three.js CDN, and says so', () => {
  const tags = [...page.matchAll(/<(?:link|script|img|source|iframe|video|audio)\b[^>]*?(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
  const map = (page.match(/<script type="importmap">([\s\S]*?)<\/script>/) || ['', ''])[1];
  const imports = [...map.matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
  assert.deepEqual([...new Set([...tags, ...imports])], ['cdn.jsdelivr.net'], 'a new third-party host needs a deliberate decision, and a line in the footer');
  assert.doesNotMatch(page, /url\(\s*["']?https?:/, 'CSS pulls in an external resource');
  assert.match(page, /No cookies and no analytics\./);
  assert.match(page, /loads three\.js r186 from cdn\.jsdelivr\.net/);
});

test('the page and scene use no storage, tracking or network APIs of their own', () => {
  // look at code only: the footer's own sentence says "no analytics"
  const inline = [...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  for (const [name, text] of [['inline scripts in index.html', inline], ['scene.js', scene]]) {
    const hit = /document\.cookie|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|\bfetch\(|WebSocket|gtag\(|analytics/.exec(text);
    assert.equal(hit, null, `${name} uses ${hit && hit[0]}, which contradicts the footer's privacy line`);
  }
});
