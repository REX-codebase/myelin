#!/usr/bin/env node
// Compare the version each ledger is pinned to with the registry's latest release: npm,
// or PyPI for a pin with "registry": "pypi" (the Blender ledger tracks the bpy wheel).
//
//   node scripts/drift.mjs                 a table
//   node scripts/drift.mjs --md            a Markdown table, for an issue or a job summary
//   node scripts/drift.mjs --json          the rows as JSON
//   node scripts/drift.mjs --json-file f   also write the rows to f
//   node scripts/drift.mjs --strict        exit 1 if any ledger is behind by a minor or major
//
// Ledgers are pinned to one release and a research date, so they go stale. This is the
// check that says when. The pins live in libs/pins.json, and test/drift.test.mjs makes sure each
// one is the version the ledger's own `= version` line names.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REGISTRY = (process.env.MYELIN_NPM_REGISTRY || 'https://registry.npmjs.org').replace(/\/$/, '');
const PYPI = (process.env.MYELIN_PYPI_REGISTRY || 'https://pypi.org').replace(/\/$/, '');

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

/**
 * How far behind npm's latest is a pin?
 *   current  same version        patch  only a newer patch: ignored
 *   minor    a newer minor       major  a newer major, or any newer 0.x minor (0.x minors may break)
 *   ahead    the pin is newer than npm's latest tag
 */
export function classify(pinned, latest) {
  const p = parse(pinned);
  const l = parse(latest);
  if (!p || !l) return 'unknown';
  for (let i = 0; i < 3; i++) {
    if (l[i] < p[i]) return 'ahead';
    if (l[i] > p[i]) break;
    if (i === 2) return 'current';
  }
  if (l[0] > p[0]) return 'major';
  if (p[0] === 0 && l[1] > p[1]) return 'major';
  if (l[1] > p[1]) return 'minor';
  return 'patch';
}

const get = async (url, accept = 'application/json') => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { accept } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** The newest stable version: npm's `latest` tag, unless that tag points at a prerelease. */
async function latestOf(pkg) {
  const base = `${REGISTRY}/${pkg.replace('/', '%2f')}`;
  const { version } = await get(`${base}/latest`);
  if (!version.includes('-')) return { version };
  // A package whose `latest` is a release candidate (Prisma 8 today): its ledger targets the stable line,
  // so compare with the newest version that has no prerelease suffix instead of crying wolf.
  const packument = await get(base, 'application/vnd.npm.install-v1+json');
  const stable = Object.keys(packument.versions || {}).filter((v) => !v.includes('-') && parse(v));
  stable.sort((a, b) => { const x = parse(a), y = parse(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  return { version: stable.at(-1) || version, tagged: version };
}

/** The newest stable release PyPI knows: `info.version`, unless that is a prerelease (a, b, rc, dev). */
async function latestOfPypi(pkg) {
  const { info, releases = {} } = await get(`${PYPI}/pypi/${encodeURIComponent(pkg)}/json`);
  if (/^\d+\.\d+\.\d+$/.test(info.version)) return { version: info.version };
  const stable = Object.keys(releases).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
  stable.sort((a, b) => { const x = parse(a), y = parse(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  return { version: stable.at(-1) || info.version };
}

export async function check(pins) {
  return Promise.all(Object.entries(pins).map(async ([id, { package: pkg, version, registry }]) => {
    const from = registry === 'pypi' ? { registry } : {};
    try {
      const { version: latest, tagged } = await (registry === 'pypi' ? latestOfPypi(pkg) : latestOf(pkg));
      return { id, package: pkg, ...from, pinned: version, latest, ...(tagged ? { npmLatestTag: tagged } : {}), status: classify(version, latest) };
    } catch (e) {
      return { id, package: pkg, ...from, pinned: version, latest: null, status: 'unknown', error: String(e.message || e) };
    }
  }));
}

const NOTE = {
  current: 'up to date', patch: 'newer patch only', ahead: 'pin is newer than npm latest',
  minor: 'newer minor: check the release notes for deprecations', major: 'newer major: the ledger is probably stale', unknown: 'could not check'
};

export function markdown(rows, when = new Date().toISOString().slice(0, 10)) {
  const behind = rows.filter((r) => r.status === 'major' || r.status === 'minor');
  const out = [];
  out.push(`Checked ${rows.length} ledgers against the latest release on npm (PyPI for \`bpy\`) on ${when}. **${behind.length} behind by a minor or major.**`, '');
  out.push('| ledger | package | pinned | npm latest | status |', '|---|---|---|---|---|');
  const order = { major: 0, minor: 1, unknown: 2, patch: 3, ahead: 4, current: 5 };
  for (const r of [...rows].sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id))) {
    const note = r.npmLatestTag ? ` (npm's \`latest\` tag is the prerelease ${r.npmLatestTag}; compared with the newest stable)` : '';
    out.push(`| ${r.id} | \`${r.package}\`${r.registry === 'pypi' ? ' (PyPI)' : ''} | ${r.pinned} | ${r.latest ?? 'n/a'} | ${r.status}: ${NOTE[r.status]}${note} |`);
  }
  out.push('', 'To fix one: re-verify the ledger against the new release (docs/AUTHORING.md), then update its `= version` and `= verified` lines and its entry in `libs/pins.json` together. Generated by `scripts/drift.mjs`.');
  return out.join('\n');
}

function table(rows) {
  const w = (k) => Math.max(k.length, ...rows.map((r) => String(r[k] ?? 'n/a').length));
  const cols = ['id', 'package', 'pinned', 'latest', 'status'];
  const widths = cols.map(w);
  const line = (r) => cols.map((c, i) => String(r[c] ?? 'n/a').padEnd(widths[i])).join('  ');
  return [line(Object.fromEntries(cols.map((c) => [c, c]))), ...rows.map(line)].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pins = JSON.parse(readFileSync(new URL('../libs/pins.json', import.meta.url), 'utf8'));
  const rows = await check(pins);
  const fileAt = args.indexOf('--json-file');
  if (fileAt >= 0) writeFileSync(args[fileAt + 1], JSON.stringify(rows, null, 2));
  if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else if (args.includes('--md')) console.log(markdown(rows));
  else console.log(table(rows));
  const behind = rows.some((r) => r.status === 'major' || r.status === 'minor');
  if (args.includes('--strict') && behind) process.exit(1);
}
