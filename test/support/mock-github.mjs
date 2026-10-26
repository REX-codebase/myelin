// A stand-in for the parts of GitHub the installers talk to, so they can be tested without the network.
//
//   node test/support/mock-github.mjs <dir>     serve <dir> and print the base URL on the first line
//
// Routes, all under /REX-codebase/myelin:
//   GET /releases/latest                 302 to /releases/tag/<tag>, or to /releases when <dir>/NO_RELEASE exists
//   GET /releases                        200
//   GET /releases/tag/<tag>              200
//   GET /releases/download/<tag>/<file>  the file of that name in <dir>, or 404
//   GET /tar.gz/<ref>                    <dir>/ref.tar.gz  (stands in for codeload.github.com)
//   GET /zip/<ref>                       <dir>/ref.zip
// The tag served is the contents of <dir>/TAG (default v9.9.9).
import { createServer } from 'node:http';
import { existsSync, readFileSync, createReadStream, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const PREFIX = '/REX-codebase/myelin';

export function startMock(dir) {
  const tag = () => (existsSync(join(dir, 'TAG')) ? readFileSync(join(dir, 'TAG'), 'utf8').trim() : 'v9.9.9');
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://mock');
    const path = url.pathname;
    const send = (code, body = '', headers = {}) => { res.writeHead(code, { 'content-type': 'text/plain', ...headers }); res.end(body); };
    const file = (name) => {
      const p = join(dir, basename(name));
      if (!existsSync(p) || !statSync(p).isFile()) return send(404, 'not found');
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': statSync(p).size });
      createReadStream(p).pipe(res);
    };
    if (!path.startsWith(PREFIX)) return send(404, 'not found');
    const rest = path.slice(PREFIX.length);
    if (rest === '/releases/latest') {
      return existsSync(join(dir, 'NO_RELEASE'))
        ? send(302, '', { location: `${PREFIX}/releases` })
        : send(302, '', { location: `${PREFIX}/releases/tag/${tag()}` });
    }
    if (rest === '/releases' || rest.startsWith('/releases/tag/')) return send(200, 'releases');
    let m = /^\/releases\/download\/[^/]+\/([^/]+)$/.exec(rest);
    if (m) return file(m[1]);
    m = /^\/(tar\.gz|zip)\/[^/]+$/.exec(rest);
    if (m) return file(m[1] === 'zip' ? 'ref.zip' : 'ref.tar.gz');
    return send(404, 'not found');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('mock-github.mjs')) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node mock-github.mjs <dir>'); process.exit(2); }
  const { url } = await startMock(dir);
  console.log(url);
  process.stdin.resume(); // stay alive until killed
}
