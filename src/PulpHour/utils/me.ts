// Resolve the current player's display name + avatar via the platform.
// Off-platform / failure: returns null and the UI falls back to "Anonymous".

import {
  callAigramAPI,
  isInAigram,
  telegramId,
  type AigramResponse,
} from '@shared/runtime/bridge';

export interface MeInfo {
  name: string;
  avatarUrl?: string;
}

let cache: MeInfo | null | undefined;

export async function fetchMe(): Promise<MeInfo | null> {
  if (cache !== undefined) return cache;
  if (!isInAigram || !telegramId) {
    cache = null;
    return null;
  }
  try {
    const res = await callAigramAPI<
      AigramResponse<{ name?: string; head_url?: string }>
    >(
      `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(telegramId)}`,
      'GET',
    );
    const name = res?.data?.name?.trim();
    if (!name) { cache = null; return null; }
    cache = { name, avatarUrl: res.data?.head_url };
    return cache;
  } catch {
    cache = null;
    return null;
  }
}
