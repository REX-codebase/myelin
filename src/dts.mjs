// A small scanner for TypeScript declaration files (.d.ts). It answers three questions without a
// TypeScript compiler: which declarations carry a JSDoc `@deprecated` tag, which other packages a
// file re-exports, and how many declarations of each name the file holds.
//
// It is a scanner, not a parser. It understands comments, strings, and the brace nesting of
// classes, interfaces, namespaces, enums and `declare module` blocks, which is all that is
// needed to say "this name is deprecated, and it lives here". Anything it cannot place it skips,
// because a missing rule costs a little recall and a wrong rule costs a false alarm.

const IDENT = '[A-Za-z_$][\\w$]*';
const MODIFIER = new RegExp(
  `^\\s*(export|declare|default|abstract|static|readonly|public|protected|private|async|override|accessor)\\b(?!\\s*[(?:<=;,}!])`,
);
const KEYWORD = new RegExp(`^\\s*(function\\*?|class|interface|type|enum|namespace|module|const|let|var)\\b(?!\\s*[(?:<=;,}!])\\s*`);
const NAME = new RegExp(`^(${IDENT})`);
const ACCESSOR = new RegExp(`^\\s*(get|set)\\s+(?=${IDENT}\\s*[(<])`);

// ---- stage 1: comments and strings -------------------------------------------------------------

const blank = (s) => (s.indexOf('\n') < 0 ? ' '.repeat(s.length) : s.split('\n').map((l) => ' '.repeat(l.length)).join('\n'));

/**
 * Split a declaration file into three views of the same length:
 *   plain  comments blanked, strings kept (to read module names and string keys)
 *   clean  comments and string contents blanked (to read structure)
 *   docs   the JSDoc blocks that carry `@deprecated`
 */
export function strip(text) {
  const plain = [];
  const clean = [];
  const docs = [];
  const n = text.length;
  let i = 0;
  let from = 0;
  const flush = (to) => {
    if (to > from) {
      const code = text.slice(from, to);
      plain.push(code);
      clean.push(code);
    }
  };
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (c === '/' && d === '/') {
      flush(i);
      let e = text.indexOf('\n', i);
      if (e < 0) e = n;
      const gap = blank(text.slice(i, e));
      plain.push(gap);
      clean.push(gap);
      i = from = e;
    } else if (c === '/' && d === '*') {
      flush(i);
      let e = text.indexOf('*/', i + 2);
      e = e < 0 ? n : e + 2;
      const body = text.slice(i, e);
      if (body.startsWith('/**') && /(?:^|\n)[\s*/]*@deprecated\b/.test(body)) docs.push({ start: i, end: e, body });
      const gap = blank(body);
      plain.push(gap);
      clean.push(gap);
      i = from = e;
    } else if (c === '"' || c === "'" || c === '`') {
      flush(i);
      let j = i + 1;
      while (j < n && text[j] !== c) {
        if (text[j] === '\\') j++;
        else if (c !== '`' && text[j] === '\n') break;
        j++;
      }
      if (text[j] !== c) j = Math.min(n, i + 1); // unterminated: not a string
      else j++;
      const lit = text.slice(i, j);
      plain.push(lit);
      clean.push(lit.length > 1 ? lit[0] + blank(lit.slice(1, -1)) + lit[lit.length - 1] : lit);
      i = from = j;
    } else i++;
  }
  flush(n);
  return { plain: plain.join(''), clean: clean.join(''), docs };
}

// ---- stage 2: structure ------------------------------------------------------------------------

