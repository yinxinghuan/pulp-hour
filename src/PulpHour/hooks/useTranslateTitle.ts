// One-shot title translation. Tiny LLM payload (in: 1 line, out: 1
// line), cached by storyId + targetLocale in localStorage so a wall
// scroll only pays once per (story, viewer-locale) pair.

import { useEffect, useState } from 'react';

const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';

const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'American English',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
  es: 'español',
};

function cacheKey(storyId: string, target: string): string {
  return `pulp-hour-trt:${storyId}:${target}`;
}

function readCache(storyId: string, target: string): string | null {
  try { return localStorage.getItem(cacheKey(storyId, target)); } catch { return null; }
}

function writeCache(storyId: string, target: string, value: string): void {
  try { localStorage.setItem(cacheKey(storyId, target), value); } catch { /* ignore */ }
}

async function translateTitle(title: string, targetLocale: string): Promise<string> {
  const lang = LOCALE_LANGUAGE[targetLocale] || 'American English';
  const system = `Translate exactly one pulp story title into ${lang}. Output ONLY the translated title — no quotes, no punctuation around it, no commentary. Keep it 4–7 words, Title Case where applicable, pulp-noir tone.`;
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: title },
      ],
    }),
  });
  if (!res.ok) throw new Error(`title-translate: HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
  // Strip wrap quotes / trailing punctuation if the model couldn't help itself.
  return raw.replace(/^["“”'`]+|["“”'`.\s]+$/g, '');
}

/**
 * Resolve a translated title. Returns the original on first render,
 * then swaps to the translation once it lands (or on next render if
 * already cached). Pass `enabled = false` to skip the fetch entirely
 * (e.g. when source and viewer locales already match).
 */
export function useTranslateTitle(
  storyId: string,
  originalTitle: string,
  targetLocale: string,
  enabled: boolean,
): string {
  // Read cache synchronously — if hit, initial render already shows the
  // translation, no network involved.
  const cached = enabled ? readCache(storyId, targetLocale) : null;
  const [translated, setTranslated] = useState<string | null>(cached);

  useEffect(() => {
    if (!enabled) return;
    if (translated) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await translateTitle(originalTitle, targetLocale);
        if (cancelled || !t) return;
        writeCache(storyId, targetLocale, t);
        setTranslated(t);
      } catch { /* keep showing original */ }
    })();
    return () => { cancelled = true; };
  }, [enabled, storyId, originalTitle, targetLocale, translated]);

  return translated || originalTitle;
}
