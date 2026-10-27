// Help text and "did you mean" suggestions. Plain text when piped; colour only on a TTY.
import * as ui from './ui.mjs';

export const COMMANDS = [
  'setup', 'doctor', 'libs', 'detect', 'derive', 'hook', 'use', 'bench', 'validate', 'self',
  'lint', 'fix', 'gate', 'header', 'snippet', 'init', 'version', 'help',
];

const COL = 36;

const SECTIONS = [
  ['Get started', [
    ['myelin setup', 'detect libs, write .myelin/ and the AGENTS.md block'],
    ['myelin doctor', 'check Node, this install and the project'],
    ['myelin detect [dir]', 'suggest bundled libs from package.json'],
    ['myelin libs', 'list bundled library ledgers'],
    ['myelin derive', 'read the deprecations of your installed packages into a ledger'],
  ]],
  ['Everyday', [
    ['myelin lint <ledger> <path>...', 'check files; several ledgers comma-separated'],
    ['myelin fix <ledger> <path>...', 'lint, plus the fix and snippet for each rule'],
    ['myelin gate <ledger>', 'print the rules as text for a model'],
    ['myelin self <ledger|dir>...', 'run a ledger\'s own snippets through its rules'],
  ]],
  ['Agents', [
    ['myelin hook install', 'check every edit Claude Code makes; brief it at session start'],
    ['myelin hook uninstall', 'remove those hooks again'],
    ['myelin derive --explain [name]', 'say why a deprecated API did not become a rule'],
    ['myelin derive --check', 'exit 1 if the derived ledger is older than node_modules'],
  ]],
  ['Authoring', [
    ['myelin init <path>', 'write a starter ledger'],
    ['myelin validate <ledger>', 'parse a ledger and report problems'],
    ['myelin snippet <ledger> <id>', 'print one copy-exact snippet'],
    ['myelin header <ledger>', 'print only the short L0 header'],
    ['myelin use <lib> [dir]', 'copy a bundled ledger into <dir>/.myelin/'],
    ['myelin bench [lib...]', 'score libs on their labelled corpus'],
  ]],
];

const EXAMPLES = [
  ['myelin setup --yes', 'accept the detected defaults'],
  ['myelin lint react,tailwind src/', 'check src/ against two ledgers'],
  ['myelin lint react src/ --watch', 're-run as files change'],
  ['myelin doctor --json', 'machine-readable health check'],
  ['myelin lint derived,react src/', 'derived is the ledger written by myelin derive'],
];

const FLAGS = [
  ['--json', 'machine-readable output (validate, self, lint, fix, doctor)'],
  ['--watch', 'lint: re-run when files change; Ctrl-C to stop'],
  ['--yes, -y', 'setup: accept the detected defaults without asking'],
  ['--target=<t>', 'setup: agents (AGENTS.md), claude (CLAUDE.md) or none'],
  ['--libs=<a,b>', 'setup: choose ledgers instead of detecting them'],
  ['--dry-run', 'setup: print what would change, write nothing'],
  ['--dir=<path>', 'setup, doctor, derive, hook: project directory (default: .)'],
  ['--ignore=<ids>', 'lint, fix: leave these rule ids out (also .myelin/ignore)'],
  ['--only=<pkgs>', 'derive: restrict to these packages'],
  ['--derive, --hook', 'setup: also derive a ledger / install the Claude Code hook'],
  ['--no-derive, --no-hook', 'setup: skip them'],
  ['--version, -v', 'print the version and nothing else'],
];

const row = ([cmd, desc]) => `  ${cmd.padEnd(COL)}${desc}`;

export function helpText() {
  const out = [ui.banner(), ''];
  out.push('<ledger> is a .myelin file path or a bundled lib id (react, tailwind, ...).', '');
  for (const [title, rows] of SECTIONS) {
    out.push(ui.brand(title), ...rows.map(row), '');
  }
  out.push(ui.brand('Examples'), ...EXAMPLES.map(row), '');
  out.push(ui.brand('Flags'), ...FLAGS.map(row), '');
  out.push(ui.brand('Exit codes'), '  0 clean   1 rule failures or invalid ledger   2 usage or file error');
  return out.join('\n');
}

// Optimal string alignment distance: a swap ("lnit") costs one edit, like a typo should.
export function editDistance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Up to two close matches. Short words get one typo of slack, longer ones a third of their length.
export function suggest(word, candidates = COMMANDS) {
  const max = Math.max(1, Math.floor(word.length / 3));
  return candidates
    .map((c) => [c, editDistance(word, c)])
    .filter(([, d]) => d <= max)
    .sort((x, y) => x[1] - y[1])
    .slice(0, 2)
    .map(([c]) => c);
}
