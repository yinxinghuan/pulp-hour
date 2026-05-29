// Lightweight i18n — zh / en. Override with localStorage('game_locale').

type Locale = 'zh' | 'en';

const STRINGS = {
  brand: { zh: 'Pulp Hour', en: 'Pulp Hour' },
  tagline: { zh: '六个节拍。一本杂志。一个夜晚。', en: 'Six beats. One sitting. One night.' },
  newsstand_title: { zh: '本期目录', en: 'This Week\'s Issues' },
  newsstand_subtitle: { zh: '选一本翻开。', en: 'Pick one. Crack it open.' },
  read_now: { zh: '翻开', en: 'Read Now' },
  beat_of: { zh: '节拍 {n} / 6', en: 'Beat {n} of 6' },
  axis_defy: { zh: '抗', en: 'Defy' },
  axis_yield: { zh: '从', en: 'Yield' },
  axis_lie: { zh: '骗', en: 'Lie' },
  loading_narrating: { zh: '正在编写下一拍…', en: 'Writing the next beat…' },
  loading_illustrating: { zh: '正在为结局刻画插图…', en: 'Etching the closing illustration…' },
  ending_byline: { zh: '撰稿', en: 'A story by' },
  ending_anonymous: { zh: 'Anonymous', en: 'Anonymous' },
  ending_share: { zh: '送到杂志架', en: 'Send to the Newsstand' },
  ending_back: { zh: '回到目录', en: 'Back to Issues' },
  wall_title: { zh: '杂志架', en: 'The Newsstand' },
  wall_subtitle: { zh: '本周读者完成的故事。', en: 'Stories readers finished this week.' },
  wall_empty: { zh: '空架子。先成为第一个写完的人。', en: 'Empty rack. Be the first to finish a story.' },
  wall_open: { zh: '翻一本新刊', en: 'Pick up a new issue' },
  wall_self: { zh: '你', en: 'You' },
  reactions_riveted: { zh: '入迷', en: 'Riveted' },
  reactions_spooked: { zh: '寒栗', en: 'Spooked' },
  reactions_cursed: { zh: '被诅', en: 'Cursed' },
  story_read: { zh: '读这篇', en: 'Read this story' },
  story_close: { zh: '合上', en: 'Close' },
  hint_pick: { zh: '点一本封面开始', en: 'Tap a cover to start' },
  error_generic: { zh: '故事卡住了。再来一拍。', en: 'The story jammed. Try the beat again.' },
  retry: { zh: '重试', en: 'Retry' },
} as const;

type Key = keyof typeof STRINGS;

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let _locale: Locale = detectLocale();

export function locale(): Locale {
  return _locale;
}

export function setLocale(l: Locale) {
  _locale = l;
  try { localStorage.setItem('game_locale', l); } catch {/* ignore */}
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  const tpl = STRINGS[key]?.[_locale] ?? STRINGS[key]?.en ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
