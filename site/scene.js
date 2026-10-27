/*
 * Myelin landing page: one myelinated axon, filmed by a scroll-driven camera.
 *
 * three.js r186 on the WebGPU + TSL path (WebGPURenderer, RenderPipeline, node
 * materials). WebGPURenderer falls back to WebGL 2 by itself. This file is
 * linted by Myelin's own three.js ledger: see test/site.test.mjs.
 *
 * World: the axon follows `curve`, measured in arclength `d` from its start.
 * Sheath segments are baked into one mesh, so every vertex carries `aD`, its
 * distance along the axon. Action potentials are plain numbers (a position and
 * a colour); the shaders turn "how far is this vertex from the pulse" into
 * light. Nothing is animated on the CPU except the pulses and the camera.
 */
import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, vec3, vec4, uniform, attribute, mix, smoothstep, exp, sin, cos, abs, min, length, dot,
  normalize, step, saturate, positionWorld, normalWorld, cameraPosition, screenUV, pass,
  cameraProjectionMatrix, modelViewMatrix, mx_noise_float
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const MathU = THREE.MathUtils;

/* ------------------------------------------------------------------ */
/* the axon                                                            */
/* ------------------------------------------------------------------ */
const L = 150;                       // length of the myelinated axon, world units
const CORE_R = 0.16;                 // naked axon radius
const SHEATH_R = 1.0;                // myelin radius
const N_BRANCH = 22;                 // 21 libraries + "add yours"

const curve = new THREE.CatmullRomCurve3([
  [-14, 0, 0], [8, 0.8, -3], [32, -1.4, -1], [58, 1.6, -5], [84, -0.6, -1.5], [110, 1.2, -4.5], [134, 0, -2], [156, 0.4, -3]
].map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
curve.arcLengthDivisions = 1200;
const CURVE_LEN = curve.getLength();
// The curve starts a little before d = 0 and ends a little after d = L so the
// tube never ends inside the frame; map d onto it.
const D0 = 14;
const toU = (d) => MathU.clamp((d + D0) / CURVE_LEN, 0, 1);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const endP = curve.getPointAt(toU(L));
const endT = curve.getTangentAt(toU(L)).normalize();
const startT = curve.getTangentAt(toU(0)).normalize();
const startP = curve.getPointAt(toU(0));

/** Position and orthonormal frame (tangent, right, up) at arclength d. */
function frameAt(d, P, T, R, U) {
  if (d > L) { P.copy(endP).addScaledVector(endT, d - L); T.copy(endT); }
  else if (d < 0) { P.copy(startP).addScaledVector(startT, d); T.copy(startT); }
  else { curve.getPointAt(toU(d), P); curve.getTangentAt(toU(d), T).normalize(); }
  R.crossVectors(T, UP).normalize();
  U.crossVectors(R, T).normalize();
}

/* ------------------------------------------------------------------ */
/* pulses: the only moving part of the world                           */
/* ------------------------------------------------------------------ */
const NP = 6;
const BLUE = new THREE.Color(0.32, 0.52, 1.0);
const ICE = new THREE.Color(0.62, 0.84, 1.0);
const RED = new THREE.Color(1.0, 0.16, 0.24);
const pulses = Array.from({ length: NP }, () => ({
  d: uniform(-999), amp: uniform(0), col: uniform(new THREE.Color(BLUE)),
  pos: -999, v: 0, a: 0, hold: 0
}));

/** Saltatory conduction: dwell on a node, then hop to the next. */
const nodeD = [];
function hop(pos) {
  if (pos <= nodeD[0] || pos >= nodeD[nodeD.length - 1]) return pos;
  let i = 0;
  while (i < nodeD.length - 2 && pos >= nodeD[i + 1]) i++;
  const f = (pos - nodeD[i]) / (nodeD[i + 1] - nodeD[i]);
  const k = 1 - Math.pow(1 - Math.min(1, f * 1.7), 3);
  return nodeD[i] + (nodeD[i + 1] - nodeD[i]) * k;
}

function firePulse(d, v, color, amp) {
  let slot = pulses[0];
  for (const p of pulses) { if (p.a < slot.a) slot = p; }
  slot.pos = d; slot.v = v; slot.a = amp;
  slot.col.value.copy(color);
}

/** Sum of every pulse's light at distance `dn` from the axon start. */
const pulseField = (dn, headW, trailL, headGain, trailGain) => {
  let sum = vec3(0);
  for (const p of pulses) {
    const x = dn.sub(p.d);
    const head = exp(x.mul(x).div(headW * headW).negate());
    const behind = float(1).sub(smoothstep(-0.2, 0.5, x));
    // clamp the exponent: an idle pulse sits at d = -999, and exp(+150) is inf in float32, and inf * 0 is NaN
    const trail = exp(min(x, 0).div(trailL)).mul(behind);
    sum = sum.add(p.col.mul(p.amp).mul(head.mul(headGain).add(trail.mul(trailGain))));
  }
  return sum;
};

/* ------------------------------------------------------------------ */
/* uniforms shared by the whole scene                                  */
/* ------------------------------------------------------------------ */
const uTime = uniform(0);
const uHover = uniform(-1);
const uHoverAmp = uniform(0);
const uStreak = uniform(0);
const uFlash = uniform(0);

/* ------------------------------------------------------------------ */
/* geometry                                                            */
/* ------------------------------------------------------------------ */
function addAttr(geo, name, size, fill) {
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * size);
  for (let i = 0; i < n; i++) fill(a, i, geo);
  geo.setAttribute(name, new THREE.BufferAttribute(a, size));
}

