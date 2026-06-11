import { useEffect, useState } from 'react';

/**
 * Ticks every second until `target`. Returns the remaining duration broken
 * out into days/hours/minutes/seconds + a `done` flag once the target has
 * been passed. The Newsstand uses this to render the "next issue drops in"
 * countdown above the COMING NEXT sealed slot.
 *
 * Stops ticking when `done` flips true so we don't keep firing setState
 * forever for free.
 */
export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  done: boolean;
}

export function useCountdown(targetMs: number | null): Countdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs == null) return;
    if (now >= targetMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs, now]);

  if (targetMs == null) return null;
  const totalMs = Math.max(0, targetMs - now);
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, totalMs, done: totalMs === 0 };
}
