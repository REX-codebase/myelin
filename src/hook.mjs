// `myelin hook`: run Myelin from an agent's own hooks, so the check happens whether or not the
// model remembers to ask for it.
//
//   hook post       after a file edit: lint only the text the agent just wrote and, if a rule
//                   fires, say so on stderr with exit 2 (Claude Code hands that to the model)
//   hook session    at session start: print the rules that apply to this project as context
//   hook install    add both hooks to .claude/settings.json (idempotent); --uninstall removes them
//
// A hook must never get in the way. Any failure here, a bad payload, an unreadable file, a broken
// ledger, ends in exit 0 and silence (set MYELIN_DEBUG=1 to see why).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { parse } from './parse.mjs';
import { check } from './check.mjs';
import { detectLibs, libPath } from './libs.mjs';
import { CliError, DEFAULT_EXT, collect, projectDir, within } from './util.mjs';
import { derivedPath } from './derive.mjs';

const HOOK_EXT = new Set([...DEFAULT_EXT.split(','), 'css', 'scss', 'svelte', 'vue', 'astro', 'mdx']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);
const MAX_SHOWN = 12;
const MARK = 'myelin hook';

const quiet = (e) => {
  if (process.env.MYELIN_DEBUG) console.error(`myelin hook: ${e && e.stack ? e.stack : e}`);
};

export function readStdin(stream = process.stdin, timeoutMs = 5000) {
  return new Promise((resolveText) => {
    if (stream.isTTY) return resolveText('');
    const chunks = [];
    const done = () => resolveText(Buffer.concat(chunks).toString('utf8'));
    const timer = setTimeout(done, timeoutMs);
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => {
      clearTimeout(timer);
      done();
    });
    stream.on('error', () => {
      clearTimeout(timer);
      done();
    });
  });
}

// ---- finding what applies -----------------------------------------------------------------------

/**
 * The nearest directory at or above `from` that has a .myelin/ folder, else `fallback`. A ledger is
 * read by the model, so only the session's own project counts: the folder must be the working
 * directory, below it (a package in a monorepo) or above it (the session began in a subfolder).
 */
export function projectRoot(from, fallback) {
  for (let d = resolve(from); ; d = dirname(d)) {
    if (existsSync(join(d, '.myelin')) && (within(d, fallback) || within(fallback, d))) return d;
    if (dirname(d) === d) return fallback;
  }
}

/**
 * The ledgers to enforce in a project: every valid .myelin/*.myelin, curated ones first and the
 * derived one last (so a curated rule wins when both flag the same line). With no .myelin/
 * folder, the bundled ledgers that match package.json.
 */
export function projectLedgers(root) {
  const dir = join(root, '.myelin');
  let files = [];
  if (existsSync(dir)) {
    files = readdirSync(dir).filter((n) => n.endsWith('.myelin')).sort().map((n) => join(dir, n));
  } else {
    try {
      files = detectLibs(root).found.map((f) => libPath(f.id)).filter(Boolean);
    } catch {}
  }
  const derived = derivedPath(root);
  files.sort((a, b) => Number(a === derived) - Number(b === derived));
  const out = [];
  for (const f of files) {
    const ledger = parse(readFileSync(f, 'utf8'));
    if (ledger.ok) out.push({ file: f, name: relative(root, f) || f, ledger, derived: f === derived });
  }
  return out;
}

