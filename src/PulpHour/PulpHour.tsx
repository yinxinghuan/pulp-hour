import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '@shared/save';
import { isInAigram } from '@shared/runtime';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import { useGameStats } from '@shared/runtime/useGameStats';
import { getCover } from './utils/covers';
import {
  useBeatEngine,
  assembleStory,
  coverPublicRef,
  generateIllustration,
} from './hooks/useBeatEngine';
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
import LangSwitcher from './components/LangSwitcher';
import { t, locale } from './i18n';
import type {
  Axis, Beat, CoverId, Ending, Phase, PulpSave, Reaction, Story, WallEntry,
} from './types';
import './PulpHour.less';

const MAX_STORIES = 20;
const MID_BEATS = 5;
const PUBLISH_WAIT_MS = 60_000;

function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function PulpHour() {
  const demo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('demo');
  }, []);

  // Dev escape hatch: `?nolimit=1` bypasses the 1-story-per-day quota so
  // we can iterate on the engine without burning a day each round.
  const noLimit = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('nolimit') === '1';
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────
  const { savedData, persist, loaded: saveLoaded } = useGameSave<PulpSave>('pulp-hour');
  const myStories = savedData?.stories ?? [];

  // ── Wall ───────────────────────────────────────────────────────────────
  const { entries: liveEntries, loaded: wallLoaded, refresh: refreshWall } = useWall();

  // ── Engine ─────────────────────────────────────────────────────────────
  const engine = useBeatEngine();
  const { trigger } = useGameEvent();
  const { stats } = useGameStats('publish-story');

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
  const [publishing, setPublishing] = useState(false);

  // Track per-beat illustration promises so shareEnding can await them.
  const illustrationPromisesRef = useRef<Map<number, Promise<string | undefined>>>(new Map());
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

  // ── Locale change → force re-render ────────────────────────────────────
  const [, setLocaleTick] = useState(0);
  useEffect(() => {
    function onLocale() { setLocaleTick(n => n + 1); }
    window.addEventListener('ph-locale', onLocale);
    return () => window.removeEventListener('ph-locale', onLocale);
  }, []);

  // ── Daily quota: my newest story today → locked ───────────────────────
  // Gate on saveLoaded so the brief load window doesn't render the write
  // CTA as unlocked — without this, a quick swipe/tap during load could
  // dive into the writing flow before the cloud save resolves.
  const filedTodayAt = myStories[0]?.createdAt;
  const lockedToday =
    saveLoaded && !!filedTodayAt && isSameLocalDay(filedTodayAt, Date.now());

  // ── Helpers ────────────────────────────────────────────────────────────
  function markPanelLoadFailed(idx: number) {
    // The <img> for an already-returned URL failed to load (CDN blip,
    // expired link, etc). Drop the URL and flag failed so the retry
    // button shows and the wall + viewer fall back to the cover.
    setBeats(prev => {
      const next = [...prev];
      const b = next[idx];
      if (b && b.illustrationUrl) {
        next[idx] = { ...b, illustrationUrl: undefined, illustrationFailed: true };
      }
      return next;
    });
  }

  async function retryEndingIllustration() {
    if (!activeCoverId || !ending?.illustrationPrompt) return;
    try {
      const url = await generateIllustration({
        prompt: ending.illustrationPrompt,
        refUrl: me?.avatarUrl || coverPublicRef(activeCoverId),
      });
      setEnding(prev => prev ? { ...prev, illustrationUrl: url } as Ending : prev);
    } catch {
      /* leave ending.illustrationUrl undefined; fallback chain still
         shows the last beat or the cover */
    }
  }

  function retryPanelIllustration(idx: number) {
    if (!activeCoverId) return;
    const beat = beats[idx];
    if (!beat?.illustrationPrompt) return;
    // Clear failed flag so the panel re-enters the cooking state immediately.
    setBeats(prev => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], illustrationFailed: false };
      return next;
    });
    startBeatIllustration(activeCoverId, idx, beat.illustrationPrompt);
  }

  function startBeatIllustration(coverId: CoverId, idx: number, prompt: string) {
    // Kick off a per-beat splash. Store the promise; when it resolves,
    // patch the beat in state. On final failure (after the retry inside
    // generateIllustration) mark illustrationFailed so the choice row
    // can unlock and the panel can fall back to the cover image.
    //
    // Ref strategy: prefer the player's Aigram avatar so the protagonist
    // in each panel inherits their likeness (subject-as-ref pattern from
    // Mugshot Booth). Fall back to the cached cover when the player has
    // no avatar (off-platform or new account).
    const ref = me?.avatarUrl || coverPublicRef(coverId);
    const p = generateIllustration({ prompt, refUrl: ref })
      .then(url => {
        setBeats(prev => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], illustrationUrl: url };
          return next;
        });
        return url;
      })
      .catch(() => {
        setBeats(prev => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], illustrationFailed: true };
          return next;
        });
        return undefined;
      });
    illustrationPromisesRef.current.set(idx, p);
  }

  function resetSession() {
    setActiveCoverId(null);
    setBeats([]);
    setEnding(null);
    setError(null);
    setPublishing(false);
    pendingStoryRef.current = null;
    illustrationPromisesRef.current = new Map();
  }

  // ── Flow handlers ──────────────────────────────────────────────────────
  function goWall() {
    setPhase('wall');
    resetSession();
  }

  function goNewsstand() {
    setPhase('newsstand');
  }

  async function pickCover(coverId: CoverId) {
    resetSession();
    setActiveCoverId(coverId);
    setPhase('beat');
    try {
      const first = await engine.nextBeat(coverId, []);
      setBeats([first]);
      // Kick off illustration for beat 1 in the background.
      if (first.illustrationPrompt) {
        startBeatIllustration(coverId, 0, first.illustrationPrompt);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function chooseAxis(axis: Axis) {
    if (!activeCoverId) return;
    if (engine.loading) return;

    const stamped = [...beats];
    stamped[stamped.length - 1] = { ...stamped[stamped.length - 1], chosen: axis };
    setBeats(stamped);

    try {
      if (stamped.length < MID_BEATS) {
        const next = await engine.nextBeat(activeCoverId, stamped);
        const newBeats = [...stamped, next];
        setBeats(newBeats);
        // Kick off illustration for this beat (async; player advances anyway).
        if (next.illustrationPrompt) {
          startBeatIllustration(activeCoverId, newBeats.length - 1, next.illustrationPrompt);
        }
      } else {
        // Beat 5 just answered → generate the closing beat (sync wait — needs
        // its illustration before publish). Use the player's avatar as ref
        // so the closing panel matches the per-beat splashes' protagonist.
        setPhase('ending');
        const end = await engine.finishStory(activeCoverId, stamped, {
          refUrl: me?.avatarUrl,
        });
        setEnding(end);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function retryBeat() {
    if (!activeCoverId) return;
    setError(null);
    const trimmed = beats.slice(0, -1);
    try {
      if (phase === 'ending') {
        const end = await engine.finishStory(activeCoverId, beats, {
          refUrl: me?.avatarUrl,
        });
        setEnding(end);
      } else {
        const next = await engine.nextBeat(activeCoverId, trimmed);
        const newBeats = [...trimmed, next];
        setBeats(newBeats);
        if (next.illustrationPrompt) {
          startBeatIllustration(activeCoverId, newBeats.length - 1, next.illustrationPrompt);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function shareEnding() {
    if (!activeCoverId || !ending) return;
    setPublishing(true);

    // Wait for any pending beat illustrations to land (with a hard timeout
    // so failures don't lock the publish flow).
    const pendings = Array.from(illustrationPromisesRef.current.values());
    if (pendings.length) {
      const timeout = new Promise(res => setTimeout(res, PUBLISH_WAIT_MS));
      await Promise.race([Promise.allSettled(pendings), timeout]);
    }

    // Snapshot the latest beats array (with any URLs that arrived).
    let snapshot: Beat[] = [];
    setBeats(prev => { snapshot = prev; return prev; });
    // setBeats with an identity returner is the cleanest way to read latest
    // state synchronously without restructuring; equivalent to a ref read.
    const finalBeats = snapshot.length ? snapshot : beats;

    const story = assembleStory({
      coverId: activeCoverId,
      beats: finalBeats,
      ending,
      authorName: me?.name,
      authorLocale: locale(),
    });
    pendingStoryRef.current = story;

    const nextSave: PulpSave = {
      stories: [story, ...myStories].slice(0, MAX_STORIES),
    };
    persist(nextSave);

    trigger('publish-story', { story_id: story.id, cover_id: story.coverId });

    refreshWall();
    setPublishing(false);
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
          saveLoaded={saveLoaded || demo === 'wall' || demo === 'viewer'}
          lockedToday={lockedToday && !noLimit && demo !== 'wall' && demo !== 'viewer'}
          streakDays={stats.continuous_days}
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
          onRetryPanel={retryPanelIllustration}
          onLoadFailPanel={markPanelLoadFailed}
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
          loading={engine.loading || !ending || publishing}
          loadingStage={publishing ? 'closing' : engine.stage}
          authorName={me?.name}
          authorAvatarUrl={me?.avatarUrl}
          onShare={shareEnding}
          onBack={goWall}
          onRetryEnding={retryEndingIllustration}
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

      <LangSwitcher />
      <Watermark />
    </div>
  );
}
