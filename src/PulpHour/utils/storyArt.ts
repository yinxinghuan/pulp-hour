// Pick the best illustration URL for a published story, with a
// fallback chain: ending → last beat with art → cover.
//
// The ending illustration is the one that most commonly fails (it's
// the 6th gen-image in a single session — rate limits and platform
// load hit hardest at the tail). Without this chain the wall card +
// viewer's final panel both collapse to the cached cover, making
// every author's story look interchangeable.

import type { Cover, Story } from '../types';

export function storyHeroArt(story: Story, cover: Cover): string {
  if (story.ending?.illustrationUrl) return story.ending.illustrationUrl;
  // Walk back from the last beat looking for one that did land.
  for (let i = story.beats.length - 1; i >= 0; i--) {
    const url = story.beats[i]?.illustrationUrl;
    if (url) return url;
  }
  return cover.imageUrl;
}

/** Image for the "PANEL 6 · FINALE" block specifically (story viewer
 *  bottom panel). Same fallback chain. */
export const finalePanelArt = storyHeroArt;