function ignoredIds(root) {
  const ids = new Set();
  const file = join(root, '.myelin', 'ignore');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const id = line.replace(/#.*/, '').trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

// ---- hook post ----------------------------------------------------------------------------------

/** The texts an edit introduced: [{ text }] for a payload of Claude Code's Edit, MultiEdit or Write. */
export function writtenTexts(tool, input) {
  if (!input || typeof input !== 'object') return [];
  if (tool === 'Write') return typeof input.content === 'string' ? [input.content] : [];
  if (tool === 'MultiEdit') return (Array.isArray(input.edits) ? input.edits : []).map((e) => e && e.new_string).filter((t) => typeof t === 'string' && t);
  return typeof input.new_string === 'string' && input.new_string ? [input.new_string] : [];
}

const lineOfOffset = (text, i) => (i < 0 ? 0 : text.slice(0, i).split('\n').length - 1);

/**
 * Check what an agent just wrote. Returns { violations } where each has an absolute `line` when
 * the written text can be found in the file. Only bans are checked: a requirement cannot be
 * judged from a fragment.
 */
export function checkWritten({ root, file, texts, ledgers }) {
  let whole;
  try {
    whole = readFileSync(file, 'utf8');
  } catch {
    return { violations: [] };
  }
  const name = relative(root, file) || file;
  const ignore = ignoredIds(root);
  const seen = new Set();
  const violations = [];
  for (const text of texts) {
    const base = lineOfOffset(whole, whole.indexOf(text));
    const unit = { name, text, context: whole };
    for (const l of ledgers) {
      const r = check(l.ledger, [unit], { ignore, bansOnly: true });
      for (const v of r.violations) {
        const line = v.line ? v.line + base : null;
        const key = `${line}:${v.unit}`;
        if (seen.has(key)) continue; // one finding per line; the curated ledger got there first
        seen.add(key);
        violations.push({ ...v, line, ledger: l.name });
      }
    }
  }
  violations.sort((a, b) => (a.line || 0) - (b.line || 0));
  return { violations, name };
}

export function report({ name, violations }) {
  const shown = violations.slice(0, MAX_SHOWN);
  const lines = [`myelin: ${violations.length} stale or deprecated API use${violations.length === 1 ? '' : 's'} in the code you just wrote to ${name}. The edit was applied. Fix ${violations.length === 1 ? 'it' : 'them'} now:`];
  for (const v of shown) lines.push(`  ${name}${v.line ? ':' + v.line : ''}  ${v.id}  ${v.message}`);
  if (violations.length > shown.length) lines.push(`  ... and ${violations.length - shown.length} more`);
  const from = [...new Set(violations.map((v) => v.ledger))].join(', ');
  lines.push(`Rules: ${from}. If a rule is wrong for this project, add its id to .myelin/ignore.`);
  return lines.join('\n');
}

export async function hookPost(payload, { stderr = (s) => console.error(s) } = {}) {
  if (process.env.MYELIN_HOOK === 'off') return 0;
  try {
    if (!payload || !EDIT_TOOLS.has(payload.tool_name)) return 0;
    const input = payload.tool_input || {};
    const target = input.file_path;
    if (typeof target !== 'string' || !target) return 0;
    const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
    const file = isAbsolute(target) ? target : resolve(cwd, target);
    if (!HOOK_EXT.has(extname(file).slice(1).toLowerCase())) return 0;
    if (/(^|[\\/])(node_modules|\.git|\.myelin)[\\/]/.test(file)) return 0;
    const texts = writtenTexts(payload.tool_name, input);
    if (!texts.length) return 0;
    const root = projectRoot(dirname(file), cwd);
    if (!within(file, root)) return 0; // an edit outside the project is not this project's business
    const ledgers = projectLedgers(root);
    if (!ledgers.length) return 0;
    const { violations, name } = checkWritten({ root, file, texts, ledgers });
    if (!violations.length) return 0;
    stderr(report({ name, violations }));
    return 2;
  } catch (e) {
    quiet(e);
    return 0;
  }
}

// ---- hook session -------------------------------------------------------------------------------

const IMPORT_LINE = /(?:^|\n)[ \t]*(?:import|export)\b[^;'"]*?from\s*['"][^'"]+['"]|\brequire\s*\(\s*['"][^'"]+['"]\s*\)|\bimport\s*\(\s*['"][^'"]+['"]\s*\)|(?:^|\n)[ \t]*import\s*['"][^'"]+['"]/g;

/** Text that holds every module the project imports, plus its package.json dependencies as imports. */
export function importsOf(root, { maxFiles = 2500, maxBytes = 400_000 } = {}) {
  const out = [];
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    for (const k of ['dependencies', 'devDependencies', 'peerDependencies']) for (const n of Object.keys(pkg[k] || {})) out.push(`import x from '${n}';`);
  } catch {}
  try {
    let bytes = 0;
    for (const f of collect([root], [...HOOK_EXT]).slice(0, maxFiles)) {
      if (statSync(f).size > 400_000) continue;
      for (const m of readFileSync(f, 'utf8').matchAll(IMPORT_LINE)) {
        out.push(m[0].trim());
        bytes += m[0].length;
      }
      if (bytes > maxBytes) break;
    }
  } catch {}
  return out.join('\n');
}

/**
 * How often each rule already fires on the project's own source. Models imitate the code around
 * them, so a deprecated API the project already uses is the one most likely to be written again.
 * Bounded, and silently skipped for a repository too large to read at session start.
 */
export function projectUsage(root, ledgers, { maxFiles = 800, maxBytes = 1_500_000 } = {}) {
  const usage = new Map();
  try {
    const units = [];
    let bytes = 0;
    for (const f of collect([root], [...HOOK_EXT]).slice(0, maxFiles)) {
      const size = statSync(f).size;
      if (size > 200_000 || bytes + size > maxBytes) continue;
      bytes += size;
      units.push({ name: f, text: readFileSync(f, 'utf8') });
    }
    for (const l of ledgers) {
      for (const v of check(l.ledger, units, { bansOnly: true }).violations) usage.set(v.id, (usage.get(v.id) || 0) + 1);
    }
  } catch (e) {
    quiet(e);
  }
  return usage;
}

/**
 * The context to give a model at session start: the bans that apply to this project, as sentences.
 * Rules gated on a package the project does not use are left out. What is left is ordered by what
 * the project's own code already does wrong, then by whether the rule says what to use instead, then
 * by the ledger's own order, and cut to `budget` characters with a pointer to the rest.
 */
export function sessionBrief(root, { budget = 4000 } = {}) {
  const ledgers = projectLedgers(root);
  if (!ledgers.length) return '';
  const imports = importsOf(root);
  const usage = projectUsage(root, ledgers);
  // One queue per ledger, and per package inside a derived ledger, so a short budget is shared out
  // instead of being spent on whichever package sorts first.
  const queues = new Map();
  for (const l of ledgers) {
    for (const r of l.ledger.rules) {
      if (r.kind !== 'ban' || (r.when && !r.when.re.test(imports))) continue;
      const key = l.derived ? `${l.name}|${r.id.split('-')[0]}` : l.name;
      if (!queues.has(key)) queues.set(key, []);
      queues.get(key).push({ message: r.message, used: usage.get(r.id) || 0, advice: / (?:Use|Import it from) /.test(r.message) ? 1 : 0 });
    }
  }
  for (const q of queues.values()) q.sort((a, b) => b.used - a.used || b.advice - a.advice); // stable: ledger order breaks ties
  const lines = [];
  const seen = new Set();
  let used = 0;
  let hidden = 0;
  const lists = [...queues.values()];
  // Rules the project already breaks go first whatever package they belong to; the rest share the budget fairly.
  const order = [];
  for (const q of lists) for (const r of q) if (r.used) order.push(r);
  order.sort((a, b) => b.used - a.used);
  for (let i = 0; lists.some((q) => i < q.length); i++) for (const q of lists) if (i < q.length && !q[i].used) order.push(q[i]);
  for (const r of order) {
    if (seen.has(r.message)) continue;
    seen.add(r.message);
    if (used + r.message.length + 3 > budget) hidden++;
    else {
      lines.push(`- ${r.message}`);
      used += r.message.length + 3;
    }
  }
  if (!lines.length) return '';
  const out = [
    'Myelin is active in this project. Every file edit is checked against the rules below, and a hit comes back to you right after the edit. Avoid these in the first place:',
    ...lines,
  ];
  if (hidden) out.push(`(${hidden} more rule(s) not shown; they are still enforced. List them: myelin gate <ledger>.)`);
  return out.join('\n');
}

// ---- hook install -------------------------------------------------------------------------------

const runner = (sub) => `sh -c 'command -v myelin >/dev/null 2>&1 || exit 0; exec myelin hook ${sub}'`;
const ours = (h) => h && typeof h.command === 'string' && h.command.includes(MARK);

function withoutOurs(list) {
  const kept = [];
  for (const group of Array.isArray(list) ? list : []) {
    const hooks = (group.hooks || []).filter((h) => !ours(h));
    if (hooks.length) kept.push({ ...group, hooks });
  }
  return kept;
}

/** The settings object with Myelin's hooks added (or removed), leaving everything else as it was. */
export function mergeSettings(settings, { remove = false } = {}) {
  const next = { ...settings, hooks: { ...(settings.hooks || {}) } };
  const post = withoutOurs(next.hooks.PostToolUse);
  const start = withoutOurs(next.hooks.SessionStart);
  if (!remove) {
    post.push({ matcher: 'Edit|MultiEdit|Write', hooks: [{ type: 'command', command: runner('post'), timeout: 30 }] });
    start.push({ hooks: [{ type: 'command', command: runner('session'), timeout: 30 }] });
  }
  for (const [k, v] of [['PostToolUse', post], ['SessionStart', start]]) {
    if (v.length) next.hooks[k] = v;
    else delete next.hooks[k];
  }
  if (!Object.keys(next.hooks).length) delete next.hooks;
  return next;
}

/** What installing (or removing) the hooks would do to a project's Claude settings, without doing it. */
export function planHooks(dir, { local = false, remove = false } = {}) {
  const file = join(dir, '.claude', local ? 'settings.local.json' : 'settings.json');
  let settings = {};
  const exists = existsSync(file);
  if (exists) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      throw new CliError(`${file} is not valid JSON; fix it by hand and re-run`, 1);
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new CliError(`${file} is not a JSON object`, 1);
  }
  const next = mergeSettings(settings, { remove });
  return { file, exists, next, text: JSON.stringify(next, null, 2) + '\n', same: exists && JSON.stringify(settings) === JSON.stringify(next) };
}

export function applyHooks(plan) {
  if (plan.same) return;
  mkdirSync(dirname(plan.file), { recursive: true });
  writeFileSync(plan.file, plan.text);
}

export function hookInstall(flags, log = (s) => console.log(s)) {
  const dir = projectDir(flags);
  const remove = !!flags.uninstall;
  const plan = planHooks(dir, { local: !!flags.local, remove });
  if (remove && !plan.exists) {
    log(`nothing to remove: ${relative(dir, plan.file)} does not exist`);
    return 0;
  }
  if (flags['dry-run']) {
    log(plan.text.trimEnd());
    return 0;
  }
  applyHooks(plan);
  const shown = relative(dir, plan.file);
  if (remove) log(plan.same ? `no Myelin hooks in ${shown}` : `removed the Myelin hooks from ${shown}`);
  else log(plan.same ? `Myelin hooks already in ${shown}` : `added the Myelin hooks to ${shown}: a PostToolUse check after every edit, and the rules at session start`);
  if (!remove) log('Hooks run only where the myelin command is on PATH; elsewhere they do nothing.');
  return 0;
}

/** Are Myelin's hooks present in a project's Claude settings? Used by `doctor`. */
export function hooksInstalled(dir) {
  for (const n of ['settings.json', 'settings.local.json']) {
    try {
      const s = JSON.parse(readFileSync(join(dir, '.claude', n), 'utf8'));
      const post = (s.hooks?.PostToolUse || []).some((g) => (g.hooks || []).some(ours));
      if (post) return n;
    } catch {}
  }
  return null;
}

export async function hookCommand(args, flags, log = (s) => console.log(s)) {
  const sub = args[0];
  if (sub === 'install' || sub === 'uninstall') return hookInstall({ ...flags, uninstall: sub === 'uninstall' || flags.uninstall }, log);
  if (sub === 'post') {
    let payload = null;
    try {
      payload = JSON.parse(await readStdin());
    } catch (e) {
      quiet(e);
    }
    return hookPost(payload);
  }
  if (sub === 'session') {
    try {
      let cwd = process.cwd();
      try {
        const p = JSON.parse(await readStdin());
        if (p && typeof p.cwd === 'string' && p.cwd) cwd = p.cwd;
      } catch {}
      const brief = sessionBrief(projectRoot(cwd, cwd), { budget: Number(flags.budget) > 0 ? Number(flags.budget) : 4000 });
      if (brief) console.log(brief);
    } catch (e) {
      quiet(e);
    }
    return 0;
  }
  throw new CliError('usage: myelin hook <post|session|install|uninstall>');
}
