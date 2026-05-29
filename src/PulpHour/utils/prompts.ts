import type { Axis, Beat, Cover } from '../types';

const AXIS_DESC: Record<Axis, string> = {
  defy: 'refuse, fight, leave, hang up, push back',
  yield: 'accept, sign, stay, let it happen, comply',
  lie: 'pretend, hide identity, deflect, perform a different self',
};

const ILLUSTRATION_TAIL =
  '1960s American pulp horror comic book panel, heavy black ink outlines, Ben-Day halftone dots, lurid spot colors, dramatic high-contrast shadows, hand-drawn comic book style, no text, no letters, no logos';

export function beatSystemPrompt(cover: Cover): string {
  return `You are the ghostwriter of a 6-beat illustrated pulp short story for the comic-book magazine "Pulp Hour".

This issue's story:
TITLE: ${cover.title}
HOOK: ${cover.hook}

PERSONA / SETTING:
${cover.persona}

OUTPUT FORMAT — strict JSON only, no markdown fences, no commentary.

For beats 1–5:
{"narration":"...","illustration_prompt":"...","choices":{"defy":"...","yield":"...","lie":"..."}}

For beat 6 (FINAL):
{"narration":"...","title":"...","illustration_prompt":"..."}

WRITING RULES
- "narration" is 2–4 sentences, present tense, second person ("you"), pulp-noir voice.
- Each beat ends on tension — a stare, a door cracking, a question half-asked.
- Each beat must escalate. By beat 5 the situation should be uncomfortable enough to require a real ending.
- The three choices are specific, in-scene actions (3–7 words), tagged by axis:
    defy  = ${AXIS_DESC.defy}
    yield = ${AXIS_DESC.yield}
    lie   = ${AXIS_DESC.lie}
  Each label must be different enough that picking feels like a decision, not a coin flip.

ILLUSTRATION RULES — every beat (including 1–5) returns its own "illustration_prompt".
- Describe ONE arrested cinematic moment from THIS beat — a single readable image.
- Subject-agnostic: name objects, mood, lighting, composition. Do NOT describe specific faces / clothing details.
- End every illustration_prompt with this exact tail (verbatim, including punctuation): "${ILLUSTRATION_TAIL}".

BEAT 6 SPECIFICS
- "narration" resolves the story in a single paragraph (3–5 sentences).
- "title" is a punchy 4–7 word pulp story title in Title Case, no quotes.
- "illustration_prompt" describes the climactic moment and ends with the same tail above.

Keep narration TIGHT. No throat-clearing. No "you find yourself" openers.`;
}

export function beatUserPrompt(opts: {
  beatIndex: number; // 1..6
  beatsSoFar: Beat[];
}): string {
  const { beatIndex, beatsSoFar } = opts;

  if (beatIndex === 1) {
    return 'Begin. Beat 1 of 6.';
  }

  const history = beatsSoFar
    .map((b, i) => {
      const n = i + 1;
      const chose = b.chosen
        ? `\n[The reader chose ${b.chosen.toUpperCase()}: "${b.choices[b.chosen]}"]`
        : '';
      return `Beat ${n}: ${b.narration}${chose}`;
    })
    .join('\n\n');

  const lastChoice = beatsSoFar[beatsSoFar.length - 1]?.chosen;
  const lastChoiceLine = lastChoice
    ? `The reader just chose ${lastChoice.toUpperCase()}.`
    : '';

  if (beatIndex === 6) {
    return `So far:\n\n${history}\n\nNow the FINAL beat (6 of 6). ${lastChoiceLine} Resolve the story. Return the beat-6 JSON shape (narration, title, illustration_prompt).`;
  }

  return `So far:\n\n${history}\n\nNow beat ${beatIndex} of 6. ${lastChoiceLine} Escalate.`;
}

/** Strip any markdown fences and try to parse the LLM's reply as JSON. */
export function parseBeatJSON<T = unknown>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    s = s.slice(first, last + 1);
  }
  return JSON.parse(s) as T;
}

export const ILLUSTRATION_FALLBACK = ILLUSTRATION_TAIL;
