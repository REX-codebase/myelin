import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.mjs';
import { check, snippetUnits } from './check.mjs';
import { renderGate, renderHeader } from './gate.mjs';
import { fixPlan } from './fix.mjs';
import { watchLoop } from './watch.mjs';
import { libPath, listLibs, detectLibs, benchAll, benchTable, benchCross } from './libs.mjs';
import { CliError, DEFAULT_EXT, collect, pkgVersion, projectDir } from './util.mjs';
import { helpText, suggest } from './help.mjs';
import { setup, needsSetup } from './setup.mjs';
import { doctor } from './doctor.mjs';
import { deriveCommand } from './derive-cli.mjs';
import { hookCommand } from './hook.mjs';
import { derivedPath, hasDerived } from './derive.mjs';

const SHORT_FLAGS = { y: 'yes', v: 'version', h: 'help' };

const TEMPLATE = `myelin 1
id      my-rules
about   One line: what these rules are for
fires   keyword one | keyword two
status  DRAFT. Not yet tested against any model.

= note   Put budgets and versions here. Facts are read, not checked.

! B1 /console\\.log\\(/   No stray logging in library code. -> $example
+ R1 /export\\s/          Public API uses named exports. -> $example
~ P1 Keep functions small.

$ example
export function add(a, b) {
  return a + b;
}
$$
`;

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) flags[a.slice(2)] = true;
      else flags[a.slice(2, eq)] = a.slice(eq + 1);
    } else if (/^-[yvh]$/.test(a)) flags[SHORT_FLAGS[a[1]]] = true;
    else pos.push(a);
  }
  return { pos, flags };
}

// The project that "derived" and .myelin/ignore belong to: --dir, else the working directory.
let PROJECT = process.cwd();

function ledgerFile(name) {
  if (existsSync(name)) return name;
  const lib = libPath(name);
  if (lib) return lib;
  if (name === 'derived' && existsSync(derivedPath(PROJECT))) return derivedPath(PROJECT);
  return null;
}

function resolveLedger(path) {
  const found = ledgerFile(path);
  if (found) return found;
  if (path === 'derived') throw new CliError('no .myelin/derived.myelin here; run "myelin derive" first');
  throw new CliError(`cannot read ${path} (not a file or a bundled lib; run "myelin libs")`);
}

