// Which declaration files make up a package's public surface, and under which import specifier.
//
// `import { x } from "zod"` and `import { x } from "zod/v3"` reach different files of the same
// package, and a deprecation in one says nothing about the other. So derivation does not scan a
// package directory. It starts at the entry files the package advertises (`exports`, `types`),
// follows re-exports, and remembers the specifier ("gate") each file was reached through.
import { existsSync, readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { deprecations, edges, declarationCounts, modules } from './dts.mjs';

const MAX_FILE_BYTES = 6_000_000;
const MAX_VISITS_PER_ROOT = 40_000;
const MAX_PACKAGE_HOPS = 4;
const DTS = /\.d\.[mc]?ts$/;

export const pkgNameOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
export const subOf = (spec) => spec.slice(pkgNameOf(spec).length);

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

/** The installed directory of a package, found the way Node finds it, or null. */
export function findPackage(fromDir, name) {
  for (let d = resolve(fromDir); ; d = dirname(d)) {
    const p = join(d, 'node_modules', name);
    if (isFile(join(p, 'package.json'))) {
      try {
        return realpathSync(p);
      } catch {
        return p;
      }
    }
    if (dirname(d) === d) return null;
  }
}

/** `@types/babel__core` describes `@babel/core`; `@types/react` describes `react`. */
export const typesTarget = (typesName) => {
  const rest = typesName.slice('@types/'.length);
  return rest.includes('__') ? '@' + rest.replace('__', '/') : rest;
};
export const typesNameFor = (name) => '@types/' + (name.startsWith('@') ? name.slice(1).replace('/', '__') : name);

// A path from package.json ("./dist/index.js" or "./index.d.ts") to the declaration files it implies.
function declarationsFor(dir, rel) {
  if (typeof rel !== 'string' || !rel.startsWith('.')) return [];
  const abs = resolve(dir, rel);
  if (DTS.test(abs)) return isFile(abs) ? [abs] : [];
  const base = abs.replace(/\.[mc]?[jt]sx?$/, '');
  const order = /\.mjs$/.test(abs) ? ['.d.mts', '.d.ts'] : /\.cjs$/.test(abs) ? ['.d.cts', '.d.ts'] : ['.d.ts', '.d.mts', '.d.cts'];
  for (const e of order) if (isFile(base + e)) return [base + e];
  return [];
}

const leaves = (v, out = []) => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => leaves(x, out));
  return out;
};

/**
 * The entry declaration files of a package, by subpath ('' for the root, '/client' for pkg/client).
 * Wildcard exports are skipped: a pattern names no single file.
 */
export function entryFiles(dir) {
  const pkg = readJson(join(dir, 'package.json')) || {};
  const map = new Map();
  const add = (sub, files) => {
    if (files.length) map.set(sub, [...new Set([...(map.get(sub) || []), ...files])]);
  };
  const ex = pkg.exports;
  if (ex !== undefined && ex !== null) {
    const keys = typeof ex === 'object' && !Array.isArray(ex) ? Object.keys(ex) : [];
    if (!keys.length || !keys.every((k) => k.startsWith('.'))) add('', leaves(ex).flatMap((s) => declarationsFor(dir, s)));
    else
      for (const k of keys) {
        if (k.includes('*')) continue;
        add(k === '.' ? '' : k.slice(1), leaves(ex[k]).flatMap((s) => declarationsFor(dir, s)));
      }
  }
  for (const t of [pkg.types, pkg.typings]) add('', declarationsFor(dir, t));
  if (!map.has('')) for (const c of ['index.d.ts', 'index.d.mts', 'index.d.cts']) if (isFile(join(dir, c))) { add('', [join(dir, c)]); break; }
  if (ex === undefined || ex === null) {
    // Before `exports`, every file was importable by its path. Cover the shallow, common cases.
    let names = [];
    try {
      names = readdirSync(dir);
    } catch {}
    for (const n of names.sort()) {
      if (n === 'node_modules' || n.startsWith('.') || /^ts\d/.test(n)) continue;
      const p = join(dir, n);
      if (DTS.test(n) && !/^index\.d\./.test(n)) add('/' + n.replace(DTS, ''), [p]);
      else if (!n.includes('.') && isFile(join(p, 'index.d.ts'))) add('/' + n, [join(p, 'index.d.ts')]);
    }
  }
  return map;
}

