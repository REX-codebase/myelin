// Re-run a job when anything under the watched paths changes, until SIGINT.
// fs.watch({ recursive: true }) is not supported on Linux before Node 19.1 and this
// package supports Node 18, so every directory gets its own non-recursive watcher.
import { watch, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', '.git']);

// Every directory and file under the paths. A path that vanishes mid-scan drops out.
export function watchTargets(paths) {
  const out = new Set();
  const visit = (p) => {
    try {
      if (!existsSync(p)) return;
      out.add(p);
      if (!statSync(p).isDirectory()) return;
      for (const n of readdirSync(p)) if (!SKIP.has(n)) visit(join(p, n));
    } catch {
      // Gone between the check and the read; the next run re-arms the watchers.
    }
  };
  for (const p of paths) visit(p);
  return [...out];
}

// Runs job() now, then again after a quiet period of debounceMs following a change.
// A job that throws is reported and the watch carries on. Resolves 0 on SIGINT.
// Watchers are re-armed after every run, so new files and directories are picked up.
export function watchLoop(paths, job, { debounceMs = 150 } = {}) {
  let watchers = [];
  let timer = null;
  const unwatch = () => {
    for (const w of watchers) w.close();
    watchers = [];
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, debounceMs);
  };
  const run = () => {
    try {
      job();
    } catch (e) {
      console.error(e.message);
    }
    unwatch();
    for (const p of watchTargets(paths)) {
      try {
        const w = watch(p, schedule);
        w.on('error', schedule); // a watched entry that disappears reports an error; re-run to re-arm
        watchers.push(w);
      } catch {
        // Not watchable right now; the next run re-arms.
      }
    }
  };
  return new Promise((resolve) => {
    run();
    process.once('SIGINT', () => {
      clearTimeout(timer);
      unwatch();
      resolve(0);
    });
  });
}
