import { useEffect, useRef, useState } from 'react';
import type { Cover, Ending, Story } from '../types';
import { t } from '../i18n';
import CookingPlaceholder from './CookingPlaceholder';
import { storyHeroArt } from '../utils/storyArt';

interface Props {
  cover: Cover;
  ending: Ending;
  story: Story;
  loading: boolean;
  loadingStage: '' | 'narrating' | 'closing';
  authorName?: string;
  authorAvatarUrl?: string;
  onShare: () => void;
  onBack: () => void;
  onRetryEnding?: () => void;
}

export default function EndingScreen({
  cover, ending, story, loading, loadingStage,
  authorName, authorAvatarUrl, onShare, onBack, onRetryEnding,
}: Props) {
  const [stamped, setStamped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    const id = window.setTimeout(() => setStamped(true), 400);
    return () => window.clearTimeout(id);
  }, [loading]);

  return (
    <div className="ph-ending" style={{ ['--ph-ink' as string]: cover.ink }}>
      <div className="ph-ending__poster" ref={ref}>
        <div className="ph-ending__masthead">
          <span>PULP HOUR</span>
          <span>VOL · I</span>
        </div>
        <div className="ph-ending__art-wrap">
          <div
            className="ph-ending__art"
            style={{
              backgroundImage: `url(${storyHeroArt(story, cover)})`,
            }}
          />
          <div className="ph-ending__art-tint" aria-hidden />
          {!loading && !ending.illustrationUrl && onRetryEnding && (
            <button
              type="button"
              className="ph-bp__failstamp ph-bp__failstamp--btn"
              onPointerDown={onRetryEnding}
              aria-label={t('cook_retry')}
            >
              <span className="ph-bp__failstamp-line">{t('cook_failed').toUpperCase()}</span>
              <span className="ph-bp__failstamp-sub">{t('cook_retry')}</span>
            </button>
          )}
        </div>
        <div className="ph-ending__title">{ending.title}</div>
        <p className="ph-ending__narration">{ending.narration}</p>
        <div className="ph-ending__byline">
          {authorAvatarUrl ? (
            <img
              className="ph-ending__avatar"
              src={authorAvatarUrl}
              alt=""
              draggable={false}
            />
          ) : null}
          <span className="ph-ending__byline-text">
            {t('ending_byline')} <strong>{authorName || t('ending_anonymous')}</strong>
          </span>
        </div>
        {loading && (
          <div className="ph-ending__overlay">
            {loadingStage === 'closing' ? (
              <CookingPlaceholder seed={6} />
            ) : (
              <>
                <div className="ph-ending__overlay-spinner" />
                <div className="ph-ending__overlay-text">
                  {t('loading_narrating')}
                </div>
              </>
            )}
          </div>
        )}
        {!loading && stamped && (
          <div
            className={`ph-ending__stamp ph-ending__stamp--${ending.outcome === 'failure' ? 'failure' : 'success'}`}
            aria-hidden
          >
            {ending.outcome === 'failure' ? t('ending_case_lost') : t('ending_case_closed')}
          </div>
        )}
      </div>

      <div className="ph-ending__actions">
        <button
          className="ph-btn ph-btn--ink"
          onPointerDown={onShare}
          disabled={loading}
        >
          {t('ending_share')}
        </button>
        <button
          className="ph-btn ph-btn--ghost"
          onPointerDown={onBack}
          disabled={loading}
        >
          {t('ending_back')}
        </button>
      </div>
    </div>
  );
}
