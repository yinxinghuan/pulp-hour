import { useEffect, useMemo, useState } from 'react';
import type { Reaction, Story, WallEntry } from '../types';
import { REACTIONS } from '../types';
import { getCover, COVERS, coverText } from '../utils/covers';
import { storyHeroArt } from '../utils/storyArt';
import { locale } from '../i18n';
import { storySourceLocale } from '../hooks/useTranslateStory';
import { useTranslateTitle } from '../hooks/useTranslateTitle';
import { REACTION_GLYPH, fallbackCount } from '../utils/reactions';
import { openAigramProfile } from '@shared/runtime/bridge';
import { t } from '../i18n';
import Burst from './Burst';

interface Props {
  entries: WallEntry[];
  loaded: boolean;
  isInAigram: boolean;
  myStories: Story[];
  /** false while the cloud save is still resolving — hide the write
   *  CTA so a swipe/tap can't slip past a stale unlocked state. */
  saveLoaded: boolean;
  lockedToday: boolean;
  streakDays: number;
  onPickNewIssue: () => void;
  onOpenStory: (entry: WallEntry) => void;
}

const INTRO_HIDDEN_KEY = 'pulp-hour-intro-hidden';

export default function Wall({
  entries, loaded, isInAigram, myStories,
  saveLoaded, lockedToday, streakDays,
  onPickNewIssue, onOpenStory,
}: Props) {
  // Intro collapse state — sticky in localStorage.
  const [introHidden, setIntroHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(INTRO_HIDDEN_KEY) === '1'; } catch { return false; }
  });
  function toggleIntro() {
    const next = !introHidden;
    setIntroHidden(next);
    try { localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  }

  // Optimistic merge: cloud write is debounced (~1s) + RTT, so a
  // just-published story isn't in `entries` for a few seconds. Always
  // merge myStories into the wall so the user sees their own publish
  // immediately. After cloud sync, the dup is removed by story.id.
  const displayed = useMemo<WallEntry[]>(() => {
    const cloudIds = new Set(entries.map(e => e.story.id));
    const selfEntries: WallEntry[] = myStories
      .filter(s => !cloudIds.has(s.id))
      .map(s => ({
        userId: 'self',
        userName: t('wall_self'),
        story: s,
      }));
    return [...selfEntries, ...entries]
      .sort((a, b) => (b.story.createdAt ?? 0) - (a.story.createdAt ?? 0))
      .slice(0, 24);
  }, [entries, myStories]);

  return (
    <div className="ph-wall">
      <Hero streakDays={streakDays} />

      {introHidden ? (
        <div className="ph-wall__intro-toggle">
          <button className="ph-link" onPointerDown={toggleIntro}>
            ▾ {t('how_show')}
          </button>
        </div>
      ) : (
        <HowItWorks onHide={toggleIntro} />
      )}

      <div className="ph-wall__cta-bar">
        {!saveLoaded ? (
          <div className="ph-cta-loading" aria-hidden />
        ) : lockedToday ? (
          <LockedCta />
        ) : (
          <button className="ph-cta-burst ph-cta-burst--write" onPointerDown={onPickNewIssue}>
            <Burst fill="#e63946" outer={49} inner={32} points={20}>
              <span className="ph-cta-burst__label">{t('wall_open')}</span>
            </Burst>
          </button>
        )}
        <button
          className="ph-cta-burst ph-cta-burst--browse"
          onPointerDown={() => {
            const el = document.querySelector('.ph-wall__rack')
              ?? document.querySelector('.ph-wall__head');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <Burst fill="#2c6df4" outer={48} inner={40} points={28} strokeWidth={2}>
            <span className="ph-cta-burst__label">{t('wall_browse')}</span>
          </Burst>
        </button>
      </div>

      <div className="ph-wall__head">
        <div className="ph-wall__title">{t('wall_title')}</div>
        <div className="ph-wall__subtitle">{t('wall_subtitle')}</div>
      </div>

      {!loaded && <div className="ph-wall__loading">…</div>}

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

      <PrintFooter />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function Hero({ streakDays }: { streakDays: number }) {
  return (
    <div className="ph-hero">
      <div className="ph-hero__masthead">PULP HOUR</div>
      <div className="ph-hero__tagline">{t('hero_tagline')}</div>
      <div className="ph-hero__subline">{t('hero_subline')}</div>
      {streakDays >= 2 && (
        <div className="ph-hero__streak">
          <Burst fill="#ffd60a" outer={46} inner={34} points={14}>
            <span className="ph-hero__streak-label">
              {streakDays} DAYS<br/>RUNNING
            </span>
          </Burst>
        </div>
      )}
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────

function HowItWorks({ onHide }: { onHide: () => void }) {
  const operatorCover = COVERS[0];
  return (
    <div className="ph-how">
      <div className="ph-how__head">
        <span className="ph-how__title">{t('how_title')}</span>
        <button className="ph-link ph-how__hide" onPointerDown={onHide}>
          ✕ {t('how_hide')}
        </button>
      </div>
      <div className="ph-how__panels">
        <HowPanel
          n="1"
          label={t('how_step1_label')}
          body={t('how_step1_body')}
          accent="#2c6df4"
        >
          <div
            className="ph-how__panel-art"
            style={{ backgroundImage: `url(${operatorCover.imageUrl})` }}
          />
        </HowPanel>
        <HowPanel
          n="2"
          label={t('how_step2_label')}
          body={t('how_step2_body')}
          accent="#ffd60a"
        >
          <div className="ph-how__axes">
            <span className="ph-how__axis ph-how__axis--defy">D</span>
            <span className="ph-how__axis ph-how__axis--yield">Y</span>
            <span className="ph-how__axis ph-how__axis--lie">L</span>
          </div>
        </HowPanel>
        <HowPanel
          n="3"
          label={t('how_step3_label')}
          body={t('how_step3_body')}
          accent="#e63946"
        >
          <div className="ph-how__panel-icon">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <rect x="6" y="6" width="28" height="28" fill="#fbf4dd" stroke="#111" strokeWidth="3" />
              <rect x="3" y="3" width="28" height="28" fill="none" stroke="#111" strokeWidth="3" />
              <text x="20" y="26" fontFamily="Bangers" fontSize="14" textAnchor="middle" fill="#111">FIN</text>
            </svg>
          </div>
        </HowPanel>
      </div>
    </div>
  );
}

function HowPanel({
  n, label, body, accent, children,
}: {
  n: string; label: string; body: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="ph-how__panel">
      <span className="ph-how__panel-num" style={{ background: accent }}>{n}</span>
      <div className="ph-how__panel-art-frame">{children}</div>
      <div className="ph-how__panel-label">{label}</div>
      <div className="ph-how__panel-body">{body}</div>
    </div>
  );
}

// ─── Locked CTA ───────────────────────────────────────────────────────

function LockedCta() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const remainMs = Math.max(0, tomorrow.getTime() - now);
  const hours = Math.floor(remainMs / 3_600_000);
  const minutes = Math.floor((remainMs % 3_600_000) / 60_000);

  return (
    <div className="ph-locked">
      <div className="ph-locked__stamp">FILED TODAY</div>
      <div className="ph-locked__body">
        Come back in <strong>{hours}h {minutes}m</strong>.<br/>
        Until then — read what the others filed.
      </div>
    </div>
  );
}

// ─── Wall card ────────────────────────────────────────────────────────

function WallCard({
  entry, isInAigram, onOpen,
}: {
  entry: WallEntry;
  isInAigram: boolean;
  onOpen: () => void;
}) {
  const cover = getCover(entry.story.coverId);
  const ending = entry.story.ending;
  // ending illustration is the most fragile — fall back to the latest
  // beat that succeeded before going all the way to the static cover.
  const bg = storyHeroArt(entry.story, cover);

  // Auto-translate the title if the author's locale ≠ the viewer's.
  // Tiny one-line LLM payload, cached per (storyId, targetLocale).
  const viewerLocale = locale();
  const sourceLocale = storySourceLocale(entry.story);
  const displayTitle = useTranslateTitle(
    entry.story.id,
    ending.title,
    viewerLocale,
    sourceLocale !== viewerLocale,
  );

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
        <div className="ph-wall-card__title">{displayTitle}</div>
        <div className="ph-wall-card__dek">{coverText(cover, 'subtitle')}</div>
      </button>
      <div className="ph-wall-card__meta">
        <button
          className="ph-wall-card__author"
          // onClick (not onPointerDown) — author sits inside a scrollable
          // wall card grid; pointerdown fires immediately on touch start
          // so swiping over the author chip would open the Aigram profile
          // mid-scroll. See feedback_onclick_for_scrollable_lists.md.
          onClick={e => {
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
        next.delete(kind);
      } else {
        next.add(kind);
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
            className={`ph-react-btn ph-react-btn--${kind} ${has ? 'ph-react-btn--on' : ''}`}
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

// ─── Print footer (the user's bigger / colored Ben-Day band) ─────────

function PrintFooter() {
  return (
    <div className="ph-printfoot" aria-hidden>
      <svg className="ph-printfoot__band" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <pattern id="ph-pf-y" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="4.5" fill="#ffd60a" />
          </pattern>
          <pattern id="ph-pf-r" x="3" y="3" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="4" fill="#e63946" />
          </pattern>
          <pattern id="ph-pf-b" x="9" y="6" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="3.6" fill="#2c6df4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ph-pf-y)" />
        <rect width="100%" height="100%" fill="url(#ph-pf-r)" />
        <rect width="100%" height="100%" fill="url(#ph-pf-b)" />
      </svg>
      <div className="ph-printfoot__stamp">{t('footer_fin')}</div>
    </div>
  );
}
