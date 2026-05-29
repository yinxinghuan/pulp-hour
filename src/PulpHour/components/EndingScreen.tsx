import { useEffect, useRef, useState } from 'react';
import type { Cover, Ending, Story } from '../types';
import { t } from '../i18n';

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
}

export default function EndingScreen({
  cover, ending, loading, loadingStage, authorName, authorAvatarUrl, onShare, onBack,
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
              backgroundImage: `url(${ending.illustrationUrl || cover.imageUrl})`,
            }}
          />
          <div className="ph-ending__art-tint" aria-hidden />
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
            <div className="ph-ending__overlay-spinner" />
            <div className="ph-ending__overlay-text">
              {loadingStage === 'closing'
                ? t('loading_illustrating')
                : t('loading_narrating')}
            </div>
          </div>
        )}
        {!loading && stamped && (
          <div className="ph-ending__stamp" aria-hidden>FILED</div>
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
