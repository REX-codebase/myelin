import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parse } from './parse.mjs';
import { check, snippetUnits } from './check.mjs';
import { renderGate, renderHeader } from './gate.mjs';

const DEFAULT_EXT = 'js,mjs,cjs,jsx,ts,tsx,py,html,wgsl,glsl';

const HELP = `myelin - check LLM output against a .myelin rule ledger

usage:
  myelin validate <ledger>                 parse the ledger and report problems
  myelin self <ledger|dir>...              validate, then run the ledger's own snippets through its rules
  myelin lint <ledger> <file|dir>...       check files against the ledger (--ext=js,ts to filter dirs)
  myelin gate <ledger> [--snippets=a,b|--all]   print the rules as text for a model
  myelin header <ledger>                   print only the short L0 header
  myelin snippet <ledger> <id>             print one copy-exact snippet
  myelin init <path>                       write a starter ledger

flags:  --json  machine-readable output (validate, self, lint)
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

function load(path) {
  if (!path) throw new CliError('missing ledger path');
  if (!existsSync(path)) throw new CliError(`cannot read ${path}`);
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

function reportCheck(result, log) {
  for (const v of result.violations) {
    if (v.kind === 'ban') {
      log(`FAIL ${v.id}  ${v.unit}${v.line ? ':' + v.line : ''}  ${v.message}${v.ref ? '  (-> $' + v.ref + ')' : ''}`);
    } else {
      log(`FAIL ${v.id}  missing  ${v.message}${v.ref ? '  (-> $' + v.ref + ')' : ''}`);
    }
  }
  const { bans, requires, units } = result.counts;
  log(
    `${bans} bans, ${requires} requires, ${units} unit(s) checked: ` +
      (result.ok ? 'clean' : `${result.violations.length} failure(s)`),
  );
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
  const [cmd, ...args] = pos;
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
        const [ledgerPath, ...targets] = args;
        const ledger = load(ledgerPath);
        requireValid(ledgerPath, ledger);
        if (!targets.length) throw new CliError('missing file or directory to check');
        const exts = String(flags.ext || DEFAULT_EXT).split(',').map((s) => s.trim());
        const files = collect(targets, exts);
        if (!files.length) throw new CliError('no files to check');
        const units = files.map((f) => ({ name: f, text: readFileSync(f, 'utf8') }));
        const result = check(ledger, units);
        if (flags.json) log(JSON.stringify(result, null, 2));
        else reportCheck(result, log);
        return result.ok ? 0 : 1;
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
