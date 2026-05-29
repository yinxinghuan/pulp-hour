import type { Cover, CoverId } from '../types';

export const COVERS: Cover[] = [
  {
    id: 'operator',
    title: 'Last Call at the All-Night Operator',
    subtitle: 'a hotline noir',
    hook: "You dial a number you weren't supposed to keep. Somebody picks up. Somebody who shouldn't.",
    ink: '#1E4FB8',
    imageUrl: '/pulp-hour/covers/operator.jpg',
    persona: `Setting: an all-night 1-800 hotline switchboard, fluorescent buzz, beige plastic, ashtrays. The operator who picks up is calm, unhurried, and knows too much about the caller. Voice: deadpan, faintly clerical, occasionally tender. Threat is administrative, not loud. Reveals come through paperwork and casual familiarity.`,
  },
  {
    id: 'tenant',
    title: 'The Tenant in 4B',
    subtitle: 'a haunting in three rooms',
    hook: 'You moved in last Tuesday. The previous tenant left a key under the sink and a chair facing the wall.',
    ink: '#7A3FB8',
    imageUrl: '/pulp-hour/covers/tenant.jpg',
    persona: `Setting: a one-bedroom apartment on the fourth floor of a pre-war building, August humidity, a chair the protagonist did not place. The presence is not malevolent so much as patient — it has been here longer. Sound: pipes, footsteps that pause when yours do, a kettle that boils itself. Voice: hushed, domestic, increasingly intimate.`,
  },
  {
    id: 'voyager',
    title: 'Static from Voyager 9',
    subtitle: 'a transmission across fifty years',
    hook: 'You are alone in orbit. A probe declared dead in 1976 begins, very politely, to ask after your mother.',
    ink: '#3B7A6A',
    imageUrl: '/pulp-hour/covers/voyager.jpg',
    persona: `Setting: a single-occupant orbital station, two months into a six-month tour, plant trays under grow-lamps, a transmission breaking through that should not exist. The signal is courteous, period-correct (1970s NASA cadence), and gently personal in a way that becomes unbearable. Voice: clean, polite, with carrier hum. Threat is loneliness and accuracy.`,
  },
  {
    id: 'last-train',
    title: 'The Last Train Home',
    subtitle: 'an after-midnight romance',
    hook: 'The car is empty except for one stranger. They sit down next to you, of all the seats, and say your old name.',
    ink: '#E54B3C',
    imageUrl: '/pulp-hour/covers/last-train.jpg',
    persona: `Setting: the last subway car of the night, sodium-orange tunnel light, the chime of doors closing for the last time. The stranger knows things. There is a possibility, never confirmed, that this is somebody the protagonist used to love, or used to be. Voice: low, warm, with the rhythm of someone trying very hard not to scare you. Threat is intimacy.`,
  },
];

export function getCover(id: CoverId): Cover {
  const c = COVERS.find(c => c.id === id);
  if (!c) throw new Error(`unknown cover: ${id}`);
  return c;
}
