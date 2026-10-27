// `myelin derive`: write a ledger from the dependencies a project actually has installed.
//
// Library authors already say, in the type declarations they ship, which APIs are deprecated.
// The tag is `@deprecated` in a JSDoc block, and it describes the exact version in node_modules,
// not the latest release a model remembers. This module reads those tags, works out how code
// reaches each name (a named import, a method call, an object key) and writes bans for them.
//
// The rules are only as good as the tags, and they match by name, not by type. So the
// generator is built to prefer a missed rule over a false alarm:
//   - every rule is gated on the file importing the package (`when`);
//   - a name that is also declared, live, somewhere in the same public surface is narrowed to
//     the one syntax that cannot mean the live thing, or dropped;
//   - ubiquitous names (`map`, `name`, `type`, `then`) are never turned into rules.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import { surface, findPackage, typesNameFor, typesTarget, pkgNameOf } from './surface.mjs';
import { pkgVersion } from './util.mjs';

// ---- which names are too common to match by name --------------------------------------------

const COMMON = new Set();
for (const o of [Object, Function, Array, String, Number, Boolean, Symbol, BigInt, Date, RegExp, Error, Promise, Map, Set, WeakMap, WeakSet, ArrayBuffer, DataView, Uint8Array, URL, URLSearchParams, JSON, Math, Reflect]) {
  for (const n of Object.getOwnPropertyNames(o)) COMMON.add(n);
  if (o.prototype) for (const n of Object.getOwnPropertyNames(o.prototype)) COMMON.add(n);
}
for (const n of `id key name type value data text size mode path port host url uri src href
  options option config props state event error result input output index length count items list label title
  style class className children default then catch finally on off emit once listener handler callback
  args params query body headers status message code user users file files dir url cwd env
  start stop run exec close open read write send get set add remove delete create update find
  parse stringify toJSON next done return throw call apply bind`.split(/\s+/)) COMMON.add(n);

// A name nobody uses for anything else: long, mixed case. Safe to match as a bare identifier.
const distinctive = (n) => n.length >= 8 && /[a-z]/.test(n) && /[A-Z_]/.test(n) && !COMMON.has(n);

const MAX_RIVALS = 16;
const MIN = { method: 3, property: 5, symbol: 3, 'enum-member': 2 };
const NODE_BUILTINS = new Set(builtinModules.filter((m) => !m.startsWith('_')));

// ---- regex building ---------------------------------------------------------------------------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const ID_L = '(?<![\\w$])';
const ID_R = '(?![\\w$])';

/**
 * The guard: the file imports, requires or re-exports one of these module specifiers.
 * With `subpaths`, a specifier also stands for everything below it ("dayjs" covers "dayjs/plugin/utc").
 */
export function importGate(specs, { subpaths = false } = {}) {
  const alt = [...specs].sort().map(esc).join('|');
  return `\\b(?:from|import|require)\\s*\\(?\\s*['"](?:${alt})${subpaths ? "(?:\\/[^'\"]*)?" : ''}['"]`;
}

function importForm(name, specs) {
  const alt = [...specs].sort().map(esc).join('|');
  return `(?:import|export)\\b[^;'"]*?\\{[^}]*?${ID_L}(?<!\\bas\\s+)${esc(name)}${ID_R}[^}]*\\}\\s*from\\s*['"](?:${alt})['"]`;
}

// ---- messages: never copy a package's prose into a model's context ----------------------------

const CODE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?$/;
const SAFE_PKG = /^(?:@[\w.~-]+\/)?[\w.~-]+$/;
const SAFE_VER = /^[\w.+-]{1,32}$/;

/**
 * The replacements a deprecation note points at, as identifiers only. The note is free text from
 * a third party and the result is read by a model, so only code-shaped tokens survive and the
 * sentence around them is ours.
 */
