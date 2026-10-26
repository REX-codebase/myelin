// Helpers shared by the CLI commands: errors, package metadata, file collection.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DEFAULT_EXT = 'js,mjs,cjs,jsx,ts,tsx,py,html,wgsl,glsl';

// A user-facing failure. The CLI prints the message and exits with the code.
export class CliError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

export function pkgVersion() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
}

// --dir=<path> for the commands that work on a project; defaults to the working directory.
export function projectDir(flags) {
  if (flags.dir === true) throw new CliError('--dir needs a value, e.g. --dir=packages/web');
  return resolve(flags.dir || '.');
}

export function collect(paths, exts) {
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
