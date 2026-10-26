// usage: node render.mjs <html> <out.png> [waitMs]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [file, out, wait = '12000'] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const EXTRA = (process.env.CHFLAGS || '--use-gl=angle --use-angle=swiftshader --enable-features=Vulkan --use-vulkan=swiftshader').split(' ').filter(Boolean);
const ch = spawn('chromium', ['--headless=new', '--no-sandbox', '--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--hide-scrollbars', ...EXTRA, '--window-size=1280,720', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = t.find((x) => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  if (m.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Log.entryAdded' && m.params.entry.level !== 'verbose') logs.push(`[log-${m.params.entry.level}] ` + m.params.entry.text.slice(0, 300)); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: file.startsWith('http') ? file : 'file://' + file });
await sleep(+wait);
const fps = await send('Runtime.evaluate', { expression: 'new Promise(r=>{let n=0;const t=performance.now();function f(){n++;if(performance.now()-t<3000)requestAnimationFrame(f);else r(n/3)}requestAnimationFrame(f)})', awaitPromise: true, returnByValue: true });
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(JSON.stringify({ file, rafPerSec: fps?.result?.value, logs: [...new Set(logs)].slice(0, 25) }, null, 1));
ch.kill('SIGKILL'); process.exit(0);
