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

        const parsed: Array<{ row: SaveRow; story: Story }> = [];
        for (const row of rows) {
          if (!row.user_id || !row.resource_data) continue;
          try {
            const save = JSON.parse(row.resource_data) as PulpSave;
            const story = save.stories?.[0];
            if (story && story.ending) parsed.push({ row, story });
          } catch { /* skip corrupt */ }
          if (parsed.length >= 6) break;
        }

        const profiles = await Promise.all(
          parsed.map(({ row }) =>
            callAigramAPI<AigramResponse<{ name?: string; head_url?: string }>>(
              `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(row.user_id)}`,
              'GET',
            ).catch(() => null),
          ),
        );

        if (cancelled) return;
        setEntries(
          parsed.map(({ row, story }, i) => ({
            userId: row.user_id,
            userName: profiles[i]?.data?.name,
            userAvatarUrl: profiles[i]?.data?.head_url,
            story,
          })),
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