// "./core/api-promise.js" imported from /p/index.d.mts is /p/core/api-promise.d.mts.
function resolveRelative(importer, spec) {
  const abs = resolve(dirname(importer), spec);
  if (DTS.test(abs) && isFile(abs)) return abs;
  const base = abs.replace(/\.[mc]?[jt]sx?$/, '');
  const pref = /\.d\.mts$/.test(importer) ? ['.d.mts', '.d.ts', '.d.cts'] : /\.d\.cts$/.test(importer) ? ['.d.cts', '.d.ts', '.d.mts'] : ['.d.ts', '.d.mts', '.d.cts'];
  for (const e of pref) if (isFile(base + e)) return base + e;
  for (const e of pref) if (isFile(join(abs, 'index' + e))) return join(abs, 'index' + e);
  return null;
}

/**
 * Walk the declaration files reachable from the given roots.
 *   roots: [{ name, dir }]  a package name as users import it, and where its types are installed
 * Returns
 *   gates   Map<file, Set<specifier>>   the import specifiers that make each file public
 *   scope   Map<specifier, Set<file>>   every file a specifier reaches
 *   scans   Map<file, { decls, counts, pkg }>
 */
export function surface(roots, { cache = new Map() } = {}) {
  const gates = new Map();
  const scope = new Map();
  const seen = new Set();
  const pkgCache = new Map();
  const notes = { skippedLarge: 0, truncated: [] };
  const resolved = new Map();
  const resolveCached = (file, spec) => {
    const k = file + '\0' + spec;
    if (!resolved.has(k)) resolved.set(k, resolveRelative(file, spec));
    return resolved.get(k);
  };
  const packages = new Map();
  const packageEntries = (dir) => {
    if (!packages.has(dir)) packages.set(dir, entryFiles(dir));
    return packages.get(dir);
  };
  let visits = 0;
  let budgetHit = false;

  const pkgOf = (file) => {
    for (let d = dirname(file); ; d = dirname(d)) {
      if (pkgCache.has(d)) return pkgCache.get(d);
      const j = readJson(join(d, 'package.json'));
      if (j && j.name) {
        const info = { name: String(j.name), version: String(j.version || '') };
        pkgCache.set(d, info);
        return info;
      }
      if (dirname(d) === d) return { name: basename(dirname(file)), version: '' };
    }
  };

  const scan = (file) => {
    if (cache.has(file)) return cache.get(file);
    let result = null;
    try {
      if (statSync(file).size > MAX_FILE_BYTES) notes.skippedLarge++;
      else {
        const text = readFileSync(file, 'utf8');
        result = { decls: deprecations(text), edges: edges(text), counts: declarationCounts(text), modules: modules(text), pkg: pkgOf(file) };
      }
    } catch {}
    cache.set(file, result);
    return result;
  };

  const visit = (file, gate, hops) => {
    const key = file + '\0' + gate;
    if (seen.has(key)) return;
    if (++visits > MAX_VISITS_PER_ROOT) {
      budgetHit = true;
      return;
    }
    seen.add(key);
    const s = scan(file);
    if (!s) return;
    if (!gates.has(file)) gates.set(file, new Set());
    gates.get(file).add(gate);
    if (!scope.has(gate)) scope.set(gate, new Set());
    scope.get(gate).add(file);
    for (const rel of s.edges.relative) {
      const next = resolveCached(file, rel);
      if (next) visit(next, gate, hops);
    }
    if (hops >= MAX_PACKAGE_HOPS) return;
    for (const spec of s.edges.bare) {
      const dir = findPackage(dirname(file), pkgNameOf(spec));
      if (!dir) continue;
      const entries = packageEntries(dir).get(subOf(spec)) || [];
      for (const e of entries) visit(e, gate, hops + 1);
    }
  };

  for (const { name, dir } of roots) {
    visits = 0;
    budgetHit = false;
    for (const [sub, files] of packageEntries(dir)) for (const f of files) visit(f, name + sub, 0);
    if (budgetHit) notes.truncated.push(name);
  }
  return { gates, scope, scans: cache, notes };
}
