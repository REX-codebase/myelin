// `myelin setup`: the first-run wizard. It reads the project's package.json, copies the
// matching bundled ledgers into .myelin/, and writes a marked block into AGENTS.md or
// CLAUDE.md. Re-running is safe: the block is replaced in place and nothing outside it changes.
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import * as ui from './ui.mjs';
import { listLibs, libPath, detectLibs } from './libs.mjs';
import { parse } from './parse.mjs';
import { check } from './check.mjs';
import { CliError, ROOT, collect, DEFAULT_EXT, projectDir } from './util.mjs';
import { derive, derivedPath } from './derive.mjs';
import { planHooks, applyHooks } from './hook.mjs';

export const START = '<!-- myelin:start -->';
export const END = '<!-- myelin:end -->';
const SNIPPET = join(ROOT, 'integrations', 'AGENTS.md.snippet');
const TARGETS = { agents: 'AGENTS.md', claude: 'CLAUDE.md', none: null };

// 'none' | 'ok' | 'broken': whether text holds exactly one well-ordered myelin block.
export function blockState(text) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 && e === -1) return 'none';
  if (s === -1 || e < s || text.indexOf(START, s + 1) !== -1 || text.indexOf(END, e + 1) !== -1) return 'broken';
  return 'ok';
}

// The snippet tailored to the chosen ledgers. gate and snippet take one ledger, so their
// bullet is repeated per ledger; lint takes a comma list, so its line names them all.
export function agentBlock(ids) {
  const paths = ids.map((id) => `.myelin/${id}.myelin`);
  const lines = readFileSync(SNIPPET, 'utf8').trimEnd().split('\n');
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('This project keeps hard rules')) {
      body.push(`This project keeps hard rules in \`.myelin/\` ledgers: ${ids.join(', ')}.`);
    } else if (line.startsWith('- ') && lines[i + 1]?.includes('<ledger>') && !lines[i + 1].includes('lint')) {
      // A bullet whose continuation names a single ledger: one whole bullet per ledger.
      const cont = lines[++i].trim();
      for (const p of paths) body.push(`${line} ${cont.replaceAll('<ledger>', p)}`);
    } else if (line.includes('<ledger>') && !line.includes('lint')) {
      for (const p of paths) body.push(line.replaceAll('<ledger>', p));
    } else {
      body.push(line.replaceAll('<ledger>', paths.join(',')));
    }
  }
  return [START, ...body, END].join('\n');
}

// Returns the file text with the block in place, and what changed. Only the text between
// the markers is ever replaced; content outside them is kept byte for byte.
export function mergeBlock(text, block, file) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const b = block.split('\n').join(eol);
  if (!text) return { text: `${b}${eol}`, action: 'create' };
  const state = blockState(text);
  if (state === 'broken') {
    throw new CliError(`${file} has a broken myelin block (need one ${START} then one ${END}); fix it by hand and re-run`, 1);
  }
  if (state === 'none') {
    const sep = text.endsWith('\n') ? eol : eol + eol;
    return { text: text + sep + b + eol, action: 'append' };
  }
  const s = text.indexOf(START);
  const end = text.indexOf(END) + END.length;
  if (text.slice(s, end) === b) return { text, action: 'same' };
  return { text: text.slice(0, s) + b + text.slice(end), action: 'replace' };
}

function parseTarget(v) {
  if (v === undefined) return undefined;
  if (!Object.keys(TARGETS).includes(v)) throw new CliError('--target must be agents, claude or none');
  return v;
}

function parseLibs(v) {
  if (v === undefined) return undefined;
  if (v === true) throw new CliError('--libs needs a value, e.g. --libs=react,tailwind');
  const ids = [...new Set(String(v).split(',').map((s) => s.trim()).filter(Boolean))];
  for (const id of ids) if (!libPath(id)) throw new CliError(`no bundled lib named ${id}. Run "myelin libs".`);
  return ids;
}

function detect(dir) {
  try {
    return detectLibs(dir).found;
  } catch (e) {
    if (e instanceof SyntaxError) throw new CliError(`${join(dir, 'package.json')} is not valid JSON`, 1);
    throw e;
  }
}