// Rule ids a project has chosen to leave out: one per line in .myelin/ignore, and --ignore=A,B.
function ignoreSet(flags) {
  if (flags.ignore === true) throw new CliError('--ignore needs rule ids, e.g. --ignore=react-B3,zod-ZodString-email');
  const ids = new Set(String(flags.ignore || '').split(',').map((s) => s.trim()).filter(Boolean));
  const file = join(PROJECT, '.myelin', 'ignore');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const id = line.replace(/#.*/, '').trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

function load(path) {
  if (!path) throw new CliError('missing ledger path');
  path = resolveLedger(path);
  return parse(readFileSync(path, 'utf8'));
}

function printProblems(file, ledger, log) {
  for (const p of ledger.problems) log(`${file}:${p.line}: ${p.level}: ${p.message}`);
}

function plain(ledger) {
  return {
    id: ledger.header.id,
    rules: ledger.rules.length,
    prefs: ledger.prefs.length,
    snippets: Object.keys(ledger.snippets).length,
    problems: ledger.problems,
  };
}

function requireValid(file, ledger) {
  if (!ledger.ok) {
    printProblems(file, ledger, console.error);
    throw new CliError(`${file} is not a valid ledger`, 1);
  }
}

function summary(result) {
  const { bans, requires, units } = result.counts;
  return (
    `${bans} bans, ${requires} requires, ${units} unit(s) checked: ` +
    (result.ok ? 'clean' : `${result.violations.length} failure(s)`)
  );
}

function reportCheck(result, log) {
  for (const v of result.violations) {
    if (v.kind === 'ban') {
      log(`FAIL ${v.id}  ${v.unit}${v.line ? ':' + v.line : ''}  ${v.message}${v.ref ? '  (-> $' + v.ref + ')' : ''}`);
    } else {
      log(`FAIL ${v.id}  missing  ${v.message}${v.ref ? '  (-> $' + v.ref + ')' : ''}`);
    }
  }
  log(summary(result));
}

// fix: one block per failing rule. A requirement has no place to point at, so it is "missing".
function reportFix(ledger, result, log) {
  for (const f of fixPlan(ledger, result)) {
    const where =
      f.kind === 'ban' ? f.places.map((p) => `${p.unit}${p.line ? ':' + p.line : ''}`).join(', ') : 'missing from all files';
    log(`FIX ${f.id}  ${f.message}`);
    log(`    ${where}`);
    if (f.snippet !== null) {
      log(`    snippet $${f.ref} (copy exact):`);
      log('```');
      log(f.snippet);
      log('```');
    }
  }
  log(summary(result));
}

// Shared by lint, lint --watch and fix: the ledgers named by <ledger> (a path, or a
// comma-separated list of paths and lib ids) and the text units under the targets.
function lintInputs(args, flags) {
  const [ledgerArg, ...targets] = args;
  if (!ledgerArg) throw new CliError('missing ledger path');
  const names = existsSync(ledgerArg) ? [ledgerArg] : ledgerArg.split(',').map((x) => x.trim()).filter(Boolean);
  const ledgers = names.map((n) => {
    const l = load(n);
    requireValid(n, l);
    return [n, l];
  });
  if (!targets.length) throw new CliError('missing file or directory to check');
  if (flags.ext === true) throw new CliError('--ext needs a value, e.g. --ext=js,ts');
  const exts = String(flags.ext || DEFAULT_EXT).split(',').map((x) => x.trim());
  const files = collect(targets, exts);
  if (!files.length) throw new CliError('no files to check');
  const units = files.map((f) => ({ name: f, text: readFileSync(f, 'utf8') }));
  return { names, ledgers, units, targets, ignore: ignoreSet(flags) };
}

function runLint(args, flags, log) {
  const { ledgers, units, ignore } = lintInputs(args, flags);
  const results = ledgers.map(([n, l]) => ({ ledger: n, ...check(l, units, { ignore }) }));
  const ok = results.every((r) => r.ok);
  if (flags.json) log(JSON.stringify(results.length === 1 ? results[0] : { ok, results }, null, 2));
  else
    for (const r of results) {
      if (results.length > 1) log(`[${r.ledger}]`);
      reportCheck(r, log);
    }
  return ok;
}

// Usage errors in the first run exit 2 like plain lint. After that a failing run is
// reported and the watch keeps going, since the author is probably mid-edit.
async function watchLint(args, flags, log) {
  const { names, targets } = lintInputs(args, flags);
  const ledgerFiles = names.map(ledgerFile).filter(Boolean);
  const job = () => {
    log(`\n[${new Date().toLocaleTimeString()}] lint`);
    runLint(args, flags, log);
  };
  log(`watching ${targets.join(', ')} (Ctrl-C to stop)`);
  return await watchLoop([...targets, ...ledgerFiles], job);
}

// The wizard runs by itself only when a person is at a terminal in a project with no .myelin/.
function wantsWizard(flags) {
  return !flags.help && process.stdin.isTTY && process.stdout.isTTY && needsSetup(process.cwd());
}

export async function main(argv) {
  const { pos, flags } = parseArgs(argv);
  const [cmd, ...args] = pos.length || !flags.version ? pos : ['version'];
  const log = (s) => console.log(s);

  try {
    PROJECT = projectDir(flags);
    if (cmd === undefined && wantsWizard(flags)) return await setup(flags);

    switch (cmd) {
      case undefined:
      case 'help':
        log(helpText());
        return cmd === undefined && !flags.help ? 2 : 0;

      case 'setup':
        return await setup(flags);

      case 'doctor':
        return doctor(flags);

      case 'derive':
        return deriveCommand(flags, log);

      case 'hook':
        return await hookCommand(args, flags, log);

      case 'validate': {
        const ledger = load(args[0]);
        if (flags.json) log(JSON.stringify({ ok: ledger.ok, ...plain(ledger) }, null, 2));
        else {
          printProblems(args[0], ledger, log);
          if (ledger.ok) log(`${args[0]}: ok (${ledger.rules.length} rules, ${Object.keys(ledger.snippets).length} snippets)`);
        }
        return ledger.ok ? 0 : 1;
      }

      case 'self': {
        if (!args.length) throw new CliError('missing ledger path');
        const files = collect(args, ['myelin']);
        if (!files.length) throw new CliError('no .myelin files found');
        let failed = false;
        const results = [];
        for (const f of files) {
          const ledger = load(f);
          if (!ledger.ok) {
            failed = true;
            if (!flags.json) {
              printProblems(f, ledger, log);
              log(`${f}: INVALID`);
            }
            results.push({ file: f, ok: false, problems: ledger.problems });
            continue;
          }
          if (!Object.keys(ledger.snippets).length) {
            if (!flags.json) log(`${f}: skipped (no snippets to self-test)`);
            results.push({ file: f, ok: true, skipped: true });
            continue;
          }
          const result = check(ledger, snippetUnits(ledger));
          if (!result.ok) failed = true;
          results.push({ file: f, ok: result.ok, violations: result.violations });
          if (!flags.json) {
            log(`${f}`);
            reportCheck(result, (s) => log('  ' + s));
          }
        }
        if (flags.json) log(JSON.stringify({ ok: !failed, results }, null, 2));
        return failed ? 1 : 0;
      }

      case 'lint': {
        if (flags.watch) return await watchLint(args, flags, log);
        return runLint(args, flags, log) ? 0 : 1;
      }

      case 'fix': {
        const { ledgers, units, ignore } = lintInputs(args, flags);
        const runs = ledgers.map(([name, ledger]) => ({ name, ledger, result: check(ledger, units, { ignore }) }));
        const ok = runs.every((r) => r.result.ok);
        if (flags.json) {
          const results = runs.map(({ name, ledger, result }) => ({ ledger: name, ...result, fixes: fixPlan(ledger, result) }));
          log(JSON.stringify(results.length === 1 ? results[0] : { ok, results }, null, 2));
        } else
          for (const { name, ledger, result } of runs) {
            if (runs.length > 1) log(`[${name}]`);
            reportFix(ledger, result, log);
          }
        return ok ? 0 : 1;
      }

      case 'libs': {
        const libs = listLibs();
        if (flags.json) {
          log(JSON.stringify(libs, null, 2));
          return 0;
        }
        if (!libs.length) {
          log('no bundled libs');
          return 0;
        }
        const w = Math.max(...libs.map((l) => l.id.length));
        for (const l of libs) log(`${l.id.padEnd(w)}  ${String(l.version).padEnd(10)}  ${String(l.bans).padStart(3)} bans  ${l.snippets} snippets  ${l.name}`);
        return 0;
      }

      case 'detect': {
        const dir = args[0] || '.';
        const { found } = detectLibs(dir);
        // The ledger `myelin derive` wrote is part of the project, so it is part of what to lint with.
        const all = hasDerived(dir) ? [...found, { id: 'derived', matched: ['.myelin/derived.myelin'] }] : found;
        if (flags.json) {
          log(JSON.stringify(all.map((f) => ({ id: f.id, matched: f.matched })), null, 2));
          return 0;
        }
        if (!all.length) {
          log('no bundled libs match this project');
          return 0;
        }
        for (const f of all) log(`${f.id}  (${f.matched.join(', ')})`);
        log(`\nlint with: myelin lint ${all.map((f) => f.id).join(',')} src/`);
        return 0;
      }

      case 'use': {
        const id = args[0];
        if (!id) throw new CliError('missing lib id');
        const src = libPath(id);
        if (!src) throw new CliError(`no bundled lib named ${id}. Run "myelin libs".`, 1);
        const dir = join(args[1] || '.', '.myelin');
        mkdirSync(dir, { recursive: true });
        const dest = join(dir, `${id}.myelin`);
        if (existsSync(dest) && !flags.force) throw new CliError(`${dest} exists; pass --force to overwrite`, 1);
        copyFileSync(src, dest);
        log(`wrote ${dest}`);
        return 0;
      }

      case 'bench': {
        if (flags.cross) {
          const r = benchCross(args);
          if (flags.json) log(JSON.stringify(r, null, 2));
          else {
            for (const h of r.hits) log(`  ${h.ledger} fired ${h.ban} on ${h.file}`);
            log(`${r.ledgers} ledgers x other libs' good files: ${r.checks} checks, ${r.hits.length} cross-library false positive(s)`);
          }
          return r.hits.length ? 1 : 0;
        }
        let results;
        try {
          results = benchAll(args);
        } catch (e) {
          throw new CliError(e.message, 1);
        }
        if (flags.json) log(JSON.stringify(results, null, 2));
        else {
          log(benchTable(results, { markdown: !!flags.md }));
          if (flags.verbose)
            for (const r of results)
              for (const f of r.files)
                if (!f.exact) log(`  ${r.id}/${f.file}: expected [${f.expected}] fired [${f.fired}]`);
        }
        const perfect = results.every((r) => r.fp === 0 && r.fn === 0);
        return perfect || flags.md ? 0 : 1;
      }

      case 'gate': {
        const ledger = load(args[0]);
        requireValid(args[0], ledger);
        let snippets = [];
        if (flags.all) snippets = 'all';
        else if (typeof flags.snippets === 'string') snippets = flags.snippets.split(',').map((s) => s.trim());
        if (Array.isArray(snippets)) {
          for (const id of snippets) {
            if (!ledger.snippets[id]) throw new CliError(`no snippet named ${id}`, 1);
          }
        }
        log(renderGate(ledger, { snippets }));
        return 0;
      }

      case 'header': {
        const ledger = load(args[0]);
        requireValid(args[0], ledger);
        log(renderHeader(ledger));
        return 0;
      }

      case 'snippet': {
        const ledger = load(args[0]);
        requireValid(args[0], ledger);
        const s = ledger.snippets[args[1]];
        if (!s) throw new CliError(`no snippet named ${args[1]}`, 1);
        log(s.code);
        return 0;
      }

      case 'init': {
        if (!args[0]) throw new CliError('missing output path');
        if (existsSync(args[0])) throw new CliError(`${args[0]} already exists; not overwriting`, 1);
        writeFileSync(args[0], TEMPLATE);
        log(`wrote ${args[0]}`);
        return 0;
      }

      case 'version':
        log(pkgVersion());
        return 0;

      default: {
        const near = suggest(cmd);
        const hint = near.length ? ` Did you mean ${near.map((c) => `"${c}"`).join(' or ')}?` : '';
        throw new CliError(`unknown command "${cmd}".${hint} Run "myelin help".`);
      }
    }
  } catch (e) {
    if (e instanceof CliError) {
      console.error(`myelin: ${e.message}`);
      return e.code;
    }
    throw e;
  }
}
