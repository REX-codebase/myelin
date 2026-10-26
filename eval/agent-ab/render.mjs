// Renders agent pages in headless Chromium (WebGPU on SwiftShader) and records console output.
// usage: node render.mjs <three-package-dir> <out-dir> <page.html>...
// Pages import three from jsdelivr; requests for it are answered from a local copy of
// three@0.186.1, so runs need no network and every page sees the same build.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, dirname, extname } from 'node:path';

const [threeDir, outDir, ...pages] = process.argv.slice(2);
if (!threeDir || !outDir || !pages.length) {
  console.error('usage: node render.mjs <three-package-dir> <out-dir> <page.html>...');
  process.exit(2);
}
const WAIT = +(process.env.WAIT_MS || 15000);
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2' };

// playwright is a dev-time tool, not a dependency: resolve it from the global install.
const { chromium } = createRequire(import.meta.url)('playwright');

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--ignore-gpu-blocklist'],
});
const report = {};
for (const page of pages) {
  const name = basename(dirname(resolve(page)));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
  p.on('pageerror', (e) => logs.push(`[exception] ${String(e.message).slice(0, 300)}`));
  await p.route('**/*', (route) => {
    const url = route.request().url();
    if (CDN.test(url)) {
      const file = join(threeDir, url.replace(CDN, '').split('?')[0]);
      if (existsSync(file)) return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: 'not in three@0.186.1' });
    }
    if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.fulfill({ status: 404, body: 'offline' });
  });
  await p.goto('file://' + resolve(page));
  await p.waitForTimeout(WAIT);
  const gpu = await p.evaluate(() => !!navigator.gpu);
  await p.screenshot({ path: join(outDir, `${name}.png`) });
  report[name] = { webgpu: gpu, logs: [...new Set(logs)].slice(0, 30) };
  await ctx.close();
}
await browser.close();
// SHOT_ONLY: agents get pictures, never console output, so runtime warnings
// cannot steer any arm; only the harness reads the logs.
if (process.env.SHOT_ONLY) console.log(pages.map((pg) => join(outDir, basename(dirname(resolve(pg))) + '.png')).join('\n'));
else {
  writeFileSync(join(outDir, 'render.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}