function readPkg(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

// True when the wizard should run by itself: a project that has no .myelin/ yet.
export function needsSetup(dir) {
  return !existsSync(join(dir, '.myelin')) && (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git')));
}

async function pickLibs(found) {
  const hits = new Map(found.map((f) => [f.id, f.matched]));
  const libs = listLibs();
  const items = [...libs.filter((l) => hits.has(l.id)), ...libs.filter((l) => !hits.has(l.id))].map((l) => ({
    id: l.id,
    label: l.id,
    hint: hits.has(l.id) ? `${l.name}: matches ${hits.get(l.id).join(', ')}` : l.name,
  }));
  const pre = items.map((it, i) => (hits.has(it.id) ? i : -1)).filter((i) => i >= 0);
  const picked = new Set((await ui.multiSelect(items, pre)).map((i) => items[i].id));
  return libs.map((l) => l.id).filter((id) => picked.has(id));
}

async function pickTarget() {
  ui.step('Where should the rules be wired in?');
  console.log('  1) AGENTS.md  shared by many coding agents (default)');
  console.log('  2) CLAUDE.md  read by Claude Code');
  console.log('  3) skip       ledgers only; wire them up yourself');
  const choice = { 1: 'agents', 2: 'claude', 3: 'none' };
  for (;;) {
    const a = await ui.ask('Choose 1-3 [1]: ', '1');
    if (choice[a]) return choice[a];
    ui.warn(`"${a}" is not 1, 2 or 3`);
  }
}

const LEDGER_LABEL = {
  create: ['create', 'copied from the bundled ledger'],
  same: ['unchanged', ''],
  kept: ['kept', 'differs from the bundled ledger; left as is'],
};
const AGENT_LABEL = {
  create: ['create', 'new file holding only the myelin block'],
  append: ['add block', 'appended after your existing content'],
  replace: ['update block', 'only the text between the markers changes'],
  same: ['unchanged', ''],
};

function planAgent(dir, name, ids) {
  const file = join(dir, name);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  return { file, name, ...mergeBlock(text, agentBlock(ids), name) };
}

function firstLint(dir, ledgers) {
  const src = join(dir, 'src');
  const files = collect([src], DEFAULT_EXT);
  if (!files.length) return ui.note('no source files in src/ to check yet');
  const units = files.map((f) => ({ name: relative(dir, f), text: readFileSync(f, 'utf8') }));
  const failed = [];
  for (const l of ledgers) {
    const ledger = parse(readFileSync(existsSync(l.dest) ? l.dest : l.src, 'utf8'));
    if (!ledger.ok) {
      failed.push(l.id);
      ui.warn(`.myelin/${l.id}.myelin is not a valid ledger; run myelin validate on it`);
      continue;
    }
    const r = check(ledger, units);
    if (!r.ok) {
      failed.push(l.id);
      ui.warn(`lint src/ with ${l.id}: ${r.violations.length} failure(s) in ${units.length} file(s)`);
    }
  }
  const n = `${units.length} file${units.length === 1 ? '' : 's'}`;
  if (!failed.length) ui.ok(`lint src/: clean against ${ledgers.map((l) => l.id).join(', ')} (${n})`);
  else ui.note(`setup did not fail on this. See the details: myelin fix ${failed.join(',')} src/`);
}

// The derived ledger is offered whenever the project has installed dependencies. Under --yes (and with
// no terminal) it is written, because it only adds a file inside .myelin/. Returns the result or null.
async function planDerive(dir, flags, { yes }) {
  if (flags['no-derive']) return null;
  const installed = existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'node_modules'));
  if (!installed) {
    if (flags.derive) ui.warn('--derive needs installed dependencies; run your package manager first');
    return null;
  }
  const want = flags.derive || yes || !ui.interactive() ? true : await ui.confirm('Read the deprecations of your installed packages into .myelin/derived.myelin?', true);
  if (!want) return null;
  const res = derive(dir);
  if (res.error) {
    ui.warn(`derive: ${res.error}`);
    return null;
  }
  if (!res.rules.length) {
    ui.note('your installed packages carry no usable @deprecated tags, so no derived ledger was written');
    return null;
  }
  return res;
}

// Hooks edit the agent's own settings, so --yes never installs them; only --hook or a "yes" does.
async function planHookInstall(dir, flags, { yes }) {
  if (flags['no-hook']) return null;
  const want = flags.hook ? true : !yes && ui.interactive() ? await ui.confirm('Check every edit Claude Code makes (adds hooks to .claude/settings.json)?', true) : false;
  return want ? planHooks(dir) : null;
}

function doneCard(ids) {
  const cmds = [
    [`myelin lint ${ids.join(',')} src/`, 'check code against the rules'],
    ['myelin doctor', 'check this install and project'],
    ['myelin setup', 're-run after you add or remove libraries'],
  ];
  const w = Math.max(...cmds.map(([c]) => c.length));
  return ui.box(cmds.map(([c, d]) => `${ui.bold(c.padEnd(w))}  ${d}`), { title: "You're set" });
}

