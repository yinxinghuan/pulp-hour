// Per-story reaction event names, plus a deterministic baseline used
// off-platform (preview / demo URLs) so the wall doesn't look dead.

import type { Reaction } from '../types';
import { REACTIONS } from '../types';

export function reactionEvent(storyId: string, kind: Reaction): string {
  return `react:${storyId}:${kind}`;
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

export function baselineCount(storyId: string, kind: Reaction): number {
  const h = hash(`pulp:${kind}:${storyId}`);
  const skew = kind === 'riveted' ? 1.7 : kind === 'spooked' ? 2.2 : 2.8;
  const exp = (h % 100) / 100;
  return Math.floor(Math.pow(exp, skew) * (kind === 'riveted' ? 90 : 50));
}

export function fallbackCount(
  storyId: string,
  kind: Reaction,
  mine: boolean,
): number {
  return baselineCount(storyId, kind) + (mine ? 1 : 0);
}

export function fallbackTotal(storyId: string, mine: Set<Reaction>): number {
  return REACTIONS.reduce(
    (sum, k) => sum + fallbackCount(storyId, k, mine.has(k)),
    0,
  );
}

export const REACTION_GLYPH: Record<Reaction, string> = {
  riveted: '★',
  spooked: '✶',
  cursed: '✷',
};
