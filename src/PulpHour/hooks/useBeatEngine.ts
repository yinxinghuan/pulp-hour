// Stateless beat engine. Each LLM call composes the full history with
// stamped axes. Image generation uses the parallel-safe AlterU media client
// because one story can have several panel requests in flight at once.

import { useCallback, useRef, useState } from 'react';
import { getGameUuid } from '@shared/runtime/game-id';
import {
  createMediaRequestId,
  generateImageMedia,
  MediaServiceError,
} from '@shared/runtime/media';
import { getCover } from '../utils/covers';
import {
  beatSystemPrompt,
  beatUserPrompt,
  parseBeatJSON,
  ILLUSTRATION_FALLBACK,
} from '../utils/prompts';
import { judgeStory } from '../utils/scoring';
import type {
  Axis,
  Beat,
  CoverId,
  Ending,
  Story,
} from '../types';

const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';
const ILLUSTRATION_SIZE = { width: 768, height: 512 } as const;
const IMAGE_FETCH_TIMEOUT_MS = 280_000;
const referenceMode = 'edit' as const;
export const PULP_IDENTITY_RELEASE = 'pulp-full-identity-20260823';

const PLAYER_IDENTITY_CONTRACT =
  'HARD FULL-VISUAL-IDENTITY CAST MAP. REFERENCE IMAGE OVERRIDES ALL GENERIC CHARACTER WORDS. '
  + 'SUBJECT A MUST keep the exact complete visible identity of the main foreground subject in the reference—not merely its face. '
  + 'Preserve its silhouette, form or species, body proportions, material, head shape, face visibility, covering, mask, costume, colors, patterns and accessories. '
  + 'Before composing, inventory and copy EVERY visible identity feature and accessory from the reference; none may be omitted, moved to another subject, recolored or replaced. '
  + 'Keep SUBJECT A in the same pose, orientation and visible crop as the reference; depict the current event around it rather than making it perform a new body pose. '
  + 'Never reinterpret a covering as clothing over a generic human body. Any face, skin, hair, hands, arms or legs not visible in the reference MUST remain hidden and MUST NOT be invented. '
  + 'Keep the framing tight enough to hide every body part absent from the reference. If hands are absent, SUBJECT A does not touch anything: stage props beside or against it instead. '
  + 'Do not transfer reference traits to other people, animals, reflections or objects. Named NPCs remain visually distinct. ';

export function illustrationMediaPrompt(prompt: string, playerIdentity: boolean): string {
  const scene = playerIdentity
    ? prompt.replace(/\bthe protagonist\b/gi, 'SUBJECT A')
    : prompt;
  const combined = playerIdentity
    ? `${PLAYER_IDENTITY_CONTRACT}LAYOUT CONTRACT: make a landscape 1960s pulp case-file collage. Reserve one large square identity photograph for SUBJECT A in the center, occupying roughly 68 percent of the canvas height. Keep the complete square inside the frame with margin on every side. Do not depict SUBJECT A anywhere outside that square. Render the current event only as an illustrated environment border around the square portrait; it may include props but no extra copy of SUBJECT A. CURRENT SCENE: ${scene}`
    : scene;
  return combined.slice(0, 2400);
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
  playerIdentity?: boolean;
}, requestId: string): Promise<string> {
  const sessionId = getGameUuid();
  if (!sessionId) throw new Error('pulp media: game UUID is unavailable');
  if (opts.refUrl && !/^https:\/\//i.test(opts.refUrl)) {
    throw new Error('pulp media: reference must be public HTTPS');
  }

  const ctl = new AbortController();
  const tid = window.setTimeout(() => ctl.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const task = await generateImageMedia({
      sessionId,
      requestId,
      mode: opts.refUrl ? referenceMode : 'text',
      prompt: illustrationMediaPrompt(opts.prompt, !!opts.refUrl && !!opts.playerIdentity),
      referenceUrls: opts.refUrl ? [opts.refUrl] : [],
      size: ILLUSTRATION_SIZE,
    }, {
      signal: ctl.signal,
      timeoutMs: IMAGE_FETCH_TIMEOUT_MS,
    });
    return task.media.url;
  } finally {
    window.clearTimeout(tid);
  }
}

export async function generateIllustration(opts: {
  prompt: string;
  refUrl?: string;
  playerIdentity?: boolean;
}): Promise<string> {
  const requestId = createMediaRequestId();
  try {
    return await generateIllustrationOnce(opts, requestId);
  } catch (cause) {
    if (cause instanceof MediaServiceError) {
      if (!cause.retryable) throw cause;
      await new Promise(resolve => window.setTimeout(
        resolve,
        Math.max(1, cause.retryAfterSeconds ?? 1) * 1000,
      ));
      // A service timeout is ambiguous, so reuse the idempotency key.
      const retryId = cause.code === 'TIMEOUT' ? requestId : createMediaRequestId();
      return generateIllustrationOnce(opts, retryId);
    }
    // An interrupted transport may have submitted successfully; retry once
    // with the same request ID so the service returns the original task.
    return generateIllustrationOnce(opts, requestId);
  }
}

export interface FinishOpts {
  /** Optional original player avatar used as the full identity reference. */
  refUrl?: string;
}

export interface UseBeatEngine {
  nextBeat: (coverId: CoverId, beatsSoFar: Beat[]) => Promise<Beat>;
  finishStory: (coverId: CoverId, beatsSoFar: Beat[], opts?: FinishOpts) => Promise<Ending>;
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
    async (coverId, beatsSoFar, opts) => {
      if (inFlight.current) throw new Error('beat-engine: in flight');
      inFlight.current = true;
      setLoading(true);
      setError(null);
      setStage('narrating');
      try {
        const cover = getCover(coverId);
        const sys = beatSystemPrompt(cover);
        const score = judgeStory(beatsSoFar).score;
        const user = beatUserPrompt({ beatIndex: beatsSoFar.length + 1, beatsSoFar, score });
        const raw = await chatOnce(sys, user);
        const base = safeEnding(raw);
        setStage('closing');
        let illustrationUrl: string | undefined;
        try {
          illustrationUrl = await generateIllustration({
            prompt: base.illustrationPrompt,
            refUrl: opts?.refUrl,
            playerIdentity: !!opts?.refUrl,
          });
        } catch {
          /* leave undefined */
        }
        return {
          ...base,
          illustrationUrl,
          outcome: score.outcome,
          failureReason: score.failureReason,
        };
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
  authorLocale?: string;
}): Story {
  return {
    id: newStoryId(opts.coverId),
    coverId: opts.coverId,
    beats: opts.beats,
    ending: opts.ending,
    outcome: opts.ending.outcome,
    failureReason: opts.ending.failureReason,
    authorName: opts.authorName,
    authorLocale: opts.authorLocale,
    createdAt: Date.now(),
  };
}
