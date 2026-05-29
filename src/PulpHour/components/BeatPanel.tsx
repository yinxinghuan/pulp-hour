// A single comic panel in the stacked beat reader.
//   - Splash (real image / cover fallback if failed / CookingPlaceholder if pending)
//   - "MEANWHILE…" caption with narration
//   - For past beats: a small read-only chip showing the axis they chose
//
// Choice buttons live in the sticky bottom bar in BeatScreen, NOT here.

import type { Beat, Cover } from '../types';
import { t } from '../i18n';
import CookingPlaceholder from './CookingPlaceholder';

interface Props {
  beat: Beat;
  cover: Cover;
  index: number;          // 1-based panel number
  isPast: boolean;        // already chosen, read-only
  onRetry?: () => void;   // re-kick gen-image for this panel
  onLoadFail?: () => void; // <img> failed to load the returned URL
}

const AXIS_GLYPH = { defy: '↺', yield: '↓', lie: '↹' } as const;

export default function BeatPanel({
  beat, cover, index, isPast, onRetry, onLoadFail,
}: Props) {
  const showImage = !!beat.illustrationUrl;
  const showFallback = !showImage && beat.illustrationFailed;
  const showCooking = !showImage && !beat.illustrationFailed;

  // Fallback art = the cached cover.
  const fallbackArt = cover.imageUrl;

  return (
    <div className={`ph-bp ${isPast ? 'ph-bp--past' : 'ph-bp--current'}`}>
      <div className="ph-bp__splash">
        {showImage && (
          // Real <img> instead of CSS background so we can catch load
          // failures (broken URL, expired CDN link, network blip) and
          // bubble them up to flip into the failed state — otherwise the
          // panel just sat blank with no retry affordance.
          <img
            key={beat.illustrationUrl}
            className="ph-bp__art"
            src={beat.illustrationUrl}
            alt=""
            draggable={false}
            onError={onLoadFail}
          />
        )}
        {showFallback && (
          <>
            <img
              className="ph-bp__art ph-bp__art--fallback"
              src={fallbackArt}
              alt=""
              draggable={false}
            />
            {onRetry ? (
              <button
                type="button"
                className="ph-bp__failstamp ph-bp__failstamp--btn"
                onPointerDown={onRetry}
                aria-label={t('cook_retry')}
              >
                <span className="ph-bp__failstamp-line">{t('cook_failed').toUpperCase()}</span>
                <span className="ph-bp__failstamp-sub">{t('cook_retry')}</span>
              </button>
            ) : (
              <div className="ph-bp__failstamp" aria-label="illustration failed">
                {t('cook_failed').toUpperCase()}
              </div>
            )}
          </>
        )}
        {showCooking && (
          <div className="ph-bp__art ph-bp__art--pending">
            <CookingPlaceholder seed={index} />
          </div>
        )}
        <span className="ph-bp__no">PANEL {index}</span>
      </div>

      <p className="ph-bp__narration">{beat.narration}</p>

      {isPast && beat.chosen && (
        <div className={`ph-bp__chose ph-bp__chose--${beat.chosen}`}>
          <span className="ph-bp__chose-glyph">{AXIS_GLYPH[beat.chosen]}</span>
          <span className="ph-bp__chose-text">
            {t('chose_label')} <strong>{t(`axis_${beat.chosen}` as 'axis_defy')}</strong>
            {' · '}<em>{beat.choices[beat.chosen]}</em>
          </span>
        </div>
      )}
    </div>
  );
}
