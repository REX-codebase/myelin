import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parse } from './parse.mjs';
import { check, snippetUnits } from './check.mjs';
import { renderGate, renderHeader } from './gate.mjs';
import { fixPlan } from './fix.mjs';
import { watchLoop } from './watch.mjs';
import { libPath, listLibs, detectLibs, benchAll, benchTable, benchCross } from './libs.mjs';
import { mkdirSync, copyFileSync } from 'node:fs';

const DEFAULT_EXT = 'js,mjs,cjs,jsx,ts,tsx,py,html,wgsl,glsl';

const HELP = `myelin - check LLM output against a .myelin rule ledger

<ledger> is a path to a .myelin file, or the id of a bundled lib (e.g. three, react).
lint also takes several, comma-separated: myelin lint three,react src/

usage:
  myelin libs                              list bundled library ledgers
  myelin detect [dir]                      suggest libs from a project's package.json
  myelin use <lib> [dir]                   copy a bundled ledger into <dir>/.myelin/
  myelin bench [lib...]                    score libs on their labelled corpus (--md table, --cross false-positive sweep)
  myelin validate <ledger>                 parse the ledger and report problems
  myelin self <ledger|dir>...              validate, then run the ledger's own snippets through its rules
  myelin lint <ledger> <file|dir>...       check files against the ledger (--ext=js,ts to filter dirs, --watch to re-run on change)
  myelin fix <ledger> <file|dir>...        like lint, but prints each failing rule's fix message and snippet once (read-only)
  myelin gate <ledger> [--snippets=a,b|--all]   print the rules as text for a model
  myelin header <ledger>                   print only the short L0 header
  myelin snippet <ledger> <id>             print one copy-exact snippet
  myelin init <path>                       write a starter ledger
  myelin version                           print the version (also --version)

flags:  --json  machine-readable output (validate, self, lint, fix)
        --watch  lint: re-run when files change; Ctrl-C to stop
exit codes: 0 clean, 1 rule failures or invalid ledger, 2 usage or file error
`;

class CliError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) flags[a.slice(2)] = true;
      else flags[a.slice(2, eq)] = a.slice(eq + 1);
    } else pos.push(a);
  }
  return { pos, flags };
}

function resolveLedger(path) {
  if (existsSync(path)) return path;
  const lib = libPath(path);
  if (lib) return lib;
  throw new CliError(`cannot read ${path} (not a file or a bundled lib; run "myelin libs")`);
}

function load(path) {
  if (!path) throw new CliError('missing ledger path');
  path = resolveLedger(path);
  return parse(readFileSync(path, 'utf8'));
}

function collect(paths, exts) {
  const out = [];
  const visit = (p, top) => {
    if (!existsSync(p)) throw new CliError(`cannot read ${p}`);
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const n of readdirSync(p).sort()) {
        if (n === 'node_modules' || n === '.git') continue;
        visit(join(p, n), false);
      }
    } else if (top || exts.includes(extname(p).slice(1))) {
      out.push(p);
    }
  };
  for (const p of paths) visit(p, true);
  return out;
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
  return { names, ledgers, units, targets };
}

function runLint(args, flags, log) {
  const { ledgers, units } = lintInputs(args, flags);
  const results = ledgers.map(([n, l]) => ({ ledger: n, ...check(l, units) }));
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
  const ledgerFiles = names.map((n) => (existsSync(n) ? n : libPath(n))).filter(Boolean);
  const job = () => {
    log(`\n[${new Date().toLocaleTimeString()}] lint`);
    runLint(args, flags, log);
  };
  log(`watching ${targets.join(', ')} (Ctrl-C to stop)`);
  return await watchLoop([...targets, ...ledgerFiles], job);
}

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

export async function main(argv) {
  const { pos, flags } = parseArgs(argv);
  const [cmd, ...args] = pos.length || !flags.version ? pos : ['version'];
  const log = (s) => console.log(s);

  try {
    switch (cmd) {
      case undefined:
      case 'help':
        log(HELP);
        return cmd === undefined && !flags.help ? 2 : 0;

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
        const { ledgers, units } = lintInputs(args, flags);
        const runs = ledgers.map(([name, ledger]) => ({ name, ledger, result: check(ledger, units) }));
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
        if (flags.json) {
          log(JSON.stringify(found.map((f) => ({ id: f.id, matched: f.matched })), null, 2));
          return 0;
        }
        if (!found.length) {
          log('no bundled libs match this project');
          return 0;
        }
        for (const f of found) log(`${f.id}  (${f.matched.join(', ')})`);
        log(`\nlint with: myelin lint ${found.map((f) => f.id).join(',')} src/`);
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
        log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
        return 0;

      default:
        throw new CliError(`unknown command "${cmd}". Run "myelin help".`);
    }
  } catch (e) {
    if (e instanceof CliError) {
      console.error(`myelin: ${e.message}`);
      return e.code;
    }
    throw e;
  }
}
