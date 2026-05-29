import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '@shared/save';
import { isInAigram } from '@shared/runtime';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import { getCover } from './utils/covers';
import { useBeatEngine, assembleStory } from './hooks/useBeatEngine';
import { useWall } from './hooks/useWall';
import { fetchMe, type MeInfo } from './utils/me';
import { reactionEvent } from './utils/reactions';
import { installTapFeedback } from './utils/tapFeedback';
import { demoStories, demoWall, demoBeats } from './utils/demo';
import Wall from './components/Wall';
import Newsstand from './components/Newsstand';
import BeatScreen from './components/BeatScreen';
import EndingScreen from './components/EndingScreen';
import StoryViewer from './components/StoryViewer';
import Watermark from './components/Watermark';
import { t } from './i18n';
import type {
  Axis, Beat, CoverId, Ending, Phase, PulpSave, Reaction, Story, WallEntry,
} from './types';
import './PulpHour.less';

const MAX_STORIES = 20;
const MID_BEATS = 5;

export default function PulpHour() {
  const demo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('demo');
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────
  const { savedData, persist } = useGameSave<PulpSave>('pulp-hour');
  const myStories = savedData?.stories ?? [];

  // ── Wall ───────────────────────────────────────────────────────────────
  const { entries: liveEntries, loaded: wallLoaded, refresh: refreshWall } = useWall();

  // ── Engine ─────────────────────────────────────────────────────────────
  const engine = useBeatEngine();
  const { trigger } = useGameEvent();

  // ── Author ─────────────────────────────────────────────────────────────
  const [me, setMe] = useState<MeInfo | null>(null);
  useEffect(() => { fetchMe().then(setMe); }, []);

  // ── Phase state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('wall');
  const [activeCoverId, setActiveCoverId] = useState<CoverId | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [viewerEntry, setViewerEntry] = useState<WallEntry | null>(null);

  // For the ending byline + save, fix the current story id once committed.
  const pendingStoryRef = useRef<Story | null>(null);

  // ── Boot effects ───────────────────────────────────────────────────────
  useEffect(() => { installTapFeedback(); }, []);

  // ── Demo overrides ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo) return;
    if (demo === 'newsstand') {
      setPhase('newsstand');
    } else if (demo === 'beat') {
      const { beats: b, cover } = demoBeats('operator');
      setActiveCoverId(cover.id);
      setBeats(b);
      setPhase('beat');
    } else if (demo === 'ending') {
      const { beats: b, cover } = demoBeats('operator');
      setActiveCoverId(cover.id);
      setBeats(b);
      setEnding({
        narration:
          "The operator hangs up first, which the operator has never done. The hold-music starts on its own. You realize you are not on hold for them.",
        title: 'The Account Held in Your Name',
        illustrationPrompt: '',
        illustrationUrl: cover.imageUrl,
      });
      setPhase('ending');
    } else if (demo === 'wall') {
      setPhase('wall');
    } else if (demo === 'viewer') {
      const w = demoWall();
      setViewerEntry(w[0]);
      setPhase('wall');
    }
  }, [demo]);

  // ── Reaction custom event ──────────────────────────────────────────────
  useEffect(() => {
    function onReact(e: Event) {
      const detail = (e as CustomEvent).detail as { storyId: string; kind: Reaction };
      if (!detail) return;
      trigger(reactionEvent(detail.storyId, detail.kind));
    }
    window.addEventListener('ph-react', onReact);
    return () => window.removeEventListener('ph-react', onReact);
  }, [trigger]);

  // ── Flow handlers ──────────────────────────────────────────────────────
  function goWall() {
    setPhase('wall');
    setActiveCoverId(null);
    setBeats([]);
    setEnding(null);
    setError(null);
    pendingStoryRef.current = null;
  }

  function goNewsstand() {
    setPhase('newsstand');
  }

  async function pickCover(coverId: CoverId) {
    setActiveCoverId(coverId);
    setBeats([]);
    setEnding(null);
    setError(null);
    setPhase('beat');
    try {
      const first = await engine.nextBeat(coverId, []);
      setBeats([first]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function chooseAxis(axis: Axis) {
    if (!activeCoverId) return;
    if (engine.loading) return;

    // Stamp the current beat with the chosen axis.
    const stamped = [...beats];
    stamped[stamped.length - 1] = { ...stamped[stamped.length - 1], chosen: axis };
    setBeats(stamped);

    try {
      if (stamped.length < MID_BEATS) {
        const next = await engine.nextBeat(activeCoverId, stamped);
        setBeats([...stamped, next]);
      } else {
        // Beat 5 just answered → generate the closing beat.
        setPhase('ending');
        const end = await engine.finishStory(activeCoverId, stamped);
        setEnding(end);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function retryBeat() {
    if (!activeCoverId) return;
    setError(null);
    // If we have N beats, the last one may be a stub; regenerate from
    // beats[0..N-1] (i.e. drop the last and try again).
    const trimmed = beats.slice(0, -1);
    try {
      if (phase === 'ending') {
        const end = await engine.finishStory(activeCoverId, beats);
        setEnding(end);
      } else {
        const next = await engine.nextBeat(activeCoverId, trimmed);
        setBeats([...trimmed, next]);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  function shareEnding() {
    if (!activeCoverId || !ending) return;
    const story = assembleStory({
      coverId: activeCoverId,
      beats,
      ending,
      authorName: me?.name,
    });
    pendingStoryRef.current = story;

    // Save: prepend to stories (newest-first), cap.
    const nextSave: PulpSave = {
      stories: [story, ...myStories].slice(0, MAX_STORIES),
    };
    persist(nextSave);

    // Fire publish event (drives platform stats + notifications).
    trigger('publish-story', { story_id: story.id, cover_id: story.coverId });

    refreshWall();
    goWall();
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const activeCover = activeCoverId ? getCover(activeCoverId) : null;
  const wallEntries: WallEntry[] = liveEntries.length > 0
    ? liveEntries
    : demo === 'wall' || demo === 'viewer'
      ? demoWall()
      : [];
  const wallSelfStories = liveEntries.length > 0
    ? myStories
    : demo === 'wall' || demo === 'viewer'
      ? demoStories()
      : myStories;

  return (
    <div className="ph-root">
      {phase === 'wall' && (
        <Wall
          entries={wallEntries}
          loaded={wallLoaded}
          isInAigram={isInAigram}
          myStories={wallSelfStories}
          onPickNewIssue={goNewsstand}
          onOpenStory={setViewerEntry}
        />
      )}

      {phase === 'newsstand' && (
        <Newsstand onPick={pickCover} onBack={goWall} />
      )}

      {phase === 'beat' && activeCover && (
        <BeatScreen
          cover={activeCover}
          beats={beats}
          index={Math.max(1, beats.length)}
          loading={engine.loading}
          loadingStage={engine.stage}
          onChoose={chooseAxis}
          onBack={goWall}
        />
      )}

      {phase === 'ending' && activeCover && (
        <EndingScreen
          cover={activeCover}
          ending={ending ?? {
            narration: '',
            title: '…',
            illustrationPrompt: '',
          }}
          story={pendingStoryRef.current ?? {
            id: 'pending', coverId: activeCover.id, beats, ending: ending ?? {
              narration: '', title: '', illustrationPrompt: '',
            }, createdAt: Date.now(),
          }}
          loading={engine.loading || !ending}
          loadingStage={engine.stage}
          authorName={me?.name}
          authorAvatarUrl={me?.avatarUrl}
          onShare={shareEnding}
          onBack={goWall}
        />
      )}

      {viewerEntry && (
        <StoryViewer entry={viewerEntry} onClose={() => setViewerEntry(null)} />
      )}

      {error && (
        <div className="ph-toast">
          {t('error_generic')}
          <button className="ph-toast__btn" onPointerDown={retryBeat}>{t('retry')}</button>
        </div>
      )}

      <Watermark />
    </div>
  );
}
