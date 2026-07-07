export type Axis = 'defy' | 'yield' | 'lie';

export const AXES: Axis[] = ['defy', 'yield', 'lie'];
export const MIN_STORY_BEAT_COUNT = 3;
export const MIN_FINALE_PAGE = MIN_STORY_BEAT_COUNT + 1;
export const MAX_STORY_BEAT_COUNT = 12;

// Cover IDs are open-ended — a new one drops every 2 days, so we treat the
// id as a free-form slug instead of a closed union. Keep ids kebab-case.
export type CoverId = string;

export type CoverLocale = 'en' | 'zh' | 'ja' | 'ko' | 'es';

export interface Cover {
  id: CoverId;
  title: Record<CoverLocale, string>;       // big pulp headline, per locale
  subtitle: Record<CoverLocale, string>;    // dek, per locale
  hook: Record<CoverLocale, string>;        // one-line pitch shown on cover, per locale
  persona: string;                          // injected into LLM system prompt (English)
  imageUrl: string;
  ink: string;
  // ISO8601 UTC instant the issue goes live in the newsstand. Covers with
  // a future releasedOn render as the sealed "coming next" preview slot;
  // covers with a past releasedOn become readable issues. Cadence: one new
  // issue every 2 days, dropping at 00:00 UTC.
  releasedOn: string;
}

export interface Beat {
  narration: string;
  choices: Record<Axis, string>;     // contextual labels per axis
  illustrationPrompt: string;         // returned by every non-final beat
  illustrationUrl?: string;           // filled in async as gen-image lands
  illustrationFailed?: boolean;       // set after all retries exhausted
  chosen?: Axis;
}

export type StoryOutcome = 'success' | 'failure';
export type FailureReason = 'burned' | 'lost' | 'unmasked' | 'doomed';

export interface Ending {
  narration: string;
  title: string;
  illustrationPrompt: string;
  illustrationUrl?: string;
  outcome?: StoryOutcome;
  failureReason?: FailureReason;
}

export interface Story {
  id: string;
  coverId: CoverId;
  beats: Beat[];        // mid beats before the finale
  ending: Ending;       // final beat
  outcome?: StoryOutcome;
  failureReason?: FailureReason;
  authorName?: string;  // captured at write-time (real-name byline)
  authorLocale?: string; // 'en' | 'zh' | 'ja' | 'ko' | 'es' — language the
                        // story body was written in. Drives the translate
                        // affordance in StoryViewer. Missing on pre-v0.16
                        // stories — fall back to character-set detection.
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
