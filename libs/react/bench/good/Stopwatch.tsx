import { useEffect, useRef, useState, useCallback, memo } from 'react';
import type { JSX } from 'react';

type Props = { onLap?: (ms: number) => void };

export const Stopwatch = memo(function Stopwatch({ onLap }: Props): JSX.Element {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const lapsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!running) return;
    const start = performance.now() - elapsed;
    intervalRef.current = window.setInterval(() => setElapsed(performance.now() - start), 50);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const lap = useCallback(() => {
    onLap?.(elapsed);
    lapsRef.current?.lastElementChild?.scrollIntoView();
  }, [elapsed, onLap]);

  return (
    <section>
      <output>{(elapsed / 1000).toFixed(2)}s</output>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Stop' : 'Start'}</button>
      <button onClick={lap} disabled={!running}>Lap</button>
      <ul ref={lapsRef} />
    </section>
  );
});
