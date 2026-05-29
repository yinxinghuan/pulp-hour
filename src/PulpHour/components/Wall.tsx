import { useEffect, useMemo, useState } from 'react';
import type { Reaction, Story, WallEntry } from '../types';
import { REACTIONS } from '../types';
import { getCover } from '../utils/covers';
import { REACTION_GLYPH, fallbackCount } from '../utils/reactions';
import { openAigramProfile } from '@shared/runtime/bridge';
import { t } from '../i18n';

interface Props {
  entries: WallEntry[];
  loaded: boolean;
  isInAigram: boolean;
  myStories: Story[];
  onPickNewIssue: () => void;
  onOpenStory: (entry: WallEntry) => void;
}

export default function Wall({
  entries, loaded, isInAigram, myStories, onPickNewIssue, onOpenStory,
}: Props) {
  // If real platform feed is empty / off-platform, blend the player's own
  // stories in so the rack never reads as dead.
  const displayed = useMemo<WallEntry[]>(() => {
    if (entries.length > 0) return entries;
    return myStories.slice(0, 6).map(s => ({
      userId: 'self',
      userName: t('wall_self'),
      story: s,
    }));
  }, [entries, myStories]);

  return (
    <div className="ph-wall">
      <div className="ph-wall__head">
        <div className="ph-wall__masthead">PULP HOUR</div>
        <div className="ph-wall__title">{t('wall_title')}</div>
        <div className="ph-wall__subtitle">{t('wall_subtitle')}</div>
      </div>

      <div className="ph-wall__cta-bar">
        <button className="ph-btn ph-btn--ink" onPointerDown={onPickNewIssue}>
          {t('wall_open')}
        </button>
      </div>

      {!loaded && (
        <div className="ph-wall__loading">…</div>
      )}

      {loaded && displayed.length === 0 && (
        <div className="ph-wall__empty">
          <div className="ph-wall__empty-icon" aria-hidden>✶</div>
          <div className="ph-wall__empty-text">{t('wall_empty')}</div>
        </div>
      )}

      {loaded && displayed.length > 0 && (
        <div className="ph-wall__rack">
          {displayed.map(entry => (
            <WallCard
              key={entry.story.id}
              entry={entry}
              isInAigram={isInAigram}
              onOpen={() => onOpenStory(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WallCard({
  entry, isInAigram, onOpen,
}: {
  entry: WallEntry;
  isInAigram: boolean;
  onOpen: () => void;
}) {
  const cover = getCover(entry.story.coverId);
  const ending = entry.story.ending;
  const bg = ending.illustrationUrl || cover.imageUrl;

  return (
    <div className="ph-wall-card" style={{ ['--ph-ink' as string]: cover.ink }}>
      <button
        className="ph-wall-card__cover"
        onClick={onOpen}
        aria-label={ending.title}
      >
        <div
          className="ph-wall-card__art"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className="ph-wall-card__veil" aria-hidden />
        <div className="ph-wall-card__masthead">PULP HOUR</div>
        <div className="ph-wall-card__title">{ending.title}</div>
        <div className="ph-wall-card__dek">{cover.subtitle}</div>
      </button>
      <div className="ph-wall-card__meta">
        <button
          className="ph-wall-card__author"
          onPointerDown={e => {
            e.stopPropagation();
            if (isInAigram && entry.userId !== 'self') {
              openAigramProfile(entry.userId);
            }
          }}
          disabled={!isInAigram || entry.userId === 'self'}
        >
          {entry.userAvatarUrl ? (
            <img
              className="ph-wall-card__avatar"
              src={entry.userAvatarUrl}
              alt=""
              draggable={false}
            />
          ) : (
            <span className="ph-wall-card__avatar ph-wall-card__avatar--blank" />
          )}
          <span className="ph-wall-card__name">{entry.userName || 'Anonymous'}</span>
        </button>
        <ReactionRow storyId={entry.story.id} />
      </div>
    </div>
  );
}

function ReactionRow({ storyId }: { storyId: string }) {
  const [mine, setMine] = useState<Set<Reaction>>(new Set());

  // Load own reactions from localStorage (per-story).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ph-react-${storyId}`);
      if (raw) setMine(new Set(JSON.parse(raw) as Reaction[]));
    } catch { /* ignore */ }
  }, [storyId]);

  function toggle(kind: Reaction) {
    setMine(prev => {
      const next = new Set(prev);
      if (next.has(kind)) {
        // Platform rule: reactions are increment-only. We DO allow local
        // un-glow for affordance, but we do NOT decrement the platform
        // counter. Once tapped, it stays counted server-side.
        next.delete(kind);
      } else {
        next.add(kind);
        // Persist + fire platform event (handled by parent via custom event).
        window.dispatchEvent(new CustomEvent('ph-react', { detail: { storyId, kind } }));
      }
      try { localStorage.setItem(`ph-react-${storyId}`, JSON.stringify([...next])); } catch {/* ignore */}
      return next;
    });
  }

  return (
    <div className="ph-wall-card__reactions">
      {REACTIONS.map(kind => {
        const has = mine.has(kind);
        const count = fallbackCount(storyId, kind, has);
        return (
          <button
            key={kind}
            className={`ph-react-btn ${has ? 'ph-react-btn--on' : ''}`}
            onPointerDown={() => toggle(kind)}
            aria-label={t(`reactions_${kind}` as 'reactions_riveted')}
          >
            <span className="ph-react-btn__glyph">{REACTION_GLYPH[kind]}</span>
            <span className="ph-react-btn__count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
