// Translate a saved story to the current viewer's locale on demand.
// LLM call → cache in localStorage by `<storyId>:<targetLocale>` so a
// re-open never pays twice. UI shows a toggle to flip between original
// and translated.

import { useCallback, useState } from 'react';
import type { Axis, Beat, Story } from '../types';
import { AXES } from '../types';

const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';

const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'American English',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
  es: 'español',
};

/** Heuristic to identify a story's source language when authorLocale
 *  is missing (pre-v0.16 stories). Imperfect but covers en/zh/ja/ko/es. */
export function detectStoryLocale(text: string): string {
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[一-鿿]/.test(text)) return 'zh';
  // Latin alphabet — distinguish es from en by common Spanish words /
  // diacritics. Heuristic only; default to 'en'.
  if (/[áéíóúñ¡¿]/i.test(text) || /\b(que|para|estás?|noche)\b/i.test(text)) {
    return 'es';
  }
  return 'en';
}

export function storySourceLocale(story: Story): string {
  if (story.authorLocale) return story.authorLocale;
  const sample = [
    story.beats[0]?.narration,
    story.ending?.narration,
  ].filter(Boolean).join(' ').slice(0, 400);
  return detectStoryLocale(sample || 'en');
}

export interface TranslatedStory {
  beats: Array<{
    narration: string;
    choices: Record<Axis, string>;
  }>;
  ending: { narration: string; title: string };
}

function cacheKey(storyId: string, targetLocale: string): string {
  return `pulp-hour-tr:${storyId}:${targetLocale}`;
}

function readCache(storyId: string, targetLocale: string): TranslatedStory | null {
  try {
    const raw = localStorage.getItem(cacheKey(storyId, targetLocale));
    if (!raw) return null;
    return JSON.parse(raw) as TranslatedStory;
  } catch { return null; }
}

function writeCache(storyId: string, targetLocale: string, value: TranslatedStory): void {
  try {
    localStorage.setItem(cacheKey(storyId, targetLocale), JSON.stringify(value));
  } catch { /* quota — ignore */ }
}

function buildTranslationPrompt(story: Story, targetLocale: string): {
  system: string;
  user: string;
} {
  const targetLang = LOCALE_LANGUAGE[targetLocale] || 'American English';
  const payload = {
    beats: story.beats.map((b: Beat) => ({
      narration: b.narration,
      choices: {
        defy: b.choices.defy,
        yield: b.choices.yield,
        lie: b.choices.lie,
      },
    })),
    ending: {
      narration: story.ending.narration,
      title: story.ending.title,
    },
  };
  const system = `You are translating a variable-length pulp short story into ${targetLang}.

Keep the noir tone: second-person, present tense, sparse, sinister. Do not paraphrase or summarize — translate every sentence. Do not localize names of streets, brands, or proper nouns; translate everything else.

OUTPUT FORMAT — strict JSON only, no markdown fences, no commentary. Return EXACTLY ONE JSON object matching the input shape with all string values translated:

{
  "beats": [
    { "narration": "<${targetLang}>", "choices": { "defy": "<${targetLang}>", "yield": "<${targetLang}>", "lie": "<${targetLang}>" } },
    ... (all beats before the finale)
  ],
  "ending": { "narration": "<${targetLang}>", "title": "<${targetLang}>" }
}`;
  const user = `Translate this story into ${targetLang}:\n\n${JSON.stringify(payload)}`;
  return { system, user };
}

function extractFirstJSONObject(s: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') { escape = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parseTranslation(raw: string, original: Story): TranslatedStory | null {
  const obj = extractFirstJSONObject(raw.trim().replace(/^```(?:json)?\s*/i, ''));
  if (!obj) return null;
  try {
    const j = JSON.parse(obj) as {
      beats?: Array<{ narration?: string; choices?: Partial<Record<Axis, string>> }>;
      ending?: { narration?: string; title?: string };
    };
    if (!Array.isArray(j.beats) || !j.ending) return null;
    // Pad beats array to match original length, fallback per-field to original.
    const beats = original.beats.map((b, i) => {
      const tr = j.beats?.[i];
      const choices: Record<Axis, string> = {} as Record<Axis, string>;
      for (const a of AXES) {
        choices[a] = tr?.choices?.[a]?.trim() || b.choices[a];
      }
      return {
        narration: tr?.narration?.trim() || b.narration,
        choices,
      };
    });
    return {
      beats,
      ending: {
        narration: j.ending?.narration?.trim() || original.ending.narration,
        title: j.ending?.title?.trim() || original.ending.title,
      },
    };
  } catch { return null; }
}

export interface UseTranslateStory {
  /** When non-null, render this in place of the original story body. */
  translated: TranslatedStory | null;
  /** True while LLM round-trip is in flight. */
  loading: boolean;
  error: Error | null;
  /** Trigger the translation. No-op when cached. */
  translate: () => Promise<void>;
  /** Flip back to the original. Cache is retained. */
  showOriginal: () => void;
}

export function useTranslateStory(
  story: Story,
  targetLocale: string,
): UseTranslateStory {
  // Read cache on first render — instant flip if user has translated this
  // story to this locale before.
  const initial = readCache(story.id, targetLocale);
  const [translated, setTranslated] = useState<TranslatedStory | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const translate = useCallback(async () => {
    if (loading) return;
    const cached = readCache(story.id, targetLocale);
    if (cached) { setTranslated(cached); return; }
    setLoading(true);
    setError(null);
    try {
      const { system, user } = buildTranslationPrompt(story, targetLocale);
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
      if (!res.ok) throw new Error(`translate: HTTP ${res.status}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content ?? '';
      const parsed = parseTranslation(raw, story);
      if (!parsed) throw new Error('translate: malformed LLM output');
      writeCache(story.id, targetLocale, parsed);
      setTranslated(parsed);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [loading, story, targetLocale]);

  const showOriginal = useCallback(() => setTranslated(null), []);

  return { translated, loading, error, translate, showOriginal };
}
