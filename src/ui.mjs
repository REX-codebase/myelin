// Terminal UI helpers. Zero dependencies.
//   Colour: ANSI only when stdout is a TTY or FORCE_COLOR is set. NO_COLOR always wins.
//   Glyphs: Unicode when the locale is UTF-8, plain ASCII otherwise or when TERM=dumb.
//   Prompts: readline on a TTY. Without a TTY on stdin they return the default at once.
import readline from 'node:readline';
import { pkgVersion } from './util.mjs';

export function colorOn(stream = process.stdout) {
  const { NO_COLOR, FORCE_COLOR, TERM } = process.env;
  if (NO_COLOR) return false;
  if (FORCE_COLOR && FORCE_COLOR !== '0') return true;
  return !!stream.isTTY && TERM !== 'dumb';
}

const sgr = (code) => (s) => (colorOn() ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const bold = sgr('1');
export const dim = sgr('2');
export const brand = sgr('1;36');
export const red = sgr('31');
export const green = sgr('32');
export const yellow = sgr('33');
export const cyan = sgr('36');

export const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
export const width = (s) => [...strip(s)].length;

export function unicodeOk() {
  const { TERM, WT_SESSION, TERM_PROGRAM, LC_ALL, LC_CTYPE, LANG } = process.env;
  if (TERM === 'dumb') return false;
  // Windows consoles report no locale; the terminals that render Unicode set one of these.
  if (process.platform === 'win32') return !!(WT_SESSION || TERM_PROGRAM);
  return /utf-?8/i.test(LC_ALL || LC_CTYPE || LANG || '');
}

const UNI = { ok: '✓', fail: '✗', warn: '!', arrow: '→', bar: '─', side: '│', tl: '╭', tr: '╮', bl: '╰', br: '╯' };
const ASCII = { ok: '+', fail: 'x', warn: '!', arrow: '->', bar: '-', side: '|', tl: '+', tr: '+', bl: '+', br: '+' };
export const glyph = (name) => (unicodeOk() ? UNI : ASCII)[name];

export const interactive = () => !!process.stdin.isTTY;

export const step = (msg) => console.log(`${cyan(glyph('arrow'))} ${msg}`);
export const ok = (msg) => console.log(`${green(glyph('ok'))} ${msg}`);
export const warn = (msg) => console.log(`${yellow(glyph('warn'))} ${msg}`);
export const fail = (msg) => console.log(`${red(glyph('fail'))} ${msg}`);
export const note = (msg) => console.log(`  ${dim(msg)}`);

// Two lines: the wordmark with its version, then the tagline.
export function banner() {
  return `${brand('myelin')} ${dim(`v${pkgVersion()}`)}\n${dim('Machine-checkable rules for LLM-written code.')}`;
}

// rows: arrays of cells (colour allowed; padding is measured without escape codes).
// align: per column, 'l' or 'r'. The last column is never padded, so no trailing spaces.
export function table(rows, { head, align = [] } = {}) {
  const all = head ? [head, ...rows] : rows;
  const cols = Math.max(0, ...all.map((r) => r.length));
  const w = [];
  for (let i = 0; i < cols; i++) w.push(Math.max(...all.map((r) => width(r[i] ?? ''))));
  const line = (r) => {
    const cells = [];
    for (let i = 0; i < cols; i++) {
      const s = String(r[i] ?? '');
      const gap = ' '.repeat(w[i] - width(s));
      cells.push(align[i] === 'r' ? gap + s : i === cols - 1 ? s : s + gap);
    }
    return cells.join('  ');
  };
  const out = [];
  if (head) {
    out.push(bold(line(head)));
    out.push(dim(w.map((n) => glyph('bar').repeat(n)).join('  ')));
  }
  for (const r of rows) out.push(line(r));
  return out.join('\n');
}

export function box(lines, { title = '' } = {}) {
  const C = Math.max(...lines.map(width), title ? width(title) + 2 : 0);
  const rule = title
    ? `${glyph('bar')} ${bold(title)} ${glyph('bar').repeat(C - width(title) - 1)}`
    : glyph('bar').repeat(C + 2);
  const edge = (s) => dim(s);
  const out = [edge(`${glyph('tl')}${rule}${glyph('tr')}`)];
  for (const l of lines) out.push(`${edge(glyph('side'))} ${l}${' '.repeat(C - width(l))} ${edge(glyph('side'))}`);
  out.push(edge(`${glyph('bl')}${glyph('bar').repeat(C + 2)}${glyph('br')}`));
  return out.join('\n');
}

// ---- prompts ---------------------------------------------------------------

let rl = null;
let ended = false;

function iface() {
  if (!rl) {
    ended = false;
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.on('close', () => {
      ended = true;
    });
    // readline swallows Ctrl-C unless someone listens; a wizard should stop on it.
    rl.on('SIGINT', () => {
      closePrompts();
      process.stdout.write('\n');
      process.exit(130);
    });
  }
  return rl;
}

// Resolves to the trimmed answer, or to def when the answer is blank or input ends.
export function ask(question, def = '') {
  if (!interactive() || ended) return Promise.resolve(def);
  const r = iface();
  return new Promise((resolve) => {
    const onClose = () => resolve(def);
    r.once('close', onClose);
    r.question(question, (answer) => {
      r.removeListener('close', onClose);
      resolve(answer.trim() || def);
    });
  });
}

export async function confirm(question, def = true) {
  const a = await ask(`${question} ${def ? '[Y/n]' : '[y/N]'} `, def ? 'y' : 'n');
  return /^y/i.test(a);
}

// Numbered checkbox list. Numbers toggle, "all" and "none" set everything, Enter accepts.
// items: [{ label, hint }]. Returns the chosen indexes. Without a TTY it renders once and
// returns the preselected indexes.
export async function multiSelect(items, preselected = []) {
  const on = new Set(preselected);
  for (;;) {
    const rows = items.map((it, i) => [on.has(i) ? green('[x]') : '[ ]', String(i + 1), it.label, dim(it.hint || '')]);
    console.log(table(rows, { align: ['l', 'r', 'l', 'l'] }));
    const a = await ask('\nToggle by number (e.g. 2 5, all, none), Enter to accept: ');
    if (!a) break;
    for (const tok of a.toLowerCase().split(/[\s,]+/)) {
      if (!tok) continue;
      const n = Number(tok);
      if (tok === 'all') items.forEach((_, i) => on.add(i));
      else if (tok === 'none') on.clear();
      else if (/^\d+$/.test(tok) && n >= 1 && n <= items.length) on.has(n - 1) ? on.delete(n - 1) : on.add(n - 1);
      else warn(`ignored "${tok}"`);
    }
  }
  return [...on].sort((x, y) => x - y);
}

export function closePrompts() {
  if (rl) {
    const r = rl;
    rl = null;
    r.close();
  }
}
