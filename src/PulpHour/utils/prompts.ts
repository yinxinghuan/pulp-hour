import type { Axis, Beat, Cover } from '../types';

const AXIS_DESC: Record<Axis, string> = {
  defy: 'refuse, fight, leave, hang up, push back',
  yield: 'accept, sign, stay, let it happen, comply',
  lie: 'pretend, hide identity, deflect, perform a different self',
};

export function beatSystemPrompt(cover: Cover): string {
  return `You are the ghostwriter of a 6-beat pulp short story for the magazine "Pulp Hour".

This issue's story:
TITLE: ${cover.title}
HOOK: ${cover.hook}

PERSONA / SETTING:
${cover.persona}

OUTPUT FORMAT — strict JSON only, no markdown fences, no commentary.

For beats 1–5:
{"narration":"...","choices":{"defy":"...","yield":"...","lie":"..."}}

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
- Beat 6 returns a single resolving paragraph (3–5 sentences), a 4–7 word title in Title Case (no quotes), and an "illustration_prompt" describing the climactic moment as a 1950s pulp magazine illustration. End the illustration_prompt with the phrase: "1950s pulp magazine illustration, heavy halftone, cobalt blue and tomato red on cream paper, dramatic lighting."

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
  // Strip ```json ... ``` fences if present.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Sometimes the model prepends a stray "Beat 3:" or similar — pick the first {...}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    s = s.slice(first, last + 1);
  }
  return JSON.parse(s) as T;
}
