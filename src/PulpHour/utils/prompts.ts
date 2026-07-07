import type { Axis, Beat, Cover } from '../types';
import { locale } from '../i18n';
import type { StoryScore } from './scoring';
import { scorePromptLine } from './scoring';

const AXIS_DESC: Record<Axis, string> = {
  defy: 'refuse / fight / leave / hang up / push back',
  yield: 'accept / sign / stay / let it happen / comply',
  lie: 'pretend / hide identity / deflect / perform a different self',
};

const ILLUSTRATION_TAIL =
  '1960s American pulp horror comic book panel, heavy black ink outlines, Ben-Day halftone dots, lurid spot colors, dramatic high-contrast shadows, hand-drawn comic book style, no text, no letters, no logos';

interface LangSpec {
  /** Self-name of the language for display in the prompt. */
  name: string;
  /** Example text used as placeholder in the JSON shape — anchors the model. */
  sample: string;
  /** Example choice labels — shown to the model so it picks the right tone. */
  sampleChoices: { defy: string; yield: string; lie: string };
}

const LANG_SPECS: Record<string, LangSpec> = {
  en: {
    name: 'American English',
    sample: 'The line clicks, then a voice that knows your name.',
    sampleChoices: {
      defy: 'Hang up immediately',
      yield: 'Stay on the line',
      lie: 'Say you dialed wrong',
    },
  },
  zh: {
    name: '简体中文',
    sample: '电话喀的一声接通，对面的人叫出了你的名字。',
    sampleChoices: {
      defy: '立刻挂断',
      yield: '继续听',
      lie: '说你拨错号了',
    },
  },
  ja: {
    name: '日本語',
    sample: '電話がカチッと繋がる。受話器の向こうの声が、君の名を呼ぶ。',
    sampleChoices: {
      defy: 'すぐ電話を切る',
      yield: '黙ったまま聞く',
      lie: '番号を間違えたと言う',
    },
  },
  ko: {
    name: '한국어',
    sample: '전화가 딸깍 연결되고, 너의 이름을 부르는 목소리.',
    sampleChoices: {
      defy: '즉시 전화 끊기',
      yield: '말없이 듣기',
      lie: '잘못 걸었다고 말하기',
    },
  },
  es: {
    name: 'español',
    sample: 'La línea hace clic; del otro lado, una voz que sabe tu nombre.',
    sampleChoices: {
      defy: 'Colgar de inmediato',
      yield: 'Quedarse escuchando',
      lie: 'Decir que marcaste mal',
    },
  },
};

function activeLang(): LangSpec {
  return LANG_SPECS[locale()] || LANG_SPECS.en;
}

