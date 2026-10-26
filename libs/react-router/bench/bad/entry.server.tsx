import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { RemixServer } from '@remix-run/react';
import { createReadableStreamFromReadable, installGlobals } from '@remix-run/node';
import type { EntryContext } from '@remix-run/node';

installGlobals();

export default function handleRequest(request: Request, status: number, headers: Headers, remixContext: EntryContext) {
  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
      onShellReady() {
        const body = new PassThrough();
        headers.set('Content-Type', 'text/html');
        resolve(new Response(createReadableStreamFromReadable(body), { status, headers }));
        pipe(body);
      },
      onShellError: reject,
    });
  });
}
