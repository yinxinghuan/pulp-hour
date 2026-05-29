import { useEffect, useRef } from 'react';
import type { Axis, Beat, Cover } from '../types';
import { AXES } from '../types';
import { coverText } from '../utils/covers';
import { t } from '../i18n';
import CookingPlaceholder from './CookingPlaceholder';

interface Props {
  cover: Cover;
  beats: Beat[];
  index: number;
  loading: boolean;
  loadingStage: '' | 'narrating' | 'closing';
  onChoose: (axis: Axis) => void;
  onBack: () => void;
}

export default function BeatScreen({
  cover,
  beats,
  index,
  loading,
  loadingStage,
  onChoose,
  onBack,
}: Props) {
  const current = beats[beats.length - 1];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  }, [beats.length]);

  return (
    <div className="ph-beat" style={{ ['--ph-ink' as string]: cover.ink }}>
      <div className="ph-beat__bar">
        <button className="ph-link" onPointerDown={onBack} disabled={loading}>← {t('wall_title')}</button>
        <span className="ph-beat__progress">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={[
                'ph-beat__pip',
                i < index ? 'ph-beat__pip--done' : '',
                i === index - 1 ? 'ph-beat__pip--here' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </span>
        <span className="ph-beat__count">{t('beat_of', { n: index })}</span>
      </div>

      <div className="ph-beat__article" ref={scrollRef}>
        <div className="ph-beat__masthead">{coverText(cover, 'title').toUpperCase()}</div>

        {current && (
          <div className="ph-beat__splash">
            {current.illustrationUrl ? (
              <div
                className="ph-beat__splash-art"
                style={{ backgroundImage: `url(${current.illustrationUrl})` }}
              />
            ) : (
              <div className="ph-beat__splash-art ph-beat__splash-art--pending">
                <CookingPlaceholder seed={index} />
              </div>
            )}
            <span className="ph-beat__splash-no">PANEL {index}</span>
          </div>
        )}

        {current ? (
          <p className="ph-beat__narration">{current.narration}</p>
        ) : null}

        {loading && (
          <div className="ph-beat__loader">
            <span className="ph-beat__loader-dot" />
            <span className="ph-beat__loader-dot" />
            <span className="ph-beat__loader-dot" />
            <span className="ph-beat__loader-text">
              {loadingStage === 'closing'
                ? t('loading_illustrating')
                : t('loading_narrating')}
            </span>
          </div>
        )}
      </div>

      <div className="ph-beat__choices">
        {AXES.map(axis => {
          const label = current?.choices[axis];
          const axisLabel = t(`axis_${axis}` as 'axis_defy');
          return (
            <button
              key={axis}
              className={`ph-choice ph-choice--${axis}`}
              onPointerDown={() => onChoose(axis)}
              disabled={loading || !current}
            >
              <span className="ph-choice__axis">{axisLabel}</span>
              <span className="ph-choice__label">{label || '…'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
