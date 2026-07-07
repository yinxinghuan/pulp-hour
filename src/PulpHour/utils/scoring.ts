import type { Axis, Beat, FailureReason, StoryOutcome } from '../types';
import { MAX_STORY_BEAT_COUNT, MIN_STORY_BEAT_COUNT } from '../types';

export interface StoryScore {
  insight: number;
  agency: number;
  cover: number;
  heat: number;
  final: number;
  outcome: StoryOutcome;
  failureReason?: FailureReason;
}

export interface StoryDecision {
  shouldEnd: boolean;
  score: StoryScore;
}

type StatDelta = Pick<StoryScore, 'insight' | 'agency' | 'cover' | 'heat'>;

function deltaFor(axis: Axis, beatIndex: number): StatDelta {
  if (beatIndex <= 2) {
    if (axis === 'defy') return { insight: 0, agency: 2, cover: 0, heat: 2 };
    if (axis === 'yield') return { insight: 2, agency: 0, cover: 0, heat: 0 };
    return { insight: 0, agency: 0, cover: 2, heat: 1 };
  }

  if (beatIndex <= 6) {
    if (axis === 'defy') return { insight: 0, agency: 2, cover: 0, heat: 1 };
    if (axis === 'yield') return { insight: 1, agency: -1, cover: 0, heat: 0 };
    return { insight: -1, agency: 0, cover: 1, heat: 2 };
  }

  if (axis === 'defy') return { insight: 0, agency: 3, cover: 0, heat: 1 };
  if (axis === 'yield') return { insight: 1, agency: 0, cover: 0, heat: 1 };
  return { insight: -2, agency: 0, cover: 1, heat: 3 };
}

function failureReasonFor(stats: StatDelta): FailureReason {
  if (stats.heat >= 11) return 'burned';
  if (stats.insight <= 2) return 'lost';
  if (stats.cover >= stats.agency + stats.insight + 3) return 'unmasked';
  return 'doomed';
}

export function scoreStory(beats: Beat[]): StoryScore {
  const stats = beats.reduce<StatDelta>((acc, beat, idx) => {
    if (!beat.chosen) return acc;
    const d = deltaFor(beat.chosen, idx + 1);
    return {
      insight: acc.insight + d.insight,
      agency: acc.agency + d.agency,
      cover: acc.cover + d.cover,
      heat: acc.heat + d.heat,
    };
  }, { insight: 0, agency: 0, cover: 0, heat: 0 });

  const final = stats.insight * 2 + stats.agency * 2 + stats.cover - stats.heat * 2;
  const success = final >= 8 && stats.insight + stats.agency >= 8 && stats.heat <= 12;
  return {
    ...stats,
    final,
    outcome: success ? 'success' : 'failure',
    failureReason: success ? undefined : failureReasonFor(stats),
  };
}

export function judgeStory(beats: Beat[]): StoryDecision {
  const score = scoreStory(beats);
  const count = beats.length;

  if (count < MIN_STORY_BEAT_COUNT) return { shouldEnd: false, score };
  if (count >= MAX_STORY_BEAT_COUNT) return { shouldEnd: true, score };

  const earlyBurn = count >= 3 && score.heat >= 6 && score.final < 4;
  const lostThread = count >= 4 && score.insight <= -2;
  const maskSplit = count >= 4 && score.cover >= score.agency + score.insight + 3 && score.final < 2;
  if (earlyBurn || lostThread || maskSplit) {
    return {
      shouldEnd: true,
      score: {
        ...score,
        outcome: 'failure',
        failureReason: earlyBurn ? 'burned' : lostThread ? 'lost' : 'unmasked',
      },
    };
  }

  const earnedEscape = count >= 6
    && score.final >= 14
    && score.insight + score.agency >= 9
    && score.heat <= 8;
  if (earnedEscape) {
    return {
      shouldEnd: true,
      score: { ...score, outcome: 'success', failureReason: undefined },
    };
  }

  const collapsingLate = count >= 7 && score.final <= -4;
  if (collapsingLate) {
    return {
      shouldEnd: true,
      score: {
        ...score,
        outcome: 'failure',
        failureReason: score.failureReason ?? 'doomed',
      },
    };
  }

  if (count >= 10 && score.outcome === 'success' && score.final >= 18) {
    return {
      shouldEnd: true,
      score: { ...score, outcome: 'success', failureReason: undefined },
    };
  }

  return { shouldEnd: false, score };
}

export function scorePromptLine(score: StoryScore): string {
  const result = score.outcome === 'success'
    ? 'SUCCESS: the protagonist finds a narrow way through, but it must cost them something.'
    : `FAILURE: the protagonist loses because of ${score.failureReason}. Close the story fully; do not leave it abrupt.`;

  return [
    result,
    `Hidden score summary for causality only, never mention numbers: insight=${score.insight}, agency=${score.agency}, cover=${score.cover}, heat=${score.heat}, final=${score.final}.`,
  ].join('\n');
}
