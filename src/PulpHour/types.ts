export type Axis = 'defy' | 'yield' | 'lie';

export const AXES: Axis[] = ['defy', 'yield', 'lie'];

export type CoverId = 'operator' | 'tenant' | 'voyager' | 'last-train';

export interface Cover {
  id: CoverId;
  title: string;         // big pulp headline
  subtitle: string;      // dek
  hook: string;          // one-line pitch shown on cover
  persona: string;       // injected into LLM system prompt
  imageUrl: string;      // pre-baked cover art (in /public/covers/)
  ink: string;           // dominant ink color for this issue
}

export interface Beat {
  narration: string;
  choices: Record<Axis, string>; // contextual labels per axis
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
