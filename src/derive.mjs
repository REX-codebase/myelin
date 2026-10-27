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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import { surface, findPackage, typesNameFor, typesTarget, pkgNameOf, SAFE_SPEC } from './surface.mjs';
import { pkgVersion, cmp } from './util.mjs';
import { parse } from './parse.mjs';

// ---- which names are too common to match by name --------------------------------------------

// Names that belong to the language or its standard objects (`map`, `then`, `toString`): never a rule.
const BUILTIN = new Set();
for (const o of [Object, Function, Array, String, Number, Boolean, Symbol, BigInt, Date, RegExp, Error, Promise, Map, Set, WeakMap, WeakSet, ArrayBuffer, DataView, Uint8Array, URL, URLSearchParams, JSON, Math, Reflect]) {
  for (const n of Object.getOwnPropertyNames(o)) BUILTIN.add(n);
  if (o.prototype) for (const n of Object.getOwnPropertyNames(o.prototype)) BUILTIN.add(n);
}
for (const n of 'addEventListener removeEventListener dispatchEvent on off emit once'.split(' ')) BUILTIN.add(n);
// Reserved and contextual keywords: `async` is a real rxjs export, and a rule on it would fire on every async function.
for (const n of `async await break case catch class const continue debugger default delete do else enum export extends false finally
  for function if implements import in instanceof interface let new null package private protected public return static super
  switch this throw true try typeof var void while with yield of from as type declare namespace module abstract readonly
  require exports undefined NaN Infinity globalThis window document console process`.split(/\s+/)) BUILTIN.add(n);
// Words every codebase uses for its own things (`name`, `data`, `run`). Matching one as a bare
// property or call would fire on the project's own code, so only a call on a call result may use it.
const GENERIC = new Set(`id key name type value data text size mode path port host url uri src href
  options option config props state event error result input output index length count items list label title
  style class className children default listener handler callback args params query body headers status
  message code user users file files dir cwd env start stop run exec close open read write send get set add
  remove delete create update find parse stringify next done return throw call apply bind`.split(/\s+/));
// A plain lowercase word (`resolution`, `page`, `copy`, `empty`). Everyone names things with these, so
// without type information a match on one says very little.
const wordlike = (n) => /^[a-z]+$/.test(n);

const MAX_RIVALS = 16;
const MIN = { method: 3, property: 5, symbol: 3, 'enum-member': 2 };
const NODE_BUILTINS = new Set(builtinModules.filter((m) => !m.startsWith('_')));

// ---- regex building ---------------------------------------------------------------------------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const ID_L = '(?<![\\w$])';
const ID_R = '(?![\\w$])';

/**
 * The guard: the file imports, requires or re-exports one of these module specifiers.
 * `prefixes` also match everything below them ("dayjs" covers "dayjs/plugin/utc").
 */
export function importGate(specs, prefixes = []) {
  const alt = [...[...specs].sort().map(esc), ...[...prefixes].sort().map((p) => esc(p) + "(?:\\/[^'\"]*)?")].join('|');
  return `\\b(?:from|import|require)\\s*\\(?\\s*['"](?:${alt})['"]`;
}

// Every pattern below starts with the literal name and checks its surroundings afterwards with
// bounded look-arounds. That keeps the work proportional to how often the name occurs, however
// hostile the file (an unterminated `export { a, b,` repeated 5,000 times used to take minutes),
// and puts the reported line on the name itself, not on the first line of a multi-line import.
const NOT_PART_OF_WORD = (n) => `(?![\\w$])(?<![\\w$]${n})`;

function importForm(name, specs) {
  const n = esc(name);
  const alt = [...specs].sort().map(esc).join('|');
  return `${n}${NOT_PART_OF_WORD(n)}(?<!\\bas\\s+${n})(?<=(?:import|export)\\b[^;'"]{0,200}?\\{[^}]{0,4000}?${n})(?=[^}]{0,4000}\\}\\s*from\\s*['"](?:${alt})['"])`;
}

// ---- messages: never copy a package's prose into a model's context ----------------------------