export function suggestions(note, own) {
  const found = [];
  const push = (t) => {
    if (!t) return;
    const tok = t.trim().replace(/^typeof\s+/, '');
    if (CODE.test(tok) && tok.length <= 60 && tok !== own && tok.replace(/\(\)$/, '') !== own && !found.includes(tok)) found.push(tok);
  };
  for (const m of note.matchAll(/\{@link(?:code|plain)?\s+([^\s}]+)/g)) push(m[1]);
  for (const m of note.matchAll(/`([^`\n]{1,60})`/g)) push(m[1]);
  const m = note.match(/\b(?:use|prefer|see|replaced by|replace with|switch to|migrate to)\s+(?:the\s+)?([A-Za-z_$][\w$.]*(?:\(\))?)/i);
  if (m) push(m[1]);
  return found.slice(0, 2);
}

export function messageFor(decl, pkg) {
  const where = pkg && SAFE_PKG.test(pkg.name) && SAFE_VER.test(pkg.version) ? ` in ${pkg.name}@${pkg.version}` : '';
  const recs = suggestions(decl.note, decl.name);
  return `Deprecated${where}.` + (recs.length ? ` Use ${recs.map((r) => '`' + r + '`').join(' or ')} instead.` : '');
}

// ---- reading the project ----------------------------------------------------------------------

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

/** The packages a project can import, with the directory whose declarations describe each. */
export function rootsOf(dir) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) return { error: `no package.json in ${dir}`, roots: [] };
  const names = new Set();
  for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const n of Object.keys(pkg[k] || {})) names.add(n.startsWith('@types/') ? typesTarget(n) : n);
  }
  const roots = [];
  for (const name of [...names].sort()) {
    const own = findPackage(dir, name);
    const types = findPackage(dir, typesNameFor(name));
    if (own) roots.push({ name, dir: own, version: readJson(join(own, 'package.json'))?.version || '' });
    if (types) roots.push({ name, dir: types, version: readJson(join(types, 'package.json'))?.version || '', types: true });
  }
  return { roots };
}

/** A short hash of what is installed, so a stale derived ledger can be noticed without rescanning. */
export function fingerprint(roots) {
  const h = createHash('sha256');
  for (const r of [...roots].sort((a, b) => (a.name + a.types).localeCompare(b.name + b.types))) h.update(`${r.types ? '@types/' : ''}${r.name}@${r.version}\n`);
  return h.digest('hex').slice(0, 12);
}

// ---- the generator ----------------------------------------------------------------------------

const slug = (s) => s.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '_');
const aliasesOf = (m) => (NODE_BUILTINS.has(m) ? [m, 'node:' + m] : [m]);

const emptyCount = () => ({ sym: 0, mem: 0 });
const bump = (map, name, field, by = 1) => {
  const c = map.get(name) || emptyCount();
  c[field] += by;
  map.set(name, c);
};

/** One deprecated declaration per container+name, with every import specifier that exposes it. */
function mergeDeclarations(surf) {
  const merged = new Map();
  let seen = 0;
  for (const [file, gates] of surf.gates) {
    const sc = surf.scans.get(file);
    for (const d of sc.decls) {
      seen++;
      const key = [d.container || '', d.name, d.member].join('|');
      let m = merged.get(key);
      if (!m) merged.set(key, (m = { ...d, specs: new Set(), scopes: new Set(), pkg: sc.pkg }));
      if (d.module) aliasesOf(d.module).forEach((a) => m.specs.add(a));
      else gates.forEach((g) => m.specs.add(g));
      gates.forEach((g) => m.scopes.add(g));
    }
  }
  return { merged, seen };
}

/**
 * How many declarations of a name are still live (not deprecated)?
 *   within(scopes, name)   in the files the given specifiers reach: the declaration's own surface
 *   rivals(name, specs)    which other packages or ambient modules declare a live one
 * Declaration counts come from lines (see dts.declarationCounts) and over-count on purpose.
 */
function liveness(surf) {
  const tally = (files) => {
    const total = new Map();
    const dep = new Map();
    for (const f of files) {
      const sc = surf.scans.get(f);
      for (const [n, c] of sc.counts) {
        bump(total, n, 'sym', c.sym);
        bump(total, n, 'mem', c.mem);
      }
      for (const d of sc.decls) bump(dep, d.name, d.member ? 'mem' : 'sym');
    }
    return { total, dep };
  };
  const liveOf = ({ total, dep }, name) => {
    const t = total.get(name) || emptyCount();
    const x = dep.get(name) || emptyCount();
    return { sym: Math.max(0, t.sym - x.sym), mem: Math.max(0, t.mem - x.mem) };
  };

  const scopeCache = new Map();
  const within = (scopes, name) => {
    const key = [...scopes].sort().join('\n');
    if (!scopeCache.has(key)) {
      const files = new Set();
      for (const g of scopes) for (const f of surf.scope.get(g) || []) files.add(f);
      scopeCache.set(key, tally(files));
    }
    return liveOf(scopeCache.get(key), name);
  };

  // Files grouped by the package (or ambient module) a user imports them as.
  const byPackage = new Map();
  for (const [file, gates] of surf.gates) {
    const sc = surf.scans.get(file);
    const keys = sc.modules.length ? sc.modules.flatMap(aliasesOf) : [...gates].map(pkgNameOf);
    for (const k of keys) {
      if (!byPackage.has(k)) byPackage.set(k, new Set());
      byPackage.get(k).add(file);
    }
  }
  const tallies = new Map([...byPackage].map(([k, files]) => [k, tally(files)]));
  const rivals = (name, specs) => {
    const mine = new Set([...specs].map(pkgNameOf));
    const out = new Set();
    for (const [k, t] of tallies) {
      if (mine.has(k)) continue;
      const o = liveOf(t, name);
      if (o.sym + o.mem) out.add(k);
    }
    return out;
  };
  return { within, rivals };
}

// The shape of the regex a declaration gets, or the reason it gets none.
function shapeOf(d, family, rival) {
  const name = esc(d.name);
  const bare = distinctive(d.name);
  if (family === 'enum-member') return rival.mem ? { why: 'another enum member has this name' } : { re: `${ID_L}${esc(d.container)}\\.${name}${ID_R}` };
  if (family === 'symbol') {
    if (rival.sym) return { why: `${rival.sym} live export(s) share this name` };
    if (bare && !rival.mem) return { re: `${ID_L}${name}${ID_R}` };
    const imp = importForm(d.name, d.specs);
    return { re: rival.mem ? imp : `${imp}|\\.${name}${d.kind === 'function' ? '\\s*\\(' : ID_R}` };
  }
  if (rival.mem) return { why: `${rival.mem} live member(s) share this name` };
  if (bare && !rival.sym) return { re: `${ID_L}${name}${ID_R}` };
  // `z.email()` is live and `z.string().email()` is deprecated: only a call on a call result can be the latter.
  if (family === 'method') return { re: rival.sym ? `\\)\\s*\\??\\.${name}\\s*\\(` : `\\.${name}\\s*\\(` };
  if (rival.sym) return { why: 'a live export shares this property name' };
  return { re: `\\.${name}${ID_R}|(?<=[{,]\\s*)${name}\\s*:` };
}

/**
 * Derive rules for a project. Returns the ledger text and what happened along the way.
 *   dir        project directory (needs package.json and an installed node_modules)
 *   only       optional list of package names to restrict to
 */
export function derive(dir, { only = null } = {}) {
  const { roots: all, error } = rootsOf(dir);
  if (error) return { error };
  const roots = only ? all.filter((r) => only.includes(r.name)) : all;
  if (!roots.length) return { error: all.length ? 'none of those packages are installed' : 'no dependencies are installed here (run your package manager first)' };

  const surf = surface(roots);
  const { merged, seen } = mergeDeclarations(surf);
  const live = liveness(surf);
  const stats = { files: surf.gates.size, decls: seen, rules: 0, merged: 0, skipped: { common: 0, short: 0, ambiguous: 0, unusable: 0 }, skips: [], packages: new Map() };
  const skip = (d, reason, detail) => {
    stats.skipped[reason]++;
    stats.skips.push({ name: d.container ? `${d.container}.${d.name}` : d.name, reason, detail });
  };

  const rules = [];
  const ids = new Set();
  const order = (d) => d.pkg.name + (d.container || '') + d.name;
  for (const d of [...merged.values()].sort((a, b) => order(a).localeCompare(order(b)))) {
    const name = d.name;
    if (!/^[A-Za-z_$][\w$]*$/.test(name) || name.startsWith('_')) { skip(d, 'unusable', 'internal or not an identifier'); continue; } // `_x` is internal by convention
    const family = d.kind === 'enum-member' ? 'enum-member' : d.member ? (d.kind === 'method' ? 'method' : 'property') : 'symbol';
    if (family === 'enum-member' && !d.container) { skip(d, 'unusable', 'enum member without an enum'); continue; }
    if (family !== 'enum-member' && COMMON.has(name)) { skip(d, 'common', 'too common a name to match'); continue; }
    if (name.length < MIN[family]) { skip(d, 'short', `shorter than ${MIN[family]} characters`); continue; }

    // A live declaration of the same name in this surface makes the name ambiguous outright. One
    // in another installed package only matters in a file that imports both, so it becomes an
    // `unless` guard instead of costing the rule.
    const shape = shapeOf(d, family, live.within(d.scopes, name));
    if (!shape.re) { skip(d, 'ambiguous', shape.why); continue; }
    const others = distinctive(name) ? new Set() : live.rivals(name, d.specs);
    if (others.size > MAX_RIVALS) { skip(d, 'ambiguous', `${others.size} other packages declare this name`); continue; }

    const owner = d.module || (d.pkg.name.startsWith('@types/') ? typesTarget(d.pkg.name) : d.pkg.name);
    let id = [slug(owner.replace(/^node:/, '')), d.container && slug(d.container), slug(name)].filter(Boolean).join('-');
    for (let n = 2; ids.has(id); n++) id = id.replace(/-\d+$/, '') + '-' + n;
    ids.add(id);
    rules.push({
      id,
      re: shape.re,
      when: importGate(d.specs),
      unless: others.size ? importGate(others, { subpaths: true }) : null,
      message: messageFor(d, d.pkg),
      specs: [...d.specs].sort(),
      pkg: d.pkg,
    });
  }

  // The same property on five interfaces is one rule, not five.
  const byShape = new Map();
  for (const r of rules) {
    const key = [r.re, r.when, r.unless].join('\0');
    const prior = byShape.get(key);
    if (!prior) byShape.set(key, r);
    else if (/ Use /.test(r.message) && !/ Use /.test(prior.message)) byShape.set(key, { ...r, id: prior.id });
  }
  const unique = [...byShape.values()].sort((a, b) => a.id.localeCompare(b.id));
  stats.rules = unique.length;
  stats.merged = rules.length - unique.length;
  for (const r of unique) {
    const ps = stats.packages.get(r.pkg.name) || { version: r.pkg.version, rules: 0 };
    ps.rules++;
    stats.packages.set(r.pkg.name, ps);
  }

  const lines = [
    'myelin 1.1',
    'id      derived',
    "about   Deprecated APIs in this project's installed dependencies, read from their type declarations",
    `fires   ${[...new Set(roots.map((r) => r.name))].slice(0, 40).join(' | ')}`,
    'comments skip',
    'status  DERIVED, not curated. Each rule comes from a @deprecated tag in a package installed here and matches by name in files that import it. Expect misses and the odd false alarm.',
    '',
    `= generator    myelin derive ${pkgVersion()}`,
    `= fingerprint  ${fingerprint(roots)}`,
    ...roots.map((r) => `= package      ${r.types ? '@types/' : ''}${r.name} ${r.version || 'unknown'}`),
  ];
  let group = null;
  for (const r of unique) {
    const g = r.id.split('-')[0];
    if (g !== group) lines.push('', `# ${g}`);
    group = g;
    lines.push(`! ${r.id} /${r.re}/ when /${r.when}/${r.unless ? ` unless /${r.unless}/` : ''} ${r.message}`);
  }
  return { text: lines.join('\n') + '\n', rules: unique, stats, roots, notes: surf.notes };
}

export const DERIVED_FILE = join('.myelin', 'derived.myelin');
export const derivedPath = (dir) => join(dir, DERIVED_FILE);
export const hasDerived = (dir) => existsSync(derivedPath(dir));
