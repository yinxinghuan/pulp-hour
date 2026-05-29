// Lightweight i18n — 5 locales (en/zh/ja/ko/es).
// Decorative shouts (PULP HOUR / DEFY / YIELD / LIE / MEANWHILE / FILED /
// THE END) stay English because Bangers / Knewave / Permanent Marker only
// render Latin glyphs. Prose runs through t() and renders in Inter.

type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'es';

export const LOCALES: Locale[] = ['en', 'zh', 'ja', 'ko', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  zh: '中',
  ja: '日',
  ko: '한',
  es: 'ES',
};

const STRINGS = {
  // ── brand / mast ────────────────────────────────────────────────────
  brand: { en: 'Pulp Hour', zh: 'Pulp Hour', ja: 'Pulp Hour', ko: 'Pulp Hour', es: 'Pulp Hour' },

  // ── hero (new) ──────────────────────────────────────────────────────
  hero_tagline: {
    en: '6 beats. one noir. yours in 3 minutes.',
    zh: '6 拍 · 一桩黑色故事 · 3 分钟一本。',
    ja: '6ビート、一夜のノワール、3分で完成。',
    ko: '여섯 박자, 한 편의 누아르, 3분이면 끝.',
    es: '6 ritmos. un noir. listo en 3 minutos.',
  },
  hero_subline: {
    en: "AI ghost-writes. you decide. file it for the rest of us.",
    zh: 'AI 替你写，你来决定走向。写完发到杂志架，让别人读你。',
    ja: 'AIが書き、君が決める。書き上がったら掲示板へ。',
    ko: 'AI가 쓰고, 당신이 선택. 다 쓴 글은 신문가판대에 올려.',
    es: 'la IA escribe. tú decides. archívalo para el resto.',
  },

  // ── how it works (new) ──────────────────────────────────────────────
  how_title: {
    en: 'How It Works',
    zh: '怎么玩',
    ja: '遊び方',
    ko: '플레이 방법',
    es: 'Cómo se juega',
  },
  how_step1_label: { en: 'PICK A COVER', zh: '挑一本封面', ja: '表紙を選ぶ', ko: '표지를 고른다', es: 'ELIGE UNA PORTADA' },
  how_step1_body: {
    en: '4 noir openings. pick one, crack it open.',
    zh: '4 个开场题材，挑一本翻开。',
    ja: '4つのノワール開幕。一つ選んで開ける。',
    ko: '네 가지 노와르 오프닝. 한 권 골라 펼친다.',
    es: '4 inicios noir. elige uno y ábrelo.',
  },
  how_step2_label: { en: 'CHOOSE × 6', zh: '6 拍选择', ja: '6回選ぶ', ko: '여섯 번 선택', es: 'ELIGE × 6' },
  how_step2_body: {
    en: 'every beat: defy, yield, or lie. AI writes the rest.',
    zh: '每拍三选一：抗 / 从 / 骗。AI 接着写。',
    ja: '毎ビート：抗う・従う・偽る。続きはAIが書く。',
    ko: '매 박자마다: 거역 · 굴복 · 거짓. 나머지는 AI가.',
    es: 'cada ritmo: desafía, cede o miente. la IA hace el resto.',
  },
  how_step3_label: { en: 'FILE IT', zh: '送进杂志架', ja: '掲示板へ', ko: '가판대로', es: 'ARCHÍVALO' },
  how_step3_body: {
    en: 'AI illustrates your ending. it joins the newsstand.',
    zh: 'AI 给你结局画封面，挂上墙让别人读。',
    ja: 'AIが結末を描く。掲示板に並ぶ。',
    ko: 'AI가 결말을 그린다. 가판대에 걸린다.',
    es: 'la IA ilustra tu final. va al quiosco.',
  },
  how_hide: {
    en: 'hide intro',
    zh: '隐藏说明',
    ja: '説明を隠す',
    ko: '안내 숨기기',
    es: 'ocultar intro',
  },
  how_show: {
    en: 'how it works',
    zh: '玩法说明',
    ja: '遊び方',
    ko: '플레이 방법',
    es: 'cómo se juega',
  },

  // ── newsstand ───────────────────────────────────────────────────────
  newsstand_title: {
    en: "This Week's Issues",
    zh: '本期目录',
    ja: '今週の号',
    ko: '이번 주 호',
    es: 'Edición de la Semana',
  },
  newsstand_subtitle: {
    en: 'Pick one. Crack it open.',
    zh: '选一本翻开。',
    ja: '一つ選んで開けて。',
    ko: '한 권 골라 펼쳐.',
    es: 'Elige una. Ábrela.',
  },
  read_now: { en: 'Read Now', zh: '翻开', ja: '読む', ko: '읽기', es: 'Leer' },

  // ── beat ────────────────────────────────────────────────────────────
  beat_of: {
    en: 'Beat {n} of 6',
    zh: '节拍 {n} / 6',
    ja: 'ビート {n} / 6',
    ko: '박자 {n} / 6',
    es: 'Ritmo {n} de 6',
  },
  axis_defy:  { en: 'Defy',  zh: '抗', ja: '抗', ko: '거역', es: 'Desafía' },
  axis_yield: { en: 'Yield', zh: '从', ja: '従', ko: '굴복', es: 'Cede' },
  axis_lie:   { en: 'Lie',   zh: '骗', ja: '偽', ko: '거짓', es: 'Miente' },

  loading_narrating: {
    en: 'Writing the next beat…',
    zh: '正在编写下一拍…',
    ja: '次のビートを執筆中…',
    ko: '다음 박자 집필 중…',
    es: 'Escribiendo el siguiente ritmo…',
  },
  loading_illustrating: {
    en: 'Etching the closing illustration…',
    zh: '正在为结局刻画插图…',
    ja: '結末のイラストを版画中…',
    ko: '결말 일러스트를 새기는 중…',
    es: 'Grabando la ilustración final…',
  },

  // ── ending ──────────────────────────────────────────────────────────
  ending_byline:    { en: 'A story by',   zh: '撰稿',     ja: '執筆',       ko: '글쓴이',  es: 'Una historia de' },
  ending_anonymous: { en: 'Anonymous',    zh: 'Anonymous', ja: '匿名',     ko: '익명',    es: 'Anónimo' },
  ending_share: {
    en: 'Send to the Newsstand',
    zh: '送到杂志架',
    ja: '掲示板へ送る',
    ko: '가판대로 보내기',
    es: 'Enviar al quiosco',
  },
  ending_back: {
    en: 'Back to Issues',
    zh: '回到目录',
    ja: '一覧へ戻る',
    ko: '목록으로',
    es: 'Volver al sumario',
  },

  // ── wall ────────────────────────────────────────────────────────────
  wall_title: {
    en: 'The Newsstand',
    zh: '杂志架',
    ja: '掲示板',
    ko: '가판대',
    es: 'El Quiosco',
  },
  wall_subtitle: {
    en: 'Stories readers finished this week.',
    zh: '本周读者完成的故事。',
    ja: '今週、読者が書き上げた物語。',
    ko: '독자들이 이번 주 완성한 이야기들.',
    es: 'Historias que los lectores cerraron esta semana.',
  },
  wall_empty: {
    en: 'Empty rack. Be the first to finish a story.',
    zh: '空架子。先成为第一个写完的人。',
    ja: '棚は空。最初の一本を書こう。',
    ko: '비어 있는 진열대. 첫 이야기를 완성해 보세요.',
    es: 'Estantería vacía. Sé el primero en cerrar una historia.',
  },
  wall_open: {
    en: 'Pick Up a New Issue',
    zh: '翻一本新刊',
    ja: '新しい号を読む',
    ko: '새 호 펼치기',
    es: 'Tomar un Nuevo Número',
  },
  wall_self: { en: 'You', zh: '你', ja: 'あなた', ko: '당신', es: 'Tú' },

  reactions_riveted: { en: 'Riveted', zh: '入迷', ja: '釘付け', ko: '몰입', es: 'Cautivado' },
  reactions_spooked: { en: 'Spooked', zh: '寒栗', ja: '戦慄',   ko: '오싹',  es: 'Acojonado' },
  reactions_cursed:  { en: 'Cursed',  zh: '被诅', ja: '呪い',   ko: '저주',  es: 'Maldito' },

  story_read:  { en: 'Read this story', zh: '读这篇', ja: 'この物語を読む', ko: '이 이야기 읽기', es: 'Leer esta historia' },
  story_close: { en: 'Close', zh: '合上', ja: '閉じる', ko: '닫기', es: 'Cerrar' },

  hint_pick: {
    en: 'Tap a cover to start',
    zh: '点一本封面开始',
    ja: '表紙をタップして開始',
    ko: '표지를 눌러 시작',
    es: 'Toca una portada para empezar',
  },

  error_generic: {
    en: 'The story jammed. Try the beat again.',
    zh: '故事卡住了。再来一拍。',
    ja: '物語が詰まった。もう一度。',
    ko: '이야기가 막혔다. 다시 시도.',
    es: 'La historia se atascó. Intenta de nuevo.',
  },
  retry: { en: 'Retry', zh: '重试', ja: '再試行', ko: '재시도', es: 'Reintentar' },

  // ── footer (new) ────────────────────────────────────────────────────
  footer_fin: {
    en: 'FIN · TO BE CONTINUED',
    zh: 'FIN · TO BE CONTINUED',
    ja: 'FIN · TO BE CONTINUED',
    ko: 'FIN · TO BE CONTINUED',
    es: 'FIN · TO BE CONTINUED',
  },
} as const;

type Key = keyof typeof STRINGS;

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const override = localStorage.getItem('game_locale');
    if (override && LOCALES.includes(override as Locale)) return override as Locale;
  } catch { /* ignore */ }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('es')) return 'es';
  return 'en';
}

let _locale: Locale = detectLocale();

export function locale(): Locale {
  return _locale;
}

export function setLocale(l: Locale) {
  _locale = l;
  try { localStorage.setItem('game_locale', l); } catch { /* ignore */ }
  // Notify subscribers so React can re-render with the new strings.
  try { window.dispatchEvent(new CustomEvent('ph-locale', { detail: l })); } catch { /* ignore */ }
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  const tpl = STRINGS[key]?.[_locale] ?? STRINGS[key]?.en ?? key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export type { Locale };