function sheathProfile(h) {
  const pts = [];
  const N = 30;
  const e = Math.min(0.8, h * 0.17);
  const r0 = CORE_R * 0.97;
  for (let i = 0; i <= N; i++) {
    const y = -h / 2 + (h * i) / N;
    const edge = Math.min(y + h / 2, h / 2 - y);
    const k = Math.min(1, edge / e);
    const body = Math.pow(1 - Math.pow(1 - k, 2.7), 1 / 2.7);
    const ridge = 1 + 0.045 * Math.exp(-Math.pow((edge - e * 1.25) / (e * 0.5), 2));
    pts.push(new THREE.Vector2(r0 + (SHEATH_R * ridge - r0) * body, y));
  }
  return pts;
}

function buildAxon() {
  const rand = rng(7);
  const sheaths = [];
  const bulges = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const T = new THREE.Vector3(), R = new THREE.Vector3(), U = new THREE.Vector3(), P = new THREE.Vector3();
  const gap = 1.5;
  let d = 3.2;
  while (d < L - 12) {
    const h = 5.2 + rand() * 2.6;
    if (d + h > L - 10) break;
    const c = d + h / 2;
    frameAt(c, P, T, R, U);
    q.setFromUnitVectors(UP, T);
    m.compose(P, q, new THREE.Vector3(1, 1, 1));
    const g = new THREE.LatheGeometry(sheathProfile(h), 44);
    g.applyMatrix4(m);
    addAttr(g, 'aD', 1, (a, i, geo) => {
      // local y of this vertex, recovered from world position along the tangent
      a[i] = c + _p.fromBufferAttribute(geo.attributes.position, i).sub(P).dot(T);
    });
    addAttr(g, 'aA', 1, (a, i, geo) => { a[i] = geo.attributes.uv.getX(i) * Math.PI * 2; });
    sheaths.push(g);
    nodeD.push(d + h + gap / 2);
    // naked-axon swelling at the node that follows this segment
    const b = new THREE.SphereGeometry(1, 16, 10);
    const nc = d + h + gap / 2;
    frameAt(nc, P, T, R, U);
    q.setFromUnitVectors(UP, T);
    m.compose(P, q, new THREE.Vector3(CORE_R * 2.3, gap * 0.5, CORE_R * 2.3));
    b.applyMatrix4(m);
    addAttr(b, 'aD', 1, (a, i, geo) => { a[i] = nc + _p.fromBufferAttribute(geo.attributes.position, i).sub(P).dot(T); });
    bulges.push(b);
    d += h + gap;
  }
  nodeD.unshift(0);
  nodeD.push(L - 4);
  return { sheath: mergeGeometries(sheaths), bulges: mergeGeometries(bulges) };
}

function tube(path, segs, radius, radial, d0) {
  const len = path.getLength();
  const g = new THREE.TubeGeometry(path, segs, radius, radial, false);
  addAttr(g, 'aD', 1, (a, i, geo) => { a[i] = d0 + geo.attributes.uv.getX(i) * len; });
  return { geo: g, len };
}