const CODE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:<[\w$., ]{1,30}>)?(?:\([\w$., ]{0,30}\))?$/;
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
    if (CODE.test(tok) && tok.length <= 60 && tok.replace(/[(<].*$/, '') !== own && !found.includes(tok)) found.push(tok);
  };
  // "Use `x` from `pkg` instead": the replacement is the same name, imported from somewhere else.
  const from = note.match(/\bfrom\s+[`'"]((?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+){0,3})[`'"]/);
  if (from) return { names: [], module: from[1] };
  for (const m of note.matchAll(/\{@link(?:code|plain)?\s+([^\s}]+)/g)) push(m[1]);
  for (const m of note.matchAll(/`([^`\n]{1,60})`/g)) push(m[1]);
  const m = note.match(/\b(?:use|prefer|see|replaced by|replace with|switch to|migrate to)\s+(?:the\s+)?([A-Za-z_$][\w$.]*(?:<[\w$., ]{1,30}>)?(?:\([\w$., ]{0,30}\))?)/i);
  if (m) push(m[1]);
  // A note often lists alternatives for different situations ("ChangeEvent, InputEvent, SubmitEvent, or
  // SyntheticEvent depending on the event type"). Cutting the list short can drop the one that applies.
  return { names: found.slice(0, 4), module: null };
}

/** How a deprecated API is written in code: `ZodString.email()`, `React.LegacyRef`, `fs.exists()`. */
export function labelFor(decl) {
  const lead = decl.container || decl.module || '';
  const callable = decl.kind === 'method' || decl.kind === 'function';
  return (lead ? lead + '.' : '') + decl.name + (callable ? '()' : '');
}

/**
 * The sentence for a deprecated API. `known` is every name the scanned declarations declare: a
 * replacement the note points at is kept only if it is a real API of these packages, which drops
 * prose that happens to sit in backticks and leaves a hostile note almost nothing to say.
 */
export function messageFor(decl, pkg, known = null) {
  const where = pkg && SAFE_PKG.test(pkg.name) && SAFE_VER.test(pkg.version) ? ` in ${pkg.name}@${pkg.version}` : '';
  const found = suggestions(decl.note, decl.name);
  const real = (tok) => !known || known.has(tok.replace(/[(<].*$/, '').split('.').pop());
  const names = found.names.filter(real);
  const module = found.module && (!known || known.has('\0module:' + pkgNameOf(found.module))) ? found.module : null;
  const quoted = names.map((r) => '`' + r + '`');
  const advice = module
    ? ` Import it from \`${module}\` instead.`
    : quoted.length === 1
      ? ` Use ${quoted[0]} instead.`
      : quoted.length
        ? ` Use one of ${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]} instead.`
        : '';
  return `\`${labelFor(decl)}\` is deprecated${where}.${advice}`;
}

// ---- reading the project ----------------------------------------------------------------------

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// Workspace members of a monorepo root: npm and yarn list them in package.json, pnpm in pnpm-workspace.yaml.
// Only plain `dir` and `dir/*` patterns are understood; anything cleverer is skipped, not guessed at.
function workspaceManifests(dir, pkg) {
  let patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : Array.isArray(pkg.workspaces?.packages) ? pkg.workspaces.packages : [];
  try {
    const yaml = readFileSync(join(dir, 'pnpm-workspace.yaml'), 'utf8');
    const block = yaml.split(/^packages\s*:\s*$/m)[1] || '';
    for (const line of block.split('\n')) {
      if (/^\S/.test(line) && line.trim()) break;
      const m = line.match(/^\s*-\s*['"]?([^'"#\s]+)['"]?/);
      if (m) patterns.push(m[1]);
    }
  } catch {}
  const dirs = [];
  for (const p of patterns) {
    if (typeof p !== 'string' || p.startsWith('!') || p.includes('**') || p.includes('..')) continue;
    if (p.endsWith('/*') && !p.slice(0, -2).includes('*')) {
      try {
        for (const e of readdirSync(join(dir, p.slice(0, -2)), { withFileTypes: true })) if (e.isDirectory()) dirs.push(join(dir, p.slice(0, -2), e.name));
      } catch {}
    } else if (!p.includes('*')) dirs.push(join(dir, p));
  }
  return dirs.map((d) => readJson(join(d, 'package.json'))).filter(Boolean);
}

/** The packages a project can import, with the directory whose declarations describe each. */
export function rootsOf(dir) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) return { error: `no package.json in ${dir}`, roots: [] };
  const names = new Set();
  for (const m of [pkg, ...workspaceManifests(dir, pkg)]) {
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const n of Object.keys(m[k] || {})) names.add(n.startsWith('@types/') ? typesTarget(n) : n);
    }
  }
  const roots = [];
  for (const name of [...names].sort(cmp)) {
    if (!SAFE_PKG.test(name)) continue;
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
  for (const r of [...roots].sort((a, b) => cmp(a.name + a.types, b.name + b.types))) h.update(`${r.types ? '@types/' : ''}${r.name}@${r.version}\n`);
  return h.digest('hex').slice(0, 12);
}