function classifyHead(head, plainHead) {
  const last = (re) => {
    let m = null;
    for (const x of head.matchAll(re)) m = x;
    return m;
  };
  const trimmed = head.trimEnd();
  let m;
  if (/\bdeclare\s+global\b/.test(head)) return { kind: 'global', name: null };
  if (/\bmodule\s+(["'])\s*\1/.test(head)) {
    // The quoted name is blanked in `head`; read it from the plain view of the same text.
    let named = null;
    for (const x of plainHead.matchAll(/\bmodule\s+(["'])([^"']*)\1/g)) named = x;
    return { kind: 'module', name: named ? named[2] : null };
  }
  if ((m = last(new RegExp(`\\b(?:namespace|module)\\s+(${IDENT}(?:\\.${IDENT})*)`, 'g')))) {
    const parts = m[1].split('.');
    return { kind: 'namespace', name: parts[parts.length - 1] };
  }
  if ((m = last(new RegExp(`\\benum\\s+(${IDENT})`, 'g')))) return { kind: 'enum', name: m[1] };
  if ((m = last(new RegExp(`\\binterface\\s+(${IDENT})`, 'g')))) return { kind: 'interface', name: m[1] };
  if ((m = last(new RegExp(`\\bclass\\s*(${IDENT})?`, 'g')))) return { kind: 'class', name: m[1] || null };
  if (/[=:]$/.test(trimmed)) {
    // `type X = {`, `declare const x: {`, `foo: {`: a type literal that has members worth reading
    const before = trimmed.slice(0, -1).trimEnd();
    const nm = before.match(new RegExp(`(${IDENT})(?:\\s*<[^]*>)?\\s*\\??$`));
    return { kind: 'literal', name: nm ? nm[1] : null };
  }
  return { kind: 'opaque', name: null };
}

// What follows a `@deprecated` JSDoc block: the declaration it is attached to.
function readDeclaration(clean, plain, at, frame) {
  let rest = clean.slice(at, at + 400);
  let offset = 0;
  const eat = (re) => {
    const m = rest.match(re);
    if (!m) return null;
    rest = rest.slice(m[0].length);
    offset += m[0].length;
    return m;
  };
  while (eat(MODIFIER));
  const acc = eat(ACCESSOR);
  let keyword = null;
  const km = eat(KEYWORD);
  if (km) keyword = km[1].replace('*', '');
  if (keyword === 'const' && /^enum\b/.test(rest)) {
    eat(/^enum\s+/);
    keyword = 'enum';
  }
  if (keyword === 'module') keyword = 'namespace';
  eat(/^\s+/);

  let name = null;
  if (rest[0] === '"' || rest[0] === "'") {
    const close = rest.indexOf(rest[0], 1);
    if (close > 0) {
      const raw = plain.slice(at + offset + 1, at + offset + close);
      if (new RegExp(`^${IDENT}$`).test(raw)) name = raw;
      rest = rest.slice(close + 1);
    }
  } else {
    const nm = rest.match(NAME);
    if (nm) {
      name = nm[1];
      rest = rest.slice(name.length);
    }
  }
  if (!name) return null;

  if (keyword) {
    const kind = { function: 'function', class: 'class', interface: 'interface', type: 'type', enum: 'enum', namespace: 'namespace', const: 'const', let: 'const', var: 'const' }[keyword];
    return kind ? { name, kind, member: false } : null;
  }
  const after = rest.match(/^\s*([?!]?)\s*([(<:=,;}]|$)/);
  if (!after) return null;
  if (frame.kind === 'enum') return { name, kind: 'enum-member', member: true };
  if ((name === 'constructor' || name === 'new') && after[2] === '(') return null; // constructors and construct signatures
  if (acc || after[2] === '(' || after[2] === '<') return { name, kind: 'method', member: true };
  return { name, kind: 'property', member: true };
}

const noteOf = (body) => {
  const lines = body.replace(/^\/\*\*+/, '').replace(/\*+\/$/, '').split('\n').map((l) => l.replace(/^\s*\*? ?/, ''));
  const out = [];
  let on = false;
  for (const l of lines) {
    if (!on) {
      const m = l.match(/@deprecated\b\s*(.*)$/);
      if (m) {
        on = true;
        out.push(m[1]);
      }
    } else if (/^\s*@\w/.test(l)) break;
    else out.push(l);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * The declarations in one file that carry `@deprecated`.
 *   name       the identifier as written
 *   kind       function | class | interface | type | enum | namespace | const | method | property | enum-member
 *   member     true for a member of a class, interface, literal type or enum
 *   container  the enclosing class/interface/enum/namespace/literal name, or null
 *   module     the string of the enclosing `declare module "x"`, or null
 *   note       the text after the tag
 *   line       1-based line of the tag
 */
export function deprecations(text, views = strip(text)) {
  const { plain, clean, docs } = views;
  if (!docs.length) return [];
  const out = [];
  const stack = [{ kind: 'top', name: null, module: null, paren: 0, angle: 0, bracket: 0 }];
  const frame = () => stack[stack.length - 1];
  const lineStarts = [0];
  for (let k = text.indexOf('\n'); k >= 0; k = text.indexOf('\n', k + 1)) lineStarts.push(k + 1);
  const lineAt = (pos) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  let headStart = 0;
  let di = 0;
  const record = (doc) => {
    const f = frame();
    if (f.paren || f.angle || f.bracket) return; // a parameter or a type argument, not a declaration
    if (stack.some((s) => s.kind === 'opaque' || s.kind === 'global')) return; // not this package's surface
    const d = readDeclaration(clean, plain, doc.end, f);
    if (!d) return;
    if (!d.member && f.kind !== 'top' && f.kind !== 'module' && f.kind !== 'namespace') return;
    if (d.member && !['class', 'interface', 'literal', 'enum'].includes(f.kind)) return;
    const named = [...stack].reverse().find((s) => s.kind === 'module');
    out.push({
      name: d.name,
      kind: d.kind,
      member: d.member,
      container: f.kind === 'top' || f.kind === 'module' ? null : f.name,
      module: named ? named.name : null,
      note: noteOf(doc.body),
      line: lineAt(doc.start),
    });
  };

  const n = clean.length;
  for (let i = 0; i < n; i++) {
    while (di < docs.length && docs[di].end <= i) record(docs[di++]);
    const c = clean[i];
    const f = frame();
    if (c === '(') f.paren++;
    else if (c === ')') f.paren = Math.max(0, f.paren - 1);
    else if (c === '[') f.bracket++;
    else if (c === ']') f.bracket = Math.max(0, f.bracket - 1);
    else if (c === '<') f.angle++;
    else if (c === '>') {
      if (clean[i - 1] !== '=') f.angle = Math.max(0, f.angle - 1);
    } else if (c === ';') {
      f.paren = f.angle = f.bracket = 0;
      headStart = i + 1;
    } else if (c === ',') {
      if (f.kind === 'literal' && !f.paren && !f.angle && !f.bracket) headStart = i + 1;
    } else if (c === '{') {
      let next;
      if (f.paren || f.angle || f.bracket) next = { kind: 'opaque', name: null };
      else next = classifyHead(clean.slice(headStart, i), plain.slice(headStart, i));
      stack.push({ ...next, module: next.kind === 'module' ? next.name : null, paren: 0, angle: 0, bracket: 0 });
      if (next.kind !== 'opaque') headStart = i + 1;
    } else if (c === '}') {
      if (stack.length > 1) {
        const closed = stack.pop();
        if (closed.kind !== 'opaque') headStart = i + 1;
      }
    }
  }
  while (di < docs.length) record(docs[di++]);
  return out;
}

/**
 * How a declaration file reaches other files, which is how a package's public surface is found:
 *   relative    `export * from "./x"`, `export { a } from "./x"`, `/// <reference path="x.d.ts" />`,
 *               and, in a bundled file that re-exports from a local list, its relative imports
 *   bare        `export * from "other-pkg"` (a package re-exporting another package)
 */
export function edges(text, views = strip(text)) {
  const { plain } = views;
  const relative = new Set();
  const bare = new Set();
  for (const m of plain.matchAll(/\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(["'])([^"']+)\1/g)) {
    (/^\.{1,2}(?:\/|$)/.test(m[2]) ? relative : bare).add(m[2]);
  }
  // A bundled declaration file imports its chunks and re-exports them from a local list at the
  // bottom (`import { a as b } from "./chunk.js"; ... export { b }`). Only such a file's imports
  // are edges; in an ordinary file an import is just a type it uses, not something it exposes.
  let localList = false;
  for (const m of plain.matchAll(/\bexport\s+(?:type\s+)?\{[^}]*\}\s*(from\b)?/g)) if (!m[1]) localList = true;
  if (localList) {
    for (const m of plain.matchAll(/\bimport\s+(?:type\s+)?(?:[^'";]*?\bfrom\s*)?(["'])(\.{1,2}\/[^"']*)\1/g)) relative.add(m[2]);
  }
  // Triple-slash directives are comments, so they are read from the raw text.
  for (const m of text.matchAll(/^\s*\/\/\/\s*<reference\s+path\s*=\s*(["'])([^"']+)\1/gm)) relative.add(/^\.{0,2}\//.test(m[2]) ? m[2] : './' + m[2]);
  return { relative: [...relative], bare: [...bare] };
}

/** Ambient module names a file declares: `declare module "fs" { ... }`. */
export function modules(text, views = strip(text)) {
  const { plain } = views;
  return [...new Set([...plain.matchAll(/\bdeclare\s+module\s+(["'])([^"']+)\1/g)].map((m) => m[2]))];
}

/** Bare package specifiers a file re-exports. */
export function reexports(text) {
  return edges(text).bare;
}

// A declaration starts a line or follows `{` or `;` (so `interface A { b(): void; c: 1 }` counts b and c).
const DECL_LINE = new RegExp(
  `(?<=^|[{;])[ \\t]*(?:(?:export|declare|default|abstract|static|readonly|public|protected|private|async|override|accessor|get|set)\\s+)*(?:(function\\*?|class|interface|type|enum|namespace|const|let|var)\\s+)?(${IDENT})\\s*[?!]?\\s*(?=([(<:=;,{])|\\s+(?:extends|implements)\\b|$)`,
  'gm',
);

/**
 * How many declaration-like spots each name has, by what kind of thing they declare:
 *   sym   keyworded: `function x`, `interface X`, `const x` (a module-scope symbol)
 *   fn    a member that is called: `x(): void`, `x<T>(a: T): T`
 *   prop  any other member: `x: string`, `x?: number`
 * It deliberately over-counts (a parameter on its own line looks like a member), so a name that
 * is deprecated in one place and also declared elsewhere is treated as ambiguous.
 *   Map<name, { sym, fn, prop }>
 */
export function declarationCounts(text, views = strip(text)) {
  const { clean } = views;
  const counts = new Map();
  for (const m of clean.matchAll(DECL_LINE)) {
    const name = m[2];
    if (name === 'export' || name === 'import' || name === 'declare') continue;
    const c = counts.get(name) || { sym: 0, fn: 0, prop: 0 };
    if (m[1]) c.sym++;
    else if (m[3] === '(' || m[3] === '<') c.fn++;
    else c.prop++;
    counts.set(name, c);
  }
  return counts;
}

/** Everything the derivation needs from one declaration file, from a single pass over its text. */
export function analyze(text) {
  const views = strip(text);
  return { decls: deprecations(text, views), edges: edges(text, views), counts: declarationCounts(text, views), modules: modules(text, views) };
}
