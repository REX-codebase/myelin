#!/usr/bin/env node
// Does a hook change what an AI agent ships? Runs the real Claude Code CLI (`claude -p`) on three
// small tasks, in three arms, and scores every file it writes against the derived ledger.
//
//   none   no ledger, no hooks: the model as it comes
//   post   `myelin hook post` after every Edit/MultiEdit/Write (the findings come back to the model)
//   both   post, plus `myelin hook session` (the rules are in context before it writes)
//
// The first draft is the first Write the agent made; "final" is the file when it stopped. Both are
// linted with the same derived ledger, so "stale" means the file uses an API that the installed
// declarations mark @deprecated. Needs: `claude` on PATH and logged in, npm and network (once).
//
//   node eval/hook-ab/run.mjs [dir] [--reps=2] [--arms=none,post,both] [--tasks=form,label,schema]
//
// Runs are nondeterministic and few. Read the numbers as a demonstration of the mechanism, not a rate.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parse.mjs';
import { check } from '../../src/check.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const BIN = resolve(HERE, '../../bin/myelin.mjs');
const flag = (name, def) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] || def;
const DIR = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || '.hook-ab');
const reps = Number(flag('reps', 2));
const arms = flag('arms', 'none,post,both').split(',');
const only = flag('tasks', 'form,label,schema').split(',');

const TASKS = {
  form: { file: 'src/Form.tsx', prompt: 'Create src/Form.tsx: a React 19 TypeScript component SignupForm with a controlled email input, a password input, and a submit handler typed with the appropriate React event type. Use a ref for the email input. Write the file with a single Write call, then stop.' },
  label: { file: 'src/ui/label.tsx', prompt: 'Create src/ui/label.tsx: a shadcn/ui-style Label component for React 19 + TypeScript that wraps @radix-ui/react-label and forwards its ref (use React.forwardRef, type the ref and props the way shadcn does). Write the file with a single Write call, then stop.' },
  schema: { file: 'src/schema.ts', prompt: 'Create src/schema.ts: a zod schema named signupSchema for a signup form with email, password (min 8), id (uuid), an optional website URL, and an age that is a positive integer. Export the inferred type too. Write the file with a single Write call, then stop.' },
};

// 1. a project with the libraries installed, and the ledger derived from them
const project = join(DIR, 'project');
if (!existsSync(join(project, 'node_modules'))) {
  mkdirSync(project, { recursive: true });
  copyFileSync(join(HERE, 'package.json'), join(project, 'package.json'));
  const i = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: project, stdio: 'inherit' });
  if (i.status !== 0) process.exit(2);
}
const d = spawnSync(process.execPath, [BIN, 'derive', `--dir=${project}`], { encoding: 'utf8' });
if (d.status !== 0) {
  console.error(d.stderr || d.stdout);
  process.exit(2);
}
const ledgerFile = join(project, '.myelin', 'derived.myelin');
const ledger = parse(readFileSync(ledgerFile, 'utf8'));
const stale = (text, name) => check(ledger, [{ name, text }]).violations.map((v) => v.id);

// 2. the runs
const out = [];
for (const task of only) for (const arm of arms) for (let rep = 1; rep <= reps; rep++) {
  const run = join(DIR, 'runs', `${task}-${arm}-${rep}`);
  rmSync(run, { recursive: true, force: true });
  mkdirSync(join(run, '.claude'), { recursive: true });
  mkdirSync(join(run, 'src', 'ui'), { recursive: true });
  copyFileSync(join(project, 'package.json'), join(run, 'package.json'));
  symlinkSync(join(project, 'node_modules'), join(run, 'node_modules'));
  if (arm !== 'none') {
    mkdirSync(join(run, '.myelin'));
    copyFileSync(ledgerFile, join(run, '.myelin', 'derived.myelin'));
    // the wrapper records every payload Claude Code sends, then hands it to Myelin unchanged
    writeFileSync(join(run, 'hookwrap.sh'), `#!/bin/sh\ninput=$(cat)\nprintf '%s\\n' "$input" >> "${join(run, 'payloads.jsonl')}"\nprintf '%s' "$input" | node "${BIN}" hook post\n`, { mode: 0o755 });
    const hooks = { PostToolUse: [{ matcher: 'Edit|MultiEdit|Write', hooks: [{ type: 'command', command: `sh "${join(run, 'hookwrap.sh')}"`, timeout: 30 }] }] };
    if (arm === 'both') hooks.SessionStart = [{ hooks: [{ type: 'command', command: `node "${BIN}" hook session`, timeout: 30 }] }];
    writeFileSync(join(run, '.claude', 'settings.json'), JSON.stringify({ hooks }, null, 2));
  }
  const t = Date.now();
  const res = spawnSync('claude', ['-p', TASKS[task].prompt, '--permission-mode', 'acceptEdits', '--allowedTools', 'Write Edit MultiEdit', '--max-turns', '8', '--output-format', 'text'], { cwd: run, encoding: 'utf8', timeout: 240000 });
  const payloads = join(run, 'payloads.jsonl');
  const writes = existsSync(payloads) ? readFileSync(payloads, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.tool_name === 'Write') : [];
  const finalText = existsSync(join(run, TASKS[task].file)) ? readFileSync(join(run, TASKS[task].file), 'utf8') : '';
  const first = writes.length ? writes[0].tool_input.content : finalText; // the 'none' arm has no log: its one Write is the final file
  const row = { task, arm, rep, seconds: Math.round((Date.now() - t) / 1000), writes: writes.length, firstDraft: stale(first, TASKS[task].file), final: stale(finalText, TASKS[task].file), wrote: !!finalText, exit: res.status };
  out.push(row);
  console.log(JSON.stringify(row));
}

// 3. the summary
const rows = (a) => out.filter((r) => r.arm === a);
const summary = Object.fromEntries(arms.map((a) => [a, { runs: rows(a).length, firstDraftStale: rows(a).filter((r) => r.firstDraft.length).length, finalStale: rows(a).filter((r) => r.final.length).length }]));
console.log('\narm    runs  first draft stale  final file stale');
for (const a of arms) console.log(`${a.padEnd(6)} ${String(summary[a].runs).padStart(4)}  ${String(summary[a].firstDraftStale).padStart(17)}  ${String(summary[a].finalStale).padStart(16)}`);
writeFileSync(join(HERE, 'results.json'), JSON.stringify({ reps, summary, runs: out }, null, 2) + '\n');