// ---- the generator ----------------------------------------------------------------------------

const slug = (s) => s.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '_');
const aliasesOf = (m) => (NODE_BUILTINS.has(m) ? [m, 'node:' + m] : [m]);

const emptyCount = () => ({ sym: 0, fn: 0, prop: 0 });
const bump = (map, name, field, by = 1) => {
  const c = map.get(name) || emptyCount();
  c[field] += by;
  map.set(name, c);
};

/** One deprecated declaration per container+name, with every import specifier that exposes it. */
function mergeDeclarations(surf) {
  const merged = new Map();
  for (const [file, gates] of surf.gates) {
    const sc = surf.scans.get(file);
    for (const d of sc.decls) {
      const key = [d.container || '', d.name, d.member].join('|');
      if (d.module && !SAFE_SPEC.test(d.module)) continue;
      let m = merged.get(key);
      if (!m) merged.set(key, (m = { ...d, specs: new Set(), scopes: new Set(), pkg: sc.pkg }));
      if (d.module) aliasesOf(d.module).forEach((a) => m.specs.add(a));
      else gates.forEach((g) => m.specs.add(g));
      gates.forEach((g) => m.scopes.add(g));
    }
  }
  return { merged };
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
        bump(total, n, 'fn', c.fn);
        bump(total, n, 'prop', c.prop);
      }
      for (const d of sc.decls) bump(dep, d.name, !d.member ? 'sym' : d.kind === 'method' ? 'fn' : 'prop');
    }
    return { total, dep };
  };
  const liveOf = ({ total, dep }, name) => {
    const t = total.get(name) || emptyCount();
    const x = dep.get(name) || emptyCount();
    const live = { sym: Math.max(0, t.sym - x.sym), fn: Math.max(0, t.fn - x.fn), prop: Math.max(0, t.prop - x.prop) };
    live.mem = live.fn + live.prop;
    return live;
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
  // `callable` limits the search to things a `.name(` could be: a property of the same name is no rival.
  const rivals = (name, specs, callable) => {
    const mine = new Set([...specs].map(pkgNameOf));
    const out = new Set();
    for (const [k, t] of tallies) {
      if (mine.has(k)) continue;
      const o = liveOf(t, name);
      if (callable ? o.sym + o.fn : o.sym + o.mem) out.add(k);
    }
    return out;
  };
  // The same name, live, on another subpath of the same package: `ai` against `ai/test`,
  // `zod` against `zod/v3`. A file that imports both cannot tell which one a bare name means.
  const gateTallies = new Map();
  const siblings = (name, ownGates, callable) => {
    const mine = new Set([...ownGates].map(pkgNameOf));
    const out = new Set();
    for (const g of surf.scope.keys()) {
      if (ownGates.has(g) || !mine.has(pkgNameOf(g))) continue;
      if (!gateTallies.has(g)) gateTallies.set(g, tally(surf.scope.get(g)));
      const o = liveOf(gateTallies.get(g), name);
      if (callable ? o.sym + o.fn : o.sym + o.mem) out.add(g);
    }
    return out;
  };
  return { within, rivals, siblings };
}