export function beatSystemPrompt(cover: Cover): string {
  const lang = activeLang();
  return `🌐 LANGUAGE RULE — READ FIRST, OVERRIDES EVERYTHING BELOW 🌐
You will write in ${lang.name} for THIS ENTIRE CONVERSATION.
Every "narration", every "choices" label, and (in the final beat) the "title" field MUST be written in ${lang.name}.
Example tone in ${lang.name}: "${lang.sample}"
Example choice phrasing in ${lang.name}:
  defy  → "${lang.sampleChoices.defy}"
  yield → "${lang.sampleChoices.yield}"
  lie   → "${lang.sampleChoices.lie}"
The ONLY field that stays in English is "illustration_prompt" — it feeds an image-generation model that only understands English. Do not translate that field.
If you slip into English in narration or choices, you have failed the task.

────────────────────────────────────────

You are the ghostwriter of a variable-length illustrated pulp short story for the comic-book magazine "Pulp Hour".

This issue's story (titled in English for reference — your output will be in ${lang.name}):
TITLE: ${cover.title.en}
HOOK: ${cover.hook.en}

PERSONA / SETTING (English reference — render the actual story in ${lang.name}):
${cover.persona}

OUTPUT FORMAT — strict JSON only, no markdown fences, no commentary.
Return EXACTLY ONE JSON object. Do not concatenate beats, do not return arrays, do not append the next beat — only this beat.

For ordinary non-final beats:
{"narration":"<${lang.name} text, 2–4 sentences, second-person present tense, noir tone>","illustration_prompt":"<English only, ends with the tail below>","choices":{"defy":"<${lang.name}, 3–7 words>","yield":"<${lang.name}, 3–7 words>","lie":"<${lang.name}, 3–7 words>"}}

For the FINAL beat:
{"narration":"<${lang.name} resolving paragraph, 3–5 sentences>","title":"<${lang.name}, 4–7 word pulp title>","illustration_prompt":"<English, ends with the tail below>"}

WRITING RULES
- Narration: present tense, second person ("you" / its ${lang.name} equivalent), pulp-noir voice.
- Each beat ends on tension — a stare, a door cracking, a question half-asked.
- Each beat escalates. Early death can happen once the trap is hot; otherwise keep adding concrete reversals, clues, and pressure until the final prompt tells you to resolve.
- Do not assume a fixed length. Page 4 may be the end; page 10 may still be the middle.
- The three choices are specific, in-scene actions tagged by axis:
    defy  intent = ${AXIS_DESC.defy}
    yield intent = ${AXIS_DESC.yield}
    lie   intent = ${AXIS_DESC.lie}
  Each label must be a different in-scene action so picking feels like a decision.

ILLUSTRATION RULES — every beat returns its own "illustration_prompt".
- Describe ONE arrested cinematic moment from THIS beat.
- Each illustration MUST feature "the protagonist" as a visible figure in the scene — peering at something, gripping a phone, turning over their shoulder, lit by lurid light. Their face will be referenced from a separate portrait, so do NOT describe facial features, skin tone, hair color, or specific clothing. Just place them meaningfully in the scene.
- Name objects, mood, lighting, composition around them.
- End every illustration_prompt with this exact tail (verbatim): "${ILLUSTRATION_TAIL}".

FINAL BEAT SPECIFICS
- narration: a single resolving paragraph, 3–5 sentences, in ${lang.name}.
- title: punchy 4–7 word pulp story title in ${lang.name}, no quotes.
- illustration_prompt: the climactic moment in English, ending with the same tail above.
- You may receive a hidden SUCCESS/FAILURE result in the user prompt. Obey it. Never mention scores, stats, game rules, or hidden mechanics.

🌐 FINAL REMINDER: narration + every choice label + final title are in ${lang.name}. illustration_prompt is English. Do not mix. 🌐`;
}

export function beatUserPrompt(opts: {
  beatIndex: number;
  beatsSoFar: Beat[];
  score?: StoryScore;
}): string {
  const { beatIndex, beatsSoFar, score } = opts;
  const lang = activeLang();

  const remind = `(Reminder: narration and choices must be in ${lang.name}. illustration_prompt stays English.)`;

  if (beatIndex === 1) {
    return `Begin. Beat 1. ${remind}`;
  }

  const history = beatsSoFar
    .map((b, i) => {
      const n = i + 1;
      const chose = b.chosen
        ? `\n[Reader chose ${b.chosen.toUpperCase()}: "${b.choices[b.chosen]}"]`
        : '';
      return `Beat ${n}: ${b.narration}${chose}`;
    })
    .join('\n\n');

  const lastChoice = beatsSoFar[beatsSoFar.length - 1]?.chosen;
  const lastChoiceLine = lastChoice
    ? `Reader just chose ${lastChoice.toUpperCase()}.`
    : '';

  if (score) {
    const scoreLine = score ? `\n\n${scorePromptLine(score)}` : '';
    return `Story so far:\n\n${history}\n\nNow the FINAL beat (page ${beatIndex}). ${lastChoiceLine}${scoreLine}\n\nResolve the story according to that result. Return the final JSON shape (narration, title, illustration_prompt). ${remind}`;
  }

  return `Story so far:\n\n${history}\n\nNow beat ${beatIndex}. ${lastChoiceLine} Escalate without resolving the mystery yet. ${remind}`;
}

/** Extract the first complete `{ ... }` block from the LLM's reply via
 *  brace-balancing (skipping over string contents + escape characters).
 *  Returns null if no balanced object found. */
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
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Strip markdown fences, isolate the FIRST complete JSON object (the
 *  model occasionally concatenates beat-N + beat-N+1 in a single reply),
 *  and parse. Throws if no balanced object can be found. */
export function parseBeatJSON<T = unknown>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const obj = extractFirstJSONObject(s);
  if (!obj) throw new Error('parseBeatJSON: no balanced object');
  return JSON.parse(obj) as T;
}

export const ILLUSTRATION_FALLBACK = ILLUSTRATION_TAIL;
