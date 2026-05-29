// Stateless beat engine. Each LLM call composes the full history with
// stamped axes. Gen-image is wrapped in a parallel-safe helper because we
// fire 5+ generations per session and the bundled useGenImage hook has
// shared loading state we don't want.

import { useCallback, useRef, useState } from 'react';
import { getCover } from '../utils/covers';
import {
  beatSystemPrompt,
  beatUserPrompt,
  parseBeatJSON,
  ILLUSTRATION_FALLBACK,
} from '../utils/prompts';
import type {
  Axis,
  Beat,
  CoverId,
  Ending,
  Story,
} from '../types';

const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';
const IMAGE_URL = 'https://chat.aiwaves.tech/aigram/api/gen-image';

// Production-hosted covers — used as ref_url for the per-beat splashes so
// every illustration in a story shares the cover's color anchor.
const COVER_PUBLIC_BASE = 'https://yinxinghuan.github.io/pulp-hour/covers';
export function coverPublicRef(id: CoverId): string {
  return `${COVER_PUBLIC_BASE}/${id}.jpg`;
}

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

async function generateIllustrationOnce(opts: {
  prompt: string;
  refUrl?: string;
}): Promise<string> {
  const body: { prompt: string; ref_url?: string } = { prompt: opts.prompt };
  if (opts.refUrl) body.ref_url = opts.refUrl;
  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gen-image failed: HTTP ${res.status}`);
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error('gen-image: no url');
  return json.url;
}

/**
 * Try gen-image up to 2 times (with a 4s gap). Wall-clock per attempt is
 * already ~200s, so we cap at 2 attempts — anything more punishes the
 * player. Caller catches the final rejection and shows the fallback.
 */
export async function generateIllustration(opts: {
  prompt: string;
  refUrl?: string;
}): Promise<string> {
  try {
    return await generateIllustrationOnce(opts);
  } catch (first) {
    await new Promise(res => setTimeout(res, 4000));
    try {
      return await generateIllustrationOnce(opts);
    } catch {
      throw first;
    }
  }
}

export interface UseBeatEngine {
  nextBeat: (coverId: CoverId, beatsSoFar: Beat[]) => Promise<Beat>;
  finishStory: (coverId: CoverId, beatsSoFar: Beat[]) => Promise<Ending>;
  loading: boolean;
  /** 'narrating' while LLM in flight, 'closing' while final image waits, '' idle */
  stage: '' | 'narrating' | 'closing';
  error: Error | null;
}

const FALLBACK_CHOICES: Record<Axis, string> = {
  defy: 'Walk away',
  yield: 'Let it happen',
  lie: 'Lie',
};

function safeBeat(raw: string): Beat {
  // Parse failure here is a hard error — the previous fallback (raw text
  // as narration) leaked raw JSON wrappers into the rendered narration
  // when the model concatenated two beats in one reply. Better to throw
  // and let the outer catch surface a 'story jammed' toast so the player
  // can retry cleanly.
  const j = parseBeatJSON<{
    narration?: string;
    choices?: Partial<Record<Axis, string>>;
    illustration_prompt?: string;
  }>(raw);
  const narration = j.narration?.trim();
  if (!narration) throw new Error('safeBeat: missing narration');
  const choices: Record<Axis, string> = {
    defy:  j.choices?.defy?.trim()  || FALLBACK_CHOICES.defy,
    yield: j.choices?.yield?.trim() || FALLBACK_CHOICES.yield,
    lie:   j.choices?.lie?.trim()   || FALLBACK_CHOICES.lie,
  };
  return {
    narration,
    choices,
    illustrationPrompt:
      j.illustration_prompt?.trim() || `${ILLUSTRATION_FALLBACK}`,
  };
}

function safeEnding(raw: string): Omit<Ending, 'illustrationUrl'> {
  const j = parseBeatJSON<{
    narration?: string;
    title?: string;
    illustration_prompt?: string;
  }>(raw);
  const narration = j.narration?.trim();
  if (!narration) throw new Error('safeEnding: missing narration');
  return {
    narration,
    title: (j.title?.trim() || 'An Unfinished Story').replace(/^["']|["']$/g, ''),
    illustrationPrompt:
      j.illustration_prompt?.trim() || ILLUSTRATION_FALLBACK,
  };
}

export function useBeatEngine(): UseBeatEngine {
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
        setStage('closing');
        let illustrationUrl: string | undefined;
        try {
          illustrationUrl = await generateIllustration({
            prompt: base.illustrationPrompt,
            refUrl: coverPublicRef(coverId),
          });
        } catch {
          /* leave undefined */
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
    [],
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