// The shape of the regex a declaration gets, or the reason it gets none. There is never a bare
// identifier match: a local variable called `rangeFog` is not the deprecated TSL function.
//   import     `import { Name } from "pkg"`: exact, and the only form for a name with a rival
//   access     `.Name`, `.name(`: a property or method reached through some object
//   chained    `).name(`: a call on a call result, the one place `z.string().email()` differs from `z.email()`
//   binding    `{ Name`: a destructured or object-literal key
//   jsx        `<Tag Name=...>`: a prop on a JSX element
function shapeOf(d, family, rival, exactOnly = false) {
  const name = esc(d.name);
  const plain = wordlike(d.name);
  if (family === 'enum-member') return rival.mem ? { why: 'another enum member has this name' } : { re: `${ID_L}${esc(d.container)}\\.${name}${ID_R}` };
  if (family === 'symbol') {
    if (rival.sym) return { why: `${rival.sym} live export(s) share this name` };
    const imp = importForm(d.name, d.specs);
    if (exactOnly || rival.mem) return { re: imp };
    if (plain && d.kind !== 'function') return { re: imp }; // `.copy` could be anything; the import cannot
    return { re: `${imp}|\\.${name}${d.kind === 'function' ? '\\s*\\(' : ID_R}` };
  }
  if (family === 'method') {
    const clash = rival.fn;
    if (clash) return { why: `${clash} live method(s) share this name` };
    // `z.email()` is live and `z.string().email()` is deprecated: only a call on a call result can be the latter.
    return { re: rival.sym || plain || GENERIC.has(d.name) ? `\\)\\s*\\??\\.${name}\\s*\\(` : `\\.${name}\\s*\\(` };
  }
  if (rival.mem) return { why: `${rival.mem} live member(s) share this name` };
  if (rival.sym) return { why: 'a live export shares this property name' };
  if (plain || GENERIC.has(d.name)) return { why: 'a plain word is too common a property name to match without types' };
  const binding = `${name}${NOT_PART_OF_WORD(name)}(?<![\\w$.]${name})(?<!\\b(?:const|let|var|function|class|type|interface|enum)\\s+${name})(?=\\s*[,}:=])(?<=\\{[^{};()]{0,300}?${name})`;
  const jsx = `${name}${NOT_PART_OF_WORD(name)}(?=\\s*(?:=|\\/?>|\\s))(?<=<[A-Za-z][\\w.]{0,60}(?:[^<>{}]|\\{(?:[^{}]|\\{[^{}]{0,200}\\}){0,200}\\}){0,300}?\\s${name})`;
  return { re: `\\.${name}${ID_R}|${binding}|${jsx}` };
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
  if (!roots.length) return { error: all.length ? 'none of those packages are installed' : `no dependencies are installed here (run your package manager first${existsSync(join(dir, '.pnp.cjs')) ? "; Yarn Plug'n'Play keeps no node_modules, so set nodeLinker: node-modules" : ''})` };

  const surf = surface(roots);
  const { merged } = mergeDeclarations(surf);
  const live = liveness(surf);
  const rootNames = new Set(roots.map((r) => r.name));
  // Every name these declarations declare, and every package they can be imported as.
  const known = new Set();
  for (const sc of surf.scans.values()) if (sc) for (const n of sc.counts.keys()) known.add(n);
  for (const g of surf.scope.keys()) known.add('\0module:' + pkgNameOf(g));
  for (const n of rootNames) known.add('\0module:' + n);
  const stats = { files: surf.gates.size, decls: merged.size, rules: 0, merged: 0, skipped: { common: 0, short: 0, ambiguous: 0, unusable: 0 }, skips: [], packages: new Map() };
  const skip = (d, reason, detail) => {
    stats.skipped[reason]++;
    stats.skips.push({ name: d.container ? `${d.container}.${d.name}` : d.name, reason, detail });
  };

  const rules = [];
  const ids = new Set();
  const order = (d) => d.pkg.name + (d.container || '') + d.name;
  for (const d of [...merged.values()].sort((a, b) => cmp(order(a), order(b)))) {
    const name = d.name;
    if (!/^[A-Za-z_$][\w$]*$/.test(name) || name.startsWith('_')) { skip(d, 'unusable', 'internal or not an identifier'); continue; } // `_x` is internal by convention
    const family = d.kind === 'enum-member' ? 'enum-member' : d.member ? (d.kind === 'method' ? 'method' : 'property') : 'symbol';
    if (family === 'enum-member' && !d.container) { skip(d, 'unusable', 'enum member without an enum'); continue; }
    if (family !== 'enum-member' && BUILTIN.has(name)) { skip(d, 'common', 'a name the language itself uses'); continue; }
    if (family === 'property' && GENERIC.has(name)) { skip(d, 'common', 'too common a property name to match safely'); continue; }
    if (name.length < MIN[family]) { skip(d, 'short', `shorter than ${MIN[family]} characters`); continue; }

    // A live declaration of the same name in this surface makes the name ambiguous outright. One
    // in another installed package only matters in a file that imports both, so it becomes an
    // `unless` guard instead of costing the rule.
    const sibs = d.module ? new Set() : live.siblings(name, d.scopes, family === 'method');
    const shape = shapeOf(d, family, live.within(d.scopes, name), family === 'symbol' && sibs.size > 0);
    if (!shape.re) { skip(d, 'ambiguous', shape.why); continue; }
    const others = live.rivals(name, d.specs, family === 'method');
    if (others.size > MAX_RIVALS) { skip(d, 'ambiguous', `${others.size} other packages declare this name`); continue; }
    // A symbol with a live twin on a sibling subpath is matched by its import statement alone (exact).
    // A member cannot be told apart by syntax, so a file importing the sibling is left alone.
    const stepAside = family === 'symbol' ? [] : [...sibs];

    const declared = d.module || (d.pkg.name.startsWith('@types/') ? typesTarget(d.pkg.name) : d.pkg.name);
    const owner = rootNames.has(declared) || d.module ? declared : pkgNameOf([...d.specs].sort()[0]);
    let id = [slug(owner.replace(/^node:/, '')), d.container && slug(d.container), slug(name)].filter(Boolean).join('-');
    for (let n = 2; ids.has(id); n++) id = id.replace(/-\d+$/, '') + '-' + n;
    ids.add(id);
    rules.push({
      id,
      re: shape.re,
      when: importGate(d.specs),
      unless: others.size || stepAside.length ? importGate(stepAside, others) : null,
      message: messageFor(d, d.pkg, known),
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
    else if (/ (?:Use|Import it from) /.test(r.message) && !/ (?:Use|Import it from) /.test(prior.message)) byShape.set(key, { ...r, id: prior.id });
  }
  const unique = [...byShape.values()].sort((a, b) => cmp(a.id, b.id));
  stats.rules = unique.length;
  stats.merged = rules.length - unique.length;
  for (const r of unique) {
    const ps = stats.packages.get(r.pkg.name) || { version: r.pkg.version, rules: 0 };
    ps.rules++;
    stats.packages.set(r.pkg.name, ps);
  }

  const head = [
    'myelin 1.1',
    'id      derived',
    "about   Deprecated APIs in this project's installed dependencies, read from their type declarations",
    `fires   ${[...new Set(roots.map((r) => r.name))].filter((n) => SAFE_PKG.test(n)).slice(0, 40).join(' | ')}`,
    'comments skip',
    'render  brief',
    'status  DERIVED, not curated. Each rule comes from a @deprecated tag in a package installed here and matches by name in files that import it. Expect misses and the odd false alarm.',
    '',
    `= generator    myelin derive ${pkgVersion()}`,
    `= fingerprint  ${fingerprint(roots)}`,
    ...roots.map((r) => `= package      ${r.types ? '@types/' : ''}${r.name} ${SAFE_VER.test(r.version) ? r.version : 'unknown'}`),
  ];
  const ruleLine = (r) => `! ${r.id} /${r.re}/ when /${r.when}/${r.unless ? ` unless /${r.unless}/` : ''} ${r.message}`;
  const render = (list) => {
    const lines = [...head];
    let group = null;
    for (const r of list) {
      const g = r.id.split('-')[0];
      if (g !== group) lines.push('', `# ${g}`);
      group = g;
      lines.push(ruleLine(r));
    }
    return lines.join('\n') + '\n';
  };

  // A generator must never write a ledger that does not parse. Anything that fails is dropped and counted.
  // A rule line must be one line. Nothing above should be able to break that; this makes sure.
  const oneLine = (r) => !/[\r\n\u2028\u2029]/.test(ruleLine(r));
  for (const r of unique.filter((x) => !oneLine(x))) {
    stats.skipped.unusable++;
    stats.skips.push({ name: r.id, reason: 'unusable', detail: 'it would not fit on one ledger line' });
  }
  let kept = unique.filter(oneLine);
  let text = render(kept);
  for (let pass = 0; pass < 3; pass++) {
    const bad = parse(text).problems.filter((p) => p.level === 'error');
    if (!bad.length) break;
    const lineOf = new Map(text.split('\n').map((l, i) => [i + 1, l]));
    const drop = new Set(bad.map((p) => lineOf.get(p.line)).filter((l) => l && l.startsWith('! ')));
    if (!drop.size) break;
    for (const r of kept.filter((x) => drop.has(ruleLine(x)))) {
      stats.skipped.unusable++;
      stats.skips.push({ name: r.id, reason: 'unusable', detail: 'the pattern generated for it did not parse' });
    }
    kept = kept.filter((r) => !drop.has(ruleLine(r)));
    text = render(kept);
  }
  stats.rules = kept.length;
  const ok = parse(text);
  if (!ok.ok) return { error: `could not produce a valid ledger: ${ok.problems.find((p) => p.level === 'error').message}` };
  return { text, rules: kept, stats, roots, notes: surf.notes };
}

export const DERIVED_FILE = join('.myelin', 'derived.myelin');
export const derivedPath = (dir) => join(dir, DERIVED_FILE);
export const hasDerived = (dir) => existsSync(derivedPath(dir));