export async function setup(flags) {
  const dir = projectDir(flags);
  const target = parseTarget(flags.target);
  const explicit = parseLibs(flags.libs);
  const dry = !!flags['dry-run'];
  const yes = !!flags.yes;
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new CliError(`${dir} is not a directory`);

  console.log(ui.banner());
  console.log('');
  try {
    ui.step(`Project: ${dir}`);
    const found = detect(dir);
    let ids;
    if (explicit) {
      ui.step(`Using --libs: ${explicit.join(', ') || 'none'}`);
      ids = explicit;
    } else if (yes || !ui.interactive()) {
      if (!existsSync(join(dir, 'package.json'))) ui.warn(`no package.json in ${dir}; pass --libs to choose ledgers`);
      else if (!found.length) ui.warn('no bundled ledger matches package.json; pass --libs to choose');
      else {
        ui.step('Matched package.json:');
        for (const f of found) ui.ok(`${f.id}  ${f.matched.join(', ')}`);
      }
      ids = found.map((f) => f.id);
    } else {
      ui.step('Choose the ledgers. Detected ones are pre-checked.');
      ids = await pickLibs(found);
    }
    const derived = await planDerive(dir, flags, { yes });
    if (!ids.length && !derived) {
      ui.warn('no ledgers selected, so nothing to write. See them with: myelin libs');
      return 0;
    }
    const hooks = await planHookInstall(dir, flags, { yes });
    // The agent block names every ledger it should run, the derived one included.
    const withDerived = derived || existsSync(derivedPath(dir));
    const blockIds = withDerived ? [...ids, 'derived'] : ids;

    const where = target ?? (ui.interactive() && !yes ? await pickTarget() : 'agents');
    const mdir = join(dir, '.myelin');
    const ledgers = ids.map((id) => {
      const dest = join(mdir, `${id}.myelin`);
      const src = libPath(id);
      const action = !existsSync(dest)
        ? 'create'
        : readFileSync(dest, 'utf8') === readFileSync(src, 'utf8') ? 'same' : 'kept';
      return { id, src, dest, action };
    });
    const agent = TARGETS[where] ? planAgent(dir, TARGETS[where], blockIds) : null;

    const rows = ledgers.map((l) => {
      const [label, note] = LEDGER_LABEL[l.action];
      return [label, relative(dir, l.dest), l.action === 'kept' ? `${note}; myelin use ${l.id} --force replaces it` : note];
    });
    const dfile = derivedPath(dir);
    const dAction = !derived ? null : !existsSync(dfile) ? 'create' : readFileSync(dfile, 'utf8') === derived.text ? 'same' : 'update';
    if (derived) {
      const n = derived.stats.packages.size;
      rows.push([dAction === 'same' ? 'unchanged' : dAction, relative(dir, dfile), `${derived.rules.length} rules read from ${n} installed package${n === 1 ? '' : 's'}`]);
    }
    if (agent) {
      const [label, note] = AGENT_LABEL[agent.action];
      rows.push([label, basename(agent.file), note]);
    }
    if (hooks) rows.push([hooks.same ? 'unchanged' : 'add hooks', relative(dir, hooks.file), 'check each edit; brief the agent at session start']);
    console.log(ui.table(rows, { head: ['action', 'file', 'note'] }));

    if (dry) {
      ui.note('dry run: nothing was written. Run again without --dry-run to apply.');
    } else {
      const creating = ledgers.filter((l) => l.action === 'create');
      if (creating.length) mkdirSync(mdir, { recursive: true });
      for (const l of creating) copyFileSync(l.src, l.dest);
      if (derived && dAction !== 'same') {
        mkdirSync(mdir, { recursive: true });
        writeFileSync(dfile, derived.text);
      }
      if (agent && agent.action !== 'same') writeFileSync(agent.file, agent.text);
      if (hooks) applyHooks(hooks);
    }

    const pkg = readPkg(dir);
    const lintCmd = `myelin lint ${blockIds.join(',')} ${existsSync(join(dir, 'src')) ? 'src/' : '.'}`;
    if (pkg && !(pkg.scripts || {})['myelin:lint']) {
      console.log('');
      ui.step('Optional: add this to "scripts" in package.json (setup never edits it):');
      console.log(`    "myelin:lint": "${lintCmd}"`);
    }

    if (existsSync(join(dir, 'src'))) {
      console.log('');
      if (dry) ui.note(`would lint src/ against ${blockIds.join(', ')}`);
      else firstLint(dir, withDerived ? [...ledgers, { id: 'derived', src: dfile, dest: dfile }] : ledgers);
    }

    console.log('');
    if (dry) ui.note('dry run complete');
    else console.log(doneCard(blockIds));
    return 0;
  } finally {
    ui.closePrompts();
  }
}