/** The terminal arbor: the axon splits into one branch per library. */
function buildArbor() {
  const rand = rng(23);
  const T = endT.clone();
  const R = new THREE.Vector3().crossVectors(T, UP).normalize();
  const U = new THREE.Vector3().crossVectors(R, T).normalize();
  const tubes = [];
  const boutons = [];
  const ends = [];
  for (let i = 0; i < N_BRANCH; i++) {
    const ang = i * 2.39996 + 0.4;
    const rad = 2.5 + 14.5 * Math.sqrt((i + 0.5) / N_BRANCH);
    const lat = new THREE.Vector3().addScaledVector(R, Math.cos(ang) * rad).addScaledVector(U, Math.sin(ang) * rad * 0.72);
    const F = 19 + rand() * 15;
    const end = endP.clone().addScaledVector(T, F).add(lat);
    const path = new THREE.CatmullRomCurve3([
      endP.clone().addScaledVector(T, -5),
      endP.clone(),
      endP.clone().addScaledVector(T, F * 0.38).addScaledVector(lat, 0.3).addScaledVector(U, (rand() - 0.5) * 2),
      endP.clone().addScaledVector(T, F * 0.78).addScaledVector(lat, 0.82),
      end
    ], false, 'centripetal');
    const { geo, len } = tube(path, 48, 0.07, 6, L - 5);
    tubes.push(geo);
    ends.push({ end, d: L - 5 + len });
    const r = i === N_BRANCH - 1 ? 0.5 : 0.56;
    const s = new THREE.SphereGeometry(r, 22, 14);
    s.translate(end.x, end.y, end.z);
    addAttr(s, 'aD', 1, (a, j) => { a[j] = L - 5 + len; });
    addAttr(s, 'aId', 1, (a, j) => { a[j] = i; });
    boutons.push(s);
  }
  return { tubes: mergeGeometries(tubes), boutons: mergeGeometries(boutons), ends };
}

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */
function makeMaterials() {
  const aD = attribute('aD', 'float');
  const facing = (n) => saturate(abs(dot(n, normalize(cameraPosition.sub(positionWorld)))));

  // pearlescent myelin: studio-lit, glows from inside as a pulse passes
  const sheath = new THREE.MeshPhysicalNodeMaterial({
    color: 0xc9ceda, roughness: 0.2, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.035,
    sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(0.55, 0.66, 1)
  });
  const aA = attribute('aA', 'float');
  sheath.roughnessNode = float(0.17).add(mx_noise_float(vec3(aD.mul(0.9), aA.mul(1.6), 0.3)).mul(0.07));
  const wrap = sin(aA.mul(3.0).add(aD.mul(5.5))).mul(0.5).add(0.5);
  sheath.colorNode = vec3(0.86, 0.88, 0.95).mul(float(1).sub(wrap.mul(0.05)));
  sheath.emissiveNode = pulseField(aD, 2.0, 6.5, 0.2, 0.05).mul(facing(normalWorld).mul(0.7).add(0.3));

  // the naked axon: dim steel that flares when a pulse arrives
  const hot = (base, hg, tg) => Fn(() => base.add(pulseField(aD, 0.75, 5.5, hg, tg)))();
  const core = new THREE.MeshBasicNodeMaterial();
  core.colorNode = hot(vec3(0.07, 0.09, 0.16), 3.4, 0.5);
  const node = new THREE.MeshBasicNodeMaterial();
  node.colorNode = hot(vec3(0.16, 0.2, 0.34), 5.2, 1.2);

  const twig = new THREE.MeshBasicNodeMaterial();
  twig.colorNode = hot(vec3(0.05, 0.07, 0.13), 3.2, 0.6);

  const aId = attribute('aId', 'float');
  const bouton = new THREE.MeshPhysicalNodeMaterial({ color: 0xcfd5ea, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const isHover = step(abs(aId.sub(uHover)), 0.5);
  const isAdd = step(float(N_BRANCH - 1.5), aId);
  bouton.colorNode = mix(vec3(0.9, 0.93, 1.0), vec3(0.28, 0.3, 0.4), isAdd.mul(0.8));
  bouton.emissiveNode = pulseField(aD, 1.6, 5, 2.4, 0.5)
    .add(vec3(0.34, 0.5, 1.0).mul(isHover.mul(uHoverAmp).mul(2.6)))
    .add(vec3(0.03, 0.04, 0.09).mul(float(1).sub(isAdd)));
  return { sheath, core, node, twig, bouton };
}

/* ------------------------------------------------------------------ */
/* dust and bokeh: view-aligned quads built by hand                    */
/* ------------------------------------------------------------------ */
function quadField(count, place, bokeh) {
  const rnd01 = rng(bokeh ? 311 : 173);
  const pos = new Float32Array(count * 4 * 3);
  const corner = new Float32Array(count * 4 * 2);
  const ctr = new Float32Array(count * 4 * 3);
  const rnd = new Float32Array(count * 4 * 4);
  const idx = new Uint32Array(count * 6);
  const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < count; i++) {
    const c = place(i);
    const r = [rnd01(), rnd01(), rnd01(), rnd01()];
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      corner[v * 2] = cs[k][0]; corner[v * 2 + 1] = cs[k][1];
      ctr[v * 3] = c.x; ctr[v * 3 + 1] = c.y; ctr[v * 3 + 2] = c.z;
      rnd[v * 4] = r[0]; rnd[v * 4 + 1] = r[1]; rnd[v * 4 + 2] = r[2]; rnd[v * 4 + 3] = r[3];
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('aC', new THREE.BufferAttribute(ctr, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(rnd, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(L / 2, 0, -2), 400);

  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const aC = attribute('aC', 'vec3');
  const aR = attribute('aR', 'vec4');
  const aCorner = attribute('aCorner', 'vec2');
  const sizeMin = bokeh ? 0.5 : 0.014;
  const sizeVar = bokeh ? 1.5 : 0.05;
  const drift = bokeh ? 0.9 : 0.55;
  m.vertexNode = Fn(() => {
    const t = uTime.mul(aR.z.mul(0.5).add(0.25));
    const wob = vec3(sin(t.add(aR.y.mul(6.28))), cos(t.mul(0.8).add(aR.x.mul(9.0))), sin(t.mul(0.6).add(aR.w.mul(3.0)))).mul(drift);
    const mv = modelViewMatrix.mul(vec4(aC.add(wob), 1));
    const size = aR.x.mul(aR.x).mul(sizeVar).add(sizeMin);
    // speed streaks: stretch along the line from the screen centre
    const dir = normalize(mv.xy.add(0.0001));
    const stretch = uStreak.mul(length(mv.xy).mul(0.07)).mul(bokeh ? 0 : 1);
    const off = aCorner.mul(size).add(dir.mul(aCorner.dot(dir)).mul(stretch));
    return cameraProjectionMatrix.mul(vec4(mv.xy.add(off), mv.z, mv.w));
  })();
  m.colorNode = Fn(() => {
    const q = aCorner;
    const r = length(q);
    const tw = sin(uTime.mul(aR.z.mul(2).add(0.6)).add(aR.y.mul(40))).mul(0.5).add(0.5);
    const warm = mix(vec3(0.55, 0.68, 1.0), vec3(1.0, 0.96, 0.9), aR.w.mul(aR.w));
    if (bokeh) {
      const disc = float(1).sub(smoothstep(0.9, 1.0, r));
      const rim = smoothstep(0.55, 0.95, r).mul(0.7).add(0.3);
      return vec4(warm, disc.mul(rim).mul(0.07));
    }
    const a = exp(r.mul(r).mul(-3.2)).mul(tw.mul(0.6).add(0.4));
    return vec4(warm.mul(0.55), a);
  })();
  return new THREE.Mesh(g, m);
}

/* ------------------------------------------------------------------ */
/* studio environment: softboxes, so the clearcoat has something to    */
/* reflect                                                             */
/* ------------------------------------------------------------------ */
function buildStudio() {
  const s = new THREE.Scene();
  const box = (w, h, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicNodeMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  const hdr = (r, g, b) => new THREE.Color(r, g, b);
  box(30, 1.4, hdr(22, 23, 26), 0, 8, -3);           // overhead strip
  box(1.2, 20, hdr(4, 6, 18), -10, 1, 2);            // cool left kicker
  box(1.0, 20, hdr(16, 17, 20), 9, 0, -8);           // rim strip, behind right
  box(18, 0.8, hdr(2.2, 2.6, 5), 0, -8, 3);          // low fill
  box(40, 40, hdr(0.004, 0.005, 0.012), 0, 0, 18);   // dark card behind the camera
  return s;
}

/* ------------------------------------------------------------------ */
/* camera poses, one per chapter of the page                           */
/* ------------------------------------------------------------------ */
// d,s,u,b: where the camera sits (along, right, up, back of the axon frame at d)
// ad,as,au: what it looks at.  fov, sx,sy: lens and frame shift.  ex: exposure.
// bk,fm: bokeh amount and focus multiplier.  st: streak boost.
const POSES = {
  top:       { d: 14, s: 15, u: 1.5, b: -9, ad: 13, as: -0.5, au: -0.4, fov: 27, sx: 0.0, sy: 0.22, ex: 0.88, bk: 1.4, fm: 0.85 },
  how:       { d: 38, s: 13, u: 3, b: -6, ad: 10, as: 0, au: 0, fov: 30, sx: -0.1, sy: 0.43, ex: 0.55, bk: 2.2, fm: 1.0 },
  catch:     { d: 56, s: 16, u: -5.5, b: -4, ad: 9, as: 0, au: 1.2, fov: 28, sx: 0.0, sy: 0.3, ex: 0.42, bk: 3.0, fm: 0.9 },
  lint:      { d: 76, s: 15, u: 5, b: -6, ad: 9, as: 0, au: -1, fov: 30, sx: 0.1, sy: 0.42, ex: 0.45, bk: 3.0, fm: 1.0 },
  libraries: { d: 112, s: 11, u: 10, b: -2, ad: 58, as: 0, au: 0, fov: 33, sx: 0.26, sy: -0.24, ex: 0.9, bk: 0.8, fm: 1.1 },
  evidence:  { d: 205, s: 6, u: 2, b: 0, ad: -52, as: 0, au: 0, fov: 36, sx: 0.0, sy: 0.12, ex: 0.42, bk: 2.0, fm: 1.0 },
  limits:    { d: 205, s: 6, u: 2, b: 0, ad: -52, as: 0, au: 0, fov: 36, sx: 0.0, sy: 0.12, ex: 0.42, bk: 2.0, fm: 1.0 }, // hidden behind the white cut: hold still
  install:   { d: 96, s: 30, u: 10, b: -26, ad: 26, as: 0, au: 0, fov: 38, sx: 0.0, sy: 0.34, ex: 0.9, bk: 1.2, fm: 1.0 }
};
const ORDER = ['top', 'how', 'catch', 'lint', 'libraries', 'evidence', 'limits', 'install'];
const KEYS = Object.keys(POSES.top);

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */
/** Let input and paint run between the heavy boot steps. */
const breathe = () => (globalThis.scheduler && globalThis.scheduler.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

/** Named marks show up in the browser's Performance panel as myelin:<stage>. */
const mark = (name) => { try { performance.mark('myelin:' + name); } catch (e) { /* no performance API */ } };

async function boot() {
  mark('boot');
  if (!root.classList.contains('js')) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const host = document.getElementById('gl');
  if (!host) return;

  const tierParam = params.get('q');
  let tier = tierParam !== null ? Number(tierParam) : (coarse || Math.min(screen.width, screen.height) < 700 ? 0 : 1);
  // Cost scales with pixels, not CSS size, so cap the pixel count: a 4K monitor or a retina laptop
  // renders fewer pixels than its native grid, which this soft, glowing scene never shows.
  const PIXEL_BUDGET = [1.1e6, 2.4e6][tier === 0 ? 0 : 1];
  const RATIO_CAP = tier === 0 ? 1.25 : 1.75;
  let ratioScale = 1;                                    // the quality ladder lowers this
  const pixelRatio = () => MathU.clamp(ratioScale * Math.min(window.devicePixelRatio || 1, RATIO_CAP,
    Math.sqrt(PIXEL_BUDGET / (window.innerWidth * window.innerHeight))), 0.6, 2);

  const renderer = new THREE.WebGPURenderer({ antialias: !(DEBUG && params.get('aa') === '0'), alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  host.appendChild(renderer.domElement);
  await renderer.init();
  mark('renderer-init');
  await breathe();

  const scene = new THREE.Scene();
  const haze = new THREE.Color().setRGB(0.0062, 0.0085, 0.021, THREE.LinearSRGBColorSpace);
  scene.fog = new THREE.FogExp2(haze, 0.0125);
  scene.backgroundNode = Fn(() => {
    const y = screenUV.y;
    const c = vec3(haze.r, haze.g, haze.b).mul(y.mul(0.8).add(0.55));
    const glow = exp(length(screenUV.sub(vec2(0.5, 0.45))).mul(2.6).negate()).mul(0.006);
    return c.add(vec3(0.3, 0.42, 1.0).mul(glow));
  })();

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.08, 420);

  // light: a studio environment plus a blue lamp that rides the lead pulse
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = pmrem.fromScene(buildStudio(), 0.025);
  scene.environment = studio.texture;
  scene.environmentIntensity = 0.9;
  mark('environment');
  await breathe();
  const pulseLamp = new THREE.PointLight(0x6f94ff, 0, 22, 2);
  scene.add(pulseLamp);
  const key = new THREE.DirectionalLight(0xdfe6ff, 1.6);
  key.position.set(-6, 10, 8);
  scene.add(key);

  // geometry
  const mats = makeMaterials();
  const { sheath, bulges } = buildAxon();
  scene.add(new THREE.Mesh(sheath, mats.sheath));
  scene.add(new THREE.Mesh(bulges, mats.node));
  // the naked axon only shows in the node gaps, so it needs far fewer segments than its length suggests
  const core = tube(curve, 520, CORE_R, 6, -D0);
  scene.add(new THREE.Mesh(core.geo, mats.core));
  const arbor = buildArbor();
  scene.add(new THREE.Mesh(arbor.tubes, mats.twig));
  scene.add(new THREE.Mesh(arbor.boutons, mats.bouton));
  mark('geometry');
  await breathe();

  const nDust = tier === 0 ? 1100 : 2400;
  const rd = rng(91);
  const dustPlace = () => {
    const d = -10 + rd() * (L + 60);
    frameAt(d, _p, _t, new THREE.Vector3(), new THREE.Vector3());
    const R = new THREE.Vector3().crossVectors(_t, UP).normalize();
    const U = new THREE.Vector3().crossVectors(R, _t).normalize();
    const a = rd() * Math.PI * 2;
    const r = 1.6 + Math.pow(rd(), 1.7) * 26;
    return _p.clone().addScaledVector(R, Math.cos(a) * r).addScaledVector(U, Math.sin(a) * r * 0.8);
  };
  scene.add(quadField(nDust, dustPlace, false));
  scene.add(quadField(tier === 0 ? 40 : 90, dustPlace, true));
  mark('particles');

  // post: bloom, depth of field, lens fringe, grain, vignette, fade
  const uExposure = uniform(1);
  const uFade = uniform(0);
  const uFocus = uniform(10);
  const uRange = uniform(7);
  const uBokeh = uniform(1.5);
  const uBloom = uniform(0.6);
  const uAberr = uniform(0.14);
  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');
  const viewZ = scenePass.getViewZNode();
  const pipeline = new THREE.RenderPipeline(renderer);
  /** The whole post chain. Rebuilt when the quality ladder drops a pass. */
  function buildOutput(opts) {
    const base = opts.dof ? dof(sceneColor, viewZ, uFocus, uRange, uBokeh) : sceneColor;
    const lit = base.add(bloom(base, 1, 0.34, 1.6).mul(uBloom));
    // r186 does not default a null centre to mid-screen despite its docs, so pass one
    const fringed = opts.fringe ? chromaticAberration(lit, uAberr, vec2(0.5, 0.5), 1.14) : lit;
    const v = length(screenUV.sub(0.5)).mul(1.35);
    const vignette = float(1).sub(smoothstep(0.38, 1.05, v).mul(0.82));
    const graded = fringed.mul(vignette);
    const grained = opts.grain ? film(graded, 0.16) : graded;
    pipeline.outputNode = vec4(grained.rgb.mul(uExposure).mul(uFade).add(vec3(0.8, 0.85, 1).mul(uFlash).mul(0.06)), 1);
    pipeline.needsUpdate = true;
  }
  const post = { dof: tier > 0, fringe: tier > 0, grain: true };
  buildOutput(post);
  mark('post-graph');
  await breathe();

  /* ---- scroll to chapter ---- */
  // the white "limits" section hides the canvas completely, so skip rendering while it does
  const limits = document.getElementById('limits');
  let isCovered = false;
  function updateCovered() {
    if (!limits) return;
    const r = limits.getBoundingClientRect();
    isCovered = r.top <= 0 && r.bottom >= window.innerHeight;
  }
  const secs = ORDER.map((id) => document.getElementById(id));
  const anchors = [];
  function measure() {
    secs.forEach((el, i) => {
      if (!el) { anchors[i] = i === 0 ? 0 : anchors[i - 1] + 1; return; }
      const r = el.getBoundingClientRect();
      anchors[i] = r.top + window.scrollY + r.height / 2;
    });
    updateCovered();
  }
  measure();
  function chapterAtScroll() {
    const s = window.scrollY + window.innerHeight / 2;
    if (s <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (s < anchors[i + 1]) return i + (s - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
    }
    return anchors.length - 1;
  }

  /* ---- state ---- */
  const cur = {};
  KEYS.forEach((k) => { cur[k] = POSES.top[k]; });
  let cs = chapterAtScroll();
  let csTarget = cs;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const ease = (f) => f * f * f * (f * (f * 6 - 15) + 10);
  function blendPose(c) {
    const i = Math.min(ORDER.length - 2, Math.max(0, Math.floor(c)));
    const f = ease(MathU.clamp(c - i, 0, 1));
    const a = POSES[ORDER[i]], b = POSES[ORDER[i + 1]];
    for (const k of KEYS) cur[k] = a[k] + (b[k] - a[k]) * f;
  }

  const P = new THREE.Vector3(), T = new THREE.Vector3(), R = new THREE.Vector3(), U = new THREE.Vector3();
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), prevPos = new THREE.Vector3();
  let camD = 0, speed = 0, intro = 0, spawnIn = 1.2, tNow = 0;
  const libLinks = Array.from(document.querySelectorAll('.libs a'));
  let hoverIdx = -1;

  function placeCamera(dt, introK) {
    const c = cur;
    const e = 1 - introK;
    frameAt(c.d + e * -4, P, T, R, U);
    camPos.copy(P).addScaledVector(R, c.s + e * 1.6).addScaledVector(U, c.u + e * -0.5).addScaledVector(T, c.b + e * -3.2);
    camPos.addScaledVector(R, pointer.sx * 0.45).addScaledVector(U, -pointer.sy * 0.3);
    frameAt(c.d + c.ad, P, T, R, U);
    look.copy(P).addScaledVector(R, c.as + pointer.sx * 0.6).addScaledVector(U, c.au - pointer.sy * 0.35);
    if (hoverIdx >= 0 && arbor.ends[hoverIdx]) look.lerp(arbor.ends[hoverIdx].end, 0.22 * uHoverAmp.value);
    camera.position.copy(camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    const aspect = window.innerWidth / window.innerHeight;
    const k = aspect < 1.25 ? Math.min(2.6, 1.25 / aspect) : 1;
    camera.fov = (2 * Math.atan(Math.tan(MathU.degToRad(c.fov * (1 + e * 0.35)) / 2) * k) * 180) / Math.PI;
    camera.aspect = aspect;
    const w = window.innerWidth, h = window.innerHeight;
    camera.setViewOffset(w, h, -c.sx * w, -c.sy * h, w, h);
    camera.updateProjectionMatrix();
    camD = c.d;
    if (dt > 0) {
      speed += (camPos.distanceTo(prevPos) / dt - speed) * Math.min(1, dt * 4);
      uStreak.value += (MathU.clamp((speed - 9) / 60, 0, 0.9) - uStreak.value) * Math.min(1, dt * 5);
    }
    prevPos.copy(camPos);
    const dist = camPos.distanceTo(look);
    uFocus.value = dist * c.fm;
    uRange.value = Math.max(2.5, dist * 0.55);
    uBokeh.value = c.bk;
    uExposure.value = c.ex * (0.35 + 0.65 * introK);
    uBloom.value = 0.55 + 0.35 * (1 - c.ex) + uFlash.value * 0.9;
  }

  function stepWorld(dt) {
    tNow += dt;
    uTime.value = tNow;
    for (const p of pulses) {
      if (p.a > 0.001) {
        p.pos += p.v * dt;
        if (p.pos > L + 62) p.a *= Math.exp(-dt * 6);
        p.a *= Math.exp(-dt * 0.06);
        if (p.pos > L + 80) p.a = 0;
      }
      p.d.value = p.a > 0.001 ? hop(p.pos) : -999;
      p.amp.value = p.a;
    }
    // the lamp rides the brightest pulse near the camera
    let best = null, bestDist = 1e9;
    for (const p of pulses) {
      if (p.a < 0.05) continue;
      const dd = Math.abs(hop(p.pos) - camD);
      if (dd < bestDist) { bestDist = dd; best = p; }
    }
    if (best) {
      const pd = Math.min(Math.max(hop(best.pos), 0), L + 40);
      frameAt(pd, P, T, R, U);
      pulseLamp.position.copy(P).addScaledVector(U, 1.6).addScaledVector(R, 1.4);
      pulseLamp.color.copy(best.col.value);
      pulseLamp.intensity = 8 * best.a;
    } else pulseLamp.intensity = 0;
    uFlash.value *= Math.exp(-dt * 3.2);
    uHoverAmp.value += ((hoverIdx >= 0 ? 1 : 0) - uHoverAmp.value) * Math.min(1, dt * 7);
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5);
  }

  function spawn(dt) {
    spawnIn -= dt;
    if (spawnIn > 0) return;
    spawnIn = 1.7 + Math.random() * 1.8;
    const from = camD > L - 5 ? L - 26 : Math.max(-4, camD - 15);
    firePulse(from, 15 + Math.random() * 8, Math.random() < 0.2 ? ICE : BLUE, 0.85 + Math.random() * 0.3);
  }

  /* ---- page events ---- */
  window.addEventListener('myelin:pair', (e) => {
    const stale = !!(e.detail && e.detail.stale);
    firePulse(Math.max(-2, camD - 6), stale ? 22 : 30, stale ? RED : ICE, stale ? 1.15 : 1.45);
    if (!stale) uFlash.value = 1;
  });
  window.addEventListener('myelin:fail', () => firePulse(Math.max(-2, camD - 7), 30, RED, 1.1));
  window.addEventListener('myelin:pass', () => {
    uFlash.value = 1;
    [0, 3.5, 7].forEach((o, i) => setTimeout(() => firePulse(Math.max(-2, camD - 9 + o), 34, ICE, 1.5), i * 120));
  });
  window.addEventListener('myelin:copy', () => { uFlash.value = 0.8; firePulse(Math.max(-2, camD - 8), 36, ICE, 1.6); });
  libLinks.forEach((a, i) => {
    const on = () => { hoverIdx = i; uHover.value = i; firePulse(L - 12, 34, ICE, 1.2); };
    const off = () => { if (hoverIdx === i) hoverIdx = -1; };
    a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
    a.addEventListener('pointerleave', off); a.addEventListener('blur', off);
  });

  /* ---- loop ---- */
  const timer = new THREE.Timer();
  timer.connect(document);
  let ready = false, hidden = false;
  window.addEventListener('scroll', updateCovered, { passive: true });

  function frame(dt, wall) {
    csTarget = chapterAtScroll();
    cs += (csTarget - cs) * (reduce ? 1 : 1 - Math.exp(-dt * 3.4));
    blendPose(cs);
    intro = Math.min(1, intro + wall / (reduce ? 0.6 : 3.4));
    const introK = 1 - Math.pow(1 - MathU.clamp(intro, 0, 1), 3);
    uFade.value = MathU.clamp(intro * 2.4, 0, 1);
    if (!reduce) { stepWorld(dt); spawn(dt); } else stepWorld(0);
    placeCamera(dt, introK);
    pipeline.render();
  }

  // Quality ladder: when frames run long, drop the costliest, least visible work first.
  const dropPost = (key) => () => { if (!post[key]) return false; post[key] = false; buildOutput(post); return true; };
  const dropPixels = () => {
    const before = renderer.getPixelRatio();
    ratioScale *= 0.8;
    renderer.setPixelRatio(pixelRatio());
    return renderer.getPixelRatio() < before;            // false once the 0.6 floor is reached
  };
  const LADDER = [dropPost('fringe'), dropPost('dof'), dropPixels, dropPost('grain'), dropPixels];
  let rung = 0, settle = 45, sample = 0, sampled = 0;
  function watchFrameTime(wall) {
    if (tierParam !== null || rung >= LADDER.length) return;
    if (settle > 0) { settle--; return; }              // shader recompiles and resizes hitch; ignore them
    if (wall >= 0.25) return;                           // a stall, not a rate
    sample += wall; sampled++;
    if (sampled < 60) return;
    const avg = sample / sampled;
    sample = 0; sampled = 0;
    if (avg > 0.024) {                                   // slower than ~42 fps
      while (rung < LADDER.length && !LADDER[rung++]()) { /* skip rungs that have nothing left to give */ }
      settle = 45;
    }
  }

  // A 120 or 144 Hz display would otherwise render this slow scene 2 to 2.4 times as often as a 60 Hz one.
  const FRAME_MIN = 0.0095;
  let sinceRender = 0;
  function onTick(ts) {
    timer.update(ts);
    if (hidden) return;
    // the first delta can be slightly negative: rAF stamps predate the timer's start
    sinceRender += Math.max(0, timer.getDelta());
    if (sinceRender < FRAME_MIN) return;
    const wall = Math.min(sinceRender, 0.25);
    sinceRender = 0;
    const dt = Math.min(wall, 0.05);
    if (isCovered) { cs = chapterAtScroll(); return; }
    frame(dt, wall);
    if (!ready) { ready = true; root.classList.add('gl'); mark('first-frame'); }
    watchFrameTime(wall);
  }

  if (reduce) {
    // two held pulses so the still frame has light in it
    firePulse(camD + 4, 0, ICE, 1.1);
    firePulse(camD + 16, 0, BLUE, 0.9);
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(window.innerWidth, window.innerHeight);
      measure();
    }, 120);
  });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(document.body);
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; });

  // pulses already in flight when the first frame appears
  firePulse(14, 0.0001, ICE, 1.05);
  firePulse(33, 0.0001, BLUE, 0.9);
  renderer.setAnimationLoop(onTick);

  if (DEBUG) {
    window.__myelin = {
      renderer, scene, camera, pulses, tier, pipeline, timer, post,
      rebuild(o) { Object.assign(post, o); buildOutput(post); },
      ladder: () => ({ rung, ratioScale: +ratioScale.toFixed(3), ratio: +renderer.getPixelRatio().toFixed(3), post: { ...post }, covered: isCovered }),
      uniforms: { uTime, uHover, uHoverAmp, uStreak, uFlash, uExposure, uFade, uFocus, uRange, uBokeh, uBloom, uAberr },
      /** Render one deterministic frame at chapter c with pulses parked at offsets from the camera. */
      still(c, offsets) {
        renderer.setAnimationLoop(null);
        cs = csTarget = c; intro = 1; uFade.value = 1; tNow = 4.2;
        blendPose(c);
        placeCamera(0, 1);
        (offsets || [5, 17, 36]).forEach((o, i) => { firePulse(Math.max(-1, camD + o), 0.0001, i === 1 ? ICE : BLUE, 1); });
        stepWorld(0);
        pipeline.render();
        return camD;
      },
      /** Screen position in px of terminal i, for checking the hover highlight. */
      project(i) { const v = arbor.ends[i].end.clone().project(camera); return [(v.x * 0.5 + 0.5) * window.innerWidth, (1 - (v.y * 0.5 + 0.5)) * window.innerHeight]; },
      setPose(name, o) { Object.assign(POSES[name], o); },
      hover(i) { hoverIdx = i; uHover.value = i; uHoverAmp.value = i >= 0 ? 1 : 0; },
      streak(v) { uStreak.value = v; }
    };
  }
}

boot().catch((err) => {
  // leave the SVG hero in place
  console.warn('Myelin scene disabled:', err && err.message ? err.message : err);
  root.classList.remove('gl');
});
