export type Axis = 'defy' | 'yield' | 'lie';

export const AXES: Axis[] = ['defy', 'yield', 'lie'];

export type CoverId = 'operator' | 'tenant' | 'voyager' | 'last-train';

export type CoverLocale = 'en' | 'zh' | 'ja' | 'ko' | 'es';

export interface Cover {
  id: CoverId;
  title: Record<CoverLocale, string>;       // big pulp headline, per locale
  subtitle: Record<CoverLocale, string>;    // dek, per locale
  hook: Record<CoverLocale, string>;        // one-line pitch shown on cover, per locale
  persona: string;                          // injected into LLM system prompt (English)
  imageUrl: string;
  ink: string;
}

export interface Beat {
  narration: string;
  choices: Record<Axis, string>;     // contextual labels per axis
  illustrationPrompt: string;         // returned by every beat (1–5)
  illustrationUrl?: string;           // filled in async as gen-image lands
  chosen?: Axis;
}

export interface Ending {
  narration: string;
  title: string;
  illustrationPrompt: string;
  illustrationUrl?: string;
}

export interface Story {
  id: string;
  coverId: CoverId;
  beats: Beat[];        // five mid beats (1-5)
  ending: Ending;       // beat 6
  authorName?: string;  // captured at write-time (real-name byline)
  createdAt: number;
}

export interface PulpSave {
  stories: Story[];     // newest first, cap 20
}

export interface WallEntry {
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  story: Story;
}

export type Phase = 'wall' | 'newsstand' | 'beat' | 'ending';

export const REACTIONS = ['riveted', 'spooked', 'cursed'] as const;
export type Reaction = (typeof REACTIONS)[number];
