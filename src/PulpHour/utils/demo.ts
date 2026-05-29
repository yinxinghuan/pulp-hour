// Seed data for demo URLs (?demo=wall / ?demo=ending / ?demo=beat / ...).

import type { Beat, Cover, CoverId, Ending, Story, WallEntry } from '../types';
import { COVERS, getCover } from './covers';

function s(coverId: CoverId): Story {
  const cover = getCover(coverId);
  return {
    id: `demo-${coverId}`,
    coverId,
    beats: makeBeats(cover),
    ending: makeEnding(cover),
    authorName: 'algram',
    createdAt: Date.now(),
  };
}

function makeBeats(cover: Cover): Beat[] {
  const seed = (n: number) => ({
    narration: `Beat ${n}. The line crackles. A breath that isn't yours says your full name like it's a number on a form. You are not surprised, which is worse.`,
    choices: {
      defy: 'Hang up the receiver',
      yield: 'Stay on the line',
      lie: 'Pretend you misdialed',
    },
    chosen: n === 1 ? 'yield' as const : n === 2 ? 'lie' as const : 'defy' as const,
  });
  void cover;
  return [seed(1), seed(2), seed(3), seed(4), seed(5)];
}

function makeEnding(cover: Cover): Ending {
  return {
    narration:
      'The operator hangs up first, which the operator has never done. The hold-music starts on its own. You realize you are not on hold for them.',
    title: cover.title.split(/[:—]/)[0].trim().slice(0, 40) || 'Last Call',
    illustrationPrompt: '',
    illustrationUrl: cover.imageUrl,
  };
}

export function demoStories(): Story[] {
  return COVERS.map(c => s(c.id));
}

export function demoWall(): WallEntry[] {
  const names = ['algram', 'jenny', 'jm·f', 'ghostpixel', 'isaya', 'isabel'];
  return COVERS.concat(COVERS.slice(0, 2)).slice(0, 6).map((c, i) => {
    const story = s(c.id);
    story.id = `demo-${i}`;
    story.authorName = names[i];
    return {
      userId: `demo-${i}`,
      userName: names[i],
      story,
    };
  });
}

export function demoBeats(coverId: CoverId = 'operator'): { beats: Beat[]; cover: Cover } {
  const cover = getCover(coverId);
  const beats: Beat[] = [
    {
      narration:
        "The 1-800 line was supposed to be dead. You found it scratched into the underside of a payphone in a Greyhound station you don't remember entering. You dial it from your car at 3:14 a.m. anyway, because the silence has gotten loud. Someone picks up before the first ring finishes.",
      choices: {
        defy: 'Demand to know who this is',
        yield: 'Say nothing, just listen',
        lie: 'Say you have the wrong number',
      },
      chosen: 'yield',
    },
    {
      narration:
        '"Account number, please." The operator\'s voice is mid-shift tired, all consonants. You hear the wet click of a pen cap. Somewhere behind the line, a microwave dings.',
      choices: {
        defy: 'Tell them you have no account',
        yield: 'Read off your phone number',
        lie: 'Recite a stranger\'s social security number',
      },
      chosen: 'lie',
    },
    {
      narration:
        '"Thank you, Mr. Hollis." The pen scratches. "I have you down for a follow-up. You missed your appointment in 2007." Your skin gets very small.',
      choices: {
        defy: 'Tell them they have the wrong man',
        yield: 'Ask what the appointment was for',
        lie: 'Apologize and offer to reschedule',
      },
    },
  ];
  return { beats, cover };
}
