// Stateless beat engine: each call composes the full prompt and POSTs to
// game-chat. We do not use useChat because the platform's chat endpoint is
// stateless anyway and we want exact, replayable control of the history we
// inject (with the chosen axes spelled out).

import { useCallback, useRef, useState } from 'react';
import { useGenImage } from '@shared/runtime/useGenImage';
import { getCover } from '../utils/covers';
import {
  beatSystemPrompt,
  beatUserPrompt,
  parseBeatJSON,
} from '../utils/prompts';
import type {
  Axis,
  Beat,
  CoverId,
  Ending,
  Story,
} from '../types';

const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';

async function chatOnce(system: string, user: string): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`chat failed: HTTP ${res.status}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? '';
}

export interface UseBeatEngine {
  /** Generate the next mid-beat (1..5). beatsSoFar is the array of beats
   *  already rendered; on first call pass []. The caller must mutate the
   *  prior beat's `chosen` before invoking this. */
  nextBeat: (
    coverId: CoverId,
    beatsSoFar: Beat[],
  ) => Promise<Beat>;
  /** Generate the closing beat. Calls LLM for narration+title+prompt, then
   *  gen-image for the illustration. */
  finishStory: (
    coverId: CoverId,
    beatsSoFar: Beat[],
  ) => Promise<Ending>;
  loading: boolean;
  /** 'narrating' while LLM in flight, 'illustrating' while gen-image in flight, '' idle */
  stage: '' | 'narrating' | 'illustrating';
  error: Error | null;
}

const FALLBACK_CHOICES: Record<Axis, string> = {
  defy: 'Walk away',
  yield: 'Let it happen',
  lie: 'Lie',
};

function safeBeat(raw: string): Beat {
  try {
    const j = parseBeatJSON<{
      narration?: string;
      choices?: Partial<Record<Axis, string>>;
    }>(raw);
    const choices: Record<Axis, string> = {
      defy: j.choices?.defy?.trim() || FALLBACK_CHOICES.defy,
      yield: j.choices?.yield?.trim() || FALLBACK_CHOICES.yield,
      lie: j.choices?.lie?.trim() || FALLBACK_CHOICES.lie,
    };
    return {
      narration: j.narration?.trim() || raw.trim(),
      choices,
    };
  } catch {
    // Last-ditch: dump the raw model output as narration so the player
    // sees *something*. The three fallback choices keep the game playable.
    return { narration: raw.trim(), choices: { ...FALLBACK_CHOICES } };
  }
}

function safeEnding(raw: string): Omit<Ending, 'illustrationUrl'> {
  try {
    const j = parseBeatJSON<{
      narration?: string;
      title?: string;
      illustration_prompt?: string;
    }>(raw);
    return {
      narration: j.narration?.trim() || raw.trim(),
      title: (j.title?.trim() || 'An Unfinished Story').replace(/^["']|["']$/g, ''),
      illustrationPrompt:
        j.illustration_prompt?.trim() ||
        '1950s pulp magazine illustration, heavy halftone, cobalt blue and tomato red on cream paper, dramatic lighting.',
    };
  } catch {
    return {
      narration: raw.trim(),
      title: 'An Unfinished Story',
      illustrationPrompt:
        '1950s pulp magazine illustration, heavy halftone, cobalt blue and tomato red on cream paper, dramatic lighting.',
    };
  }
}

export function useBeatEngine(): UseBeatEngine {
  const { generate: genImg } = useGenImage();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<UseBeatEngine['stage']>('');
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);

  const nextBeat = useCallback<UseBeatEngine['nextBeat']>(
    async (coverId, beatsSoFar) => {
      if (inFlight.current) throw new Error('beat-engine: in flight');
      inFlight.current = true;
      setLoading(true);
      setError(null);
      setStage('narrating');
      try {
        const cover = getCover(coverId);
        const sys = beatSystemPrompt(cover);
        const user = beatUserPrompt({
          beatIndex: beatsSoFar.length + 1,
          beatsSoFar,
        });
        const raw = await chatOnce(sys, user);
        return safeBeat(raw);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        inFlight.current = false;
        setLoading(false);
        setStage('');
      }
    },
    [],
  );

  const finishStory = useCallback<UseBeatEngine['finishStory']>(
    async (coverId, beatsSoFar) => {
      if (inFlight.current) throw new Error('beat-engine: in flight');
      inFlight.current = true;
      setLoading(true);
      setError(null);
      setStage('narrating');
      try {
        const cover = getCover(coverId);
        const sys = beatSystemPrompt(cover);
        const user = beatUserPrompt({ beatIndex: 6, beatsSoFar });
        const raw = await chatOnce(sys, user);
        const base = safeEnding(raw);
        setStage('illustrating');
        let illustrationUrl: string | undefined;
        try {
          illustrationUrl = await genImg({ prompt: base.illustrationPrompt });
        } catch {
          /* keep undefined — wall will fall back to cover */
        }
        return { ...base, illustrationUrl };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        inFlight.current = false;
        setLoading(false);
        setStage('');
      }
    },
    [genImg],
  );

  return { nextBeat, finishStory, loading, stage, error };
}

export function newStoryId(coverId: CoverId): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `${coverId}-${Date.now().toString(36)}-${r}`;
}

/** Build a finished Story object from the parts collected during play. */
export function assembleStory(opts: {
  coverId: CoverId;
  beats: Beat[];
  ending: Ending;
  authorName?: string;
}): Story {
  return {
    id: newStoryId(opts.coverId),
    coverId: opts.coverId,
    beats: opts.beats,
    ending: opts.ending,
    authorName: opts.authorName,
    createdAt: Date.now(),
  };
}
