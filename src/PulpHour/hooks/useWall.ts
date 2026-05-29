// Wall fetch — mirrors album-cover-generator's pattern. Reads the platform's
// get/data/list (6 most recent users' latest save row), parses each as a
// PulpSave, takes the newest story, then resolves each user's profile in
// parallel.

import { useCallback, useEffect, useState } from 'react';
import {
  callAigramAPI,
  isInAigram,
  telegramId,
  type AigramResponse,
} from '@shared/runtime/bridge';
import { getGameUuid } from '@shared/runtime/game-id';
import type { PulpSave, Story, WallEntry } from '../types';

interface SaveRow {
  user_id: string;
  time?: string;
  resource_data?: string;
}

export interface UseWall {
  entries: WallEntry[];
  loaded: boolean;
  refresh: () => void;
}

export function useWall(): UseWall {
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    const sessionId = getGameUuid();
    if (!isInAigram || !sessionId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await callAigramAPI<AigramResponse<SaveRow[]>>(
          `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
          'GET',
        );
        const rows = Array.isArray(res?.data) ? res.data : [];

        // Flatten ALL stories from each user's save row (each cap-20 by
        // PulpSave.MAX_STORIES). Past versions only took stories[0] per
        // user, which made the newest publish visually 'replace' the
        // older ones on the wall — we throttle at publish, not at
        // display, so every published story stays browsable.
        const pairs: Array<{ userId: string; story: Story }> = [];
        for (const row of rows) {
          if (!row.user_id || !row.resource_data) continue;
          try {
            const save = JSON.parse(row.resource_data) as PulpSave;
            for (const story of save.stories || []) {
              if (story && story.ending) {
                pairs.push({ userId: row.user_id, story });
              }
            }
          } catch { /* skip corrupt row */ }
        }
        // Newest first across all authors, cap visible count.
        pairs.sort((a, b) => b.story.createdAt - a.story.createdAt);
        const limited = pairs.slice(0, 24);

        // Resolve each unique author's profile once and cache.
        const uniqueIds = Array.from(new Set(limited.map(p => p.userId)));
        const profileEntries = await Promise.all(
          uniqueIds.map(async uid => {
            try {
              const r = await callAigramAPI<
                AigramResponse<{ name?: string; head_url?: string }>
              >(
                `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(uid)}`,
                'GET',
              );
              return [uid, r?.data] as const;
            } catch {
              return [uid, null] as const;
            }
          }),
        );
        const profileMap = new Map<string, { name?: string; head_url?: string } | null>(profileEntries);

        if (cancelled) return;
        setEntries(
          limited.map(({ userId, story }) => {
            const p = profileMap.get(userId) || null;
            return {
              userId,
              userName: p?.name,
              userAvatarUrl: p?.head_url,
              story,
            };
          }),
        );
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  return { entries, loaded, refresh };
}

export function isSelf(entry: WallEntry): boolean {
  return !!telegramId && entry.userId === String(telegramId);
}
