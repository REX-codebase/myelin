import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Every Markdown file a reader can land on, excluding vendored and generated trees. */
function markdownFiles(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', '.wild', 'outputs', 'bench'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) markdownFiles(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** GitHub's heading anchor: lowercase, drop punctuation, spaces to hyphens. */
const slug = (h) => h.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const anchors = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)].map((m) => slug(m[1])));

const files = markdownFiles();

test('there are Markdown files to check', () => {
  assert.ok(files.length >= 8, `found only ${files.length}`);
});

test('every relative link and image in the docs points at a file that exists', () => {
  const broken = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, ''); // links inside code fences are examples
    const refs = [
      ...[...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]),
      ...[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
    ];
    for (const ref of refs) {
      if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
      const [path] = ref.split('#');
      if (!path) continue;
      if (!existsSync(normalize(join(dirname(file), path)))) broken.push(`${relative(ROOT, file)} -> ${ref}`);
    }
  }
  assert.deepEqual(broken, [], `broken relative links:\n  ${broken.join('\n  ')}`);
});

test('every #anchor into a Markdown file matches a real heading', () => {
  const broken = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const m of text.matchAll(/\]\(([^)\s#]*)#([^)\s]+)\)/g)) {
      const [, path, anchor] = m;
      const target = path ? normalize(join(dirname(file), path)) : file;
      if (!target.endsWith('.md') || !existsSync(target)) continue;
      if (!anchors(target).has(anchor.toLowerCase())) broken.push(`${relative(ROOT, file)} -> ${path}#${anchor}`);
    }
  }
  assert.deepEqual(broken, [], `anchors with no matching heading:\n  ${broken.join('\n  ')}`);
});
