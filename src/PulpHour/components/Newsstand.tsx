import { useMemo } from 'react';
import { coverText, liveCovers, upcomingCover } from '../utils/covers';
import CoverArt from './CoverArt';
import { useCountdown, type Countdown } from '../hooks/useCountdown';
import { t } from '../i18n';
import type { Cover, CoverId } from '../types';

interface Props {
  onPick: (id: CoverId) => void;
  onBack: () => void;
}

/**
 * Format a countdown as a compact `Nd HHh MMm SSs` string. When days = 0
 * we drop the days unit so the chip stays terse during the final 24h.
 */
function formatCountdown(c: Countdown): string {
  const d = t('unit_days');
  const h = t('unit_hours');
  const m = t('unit_minutes');
  const s = t('unit_seconds');
  const pad = (n: number) => String(n).padStart(2, '0');
  if (c.days > 0) {
    return `${c.days}${d} ${pad(c.hours)}${h} ${pad(c.minutes)}${m} ${pad(c.seconds)}${s}`;
  }
  return `${pad(c.hours)}${h} ${pad(c.minutes)}${m} ${pad(c.seconds)}${s}`;
}

export default function Newsstand({ onPick, onBack }: Props) {
  // Snapshot the wall-clock at render time so all the cover slices agree on
  // which side of `now` they sit. The countdown hook re-renders every second
  // — that re-render will refresh both the live list and upcoming pick.
  const now = Date.now();
  const live: Cover[] = useMemo(() => liveCovers(now), [now]);
  const upcoming = useMemo(() => upcomingCover(now), [now]);
  const target = upcoming ? Date.parse(upcoming.releasedOn) : null;
  const countdown = useCountdown(target);

  // The newest live cover gets a NEW badge. We treat the most-recent
  // releasedOn as "this issue is the current drop" — visually anchors the
  // user on what's new even if they don't read the countdown.
  const newestId = live[0]?.id;

  return (
    <div className="ph-newsstand">
      <div className="ph-newsstand__bar">
        <button className="ph-link" onPointerDown={onBack}>← {t('wall_title')}</button>
      </div>

      {countdown && upcoming && (
        <div className="ph-countdown-chip" aria-live="polite">
          <span className="ph-countdown-chip__label">{t('next_issue_in')}</span>
          <span className="ph-countdown-chip__time">{formatCountdown(countdown)}</span>
        </div>
      )}

      <div className="ph-newsstand__head">
        <div className="ph-newsstand__eyebrow">{t('newsstand_title')}</div>
        <div className="ph-newsstand__hint">{t('newsstand_subtitle')}</div>
      </div>

      <div className="ph-newsstand__rack">
        {upcoming && (
          <div
            className="ph-newsstand__slot ph-newsstand__slot--sealed"
            aria-label={t('coming_next')}
          >
            <div className="ph-sealed">
              <CoverArt cover={upcoming} size="md" printed={false} />
              <div className="ph-sealed__veil" />
              <div className="ph-sealed__stamp">
                <span className="ph-sealed__stamp-label">{t('coming_next')}</span>
                {countdown && (
                  <span className="ph-sealed__stamp-time">{formatCountdown(countdown)}</span>
                )}
              </div>
              <div className="ph-sealed__caption">{t('sealed_until_drop')}</div>
            </div>
          </div>
        )}

        {live.map(c => (
          <button
            key={c.id}
            className="ph-newsstand__slot"
            // onClick (not onPointerDown) — the rack is a scrollable list
            // and onPointerDown fires before the browser decides tap-vs-scroll,
            // so swiping over a slot enters the cover instead of scrolling.
            onClick={() => onPick(c.id)}
            aria-label={coverText(c, 'title')}
          >
            <div className="ph-newsstand__slot-cover">
              <CoverArt cover={c} size="md" />
              {c.id === newestId && (
                <span className="ph-new-dot" aria-label={t('new_issue_dot')}>
                  {t('new_issue_dot')}
                </span>
              )}
            </div>
            <div className="ph-newsstand__cta">{t('read_now')}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
