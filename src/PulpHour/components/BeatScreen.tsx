import { useEffect, useRef } from 'react';
import type { Axis, Beat, Cover } from '../types';
import { AXES } from '../types';
import { t } from '../i18n';
import BeatPanel from './BeatPanel';
import WritingPlaceholder from './WritingPlaceholder';

interface Props {
  cover: Cover;
  beats: Beat[];
  index: number;        // current beat # (1..5)
  loading: boolean;
  loadingStage: '' | 'narrating' | 'closing';
  onChoose: (axis: Axis) => void;
  onBack: () => void;
  onRetryPanel: (beatIdx: number) => void;
  onLoadFailPanel: (beatIdx: number) => void;
}

export default function BeatScreen({
  cover, beats, index, loading, onChoose, onBack, onRetryPanel, onLoadFailPanel,
}: Props) {
  const current = beats[beats.length - 1];
  const articleRef = useRef<HTMLDivElement>(null);
  const lastBeatCount = useRef(0);

  // Scroll the latest panel into view when a new beat arrives — but only
  // for new beats, so the player can scroll up freely without being yanked
  // back down on every state tick (image arrival, etc).
  useEffect(() => {
    if (!articleRef.current) return;
    if (beats.length > lastBeatCount.current) {
      lastBeatCount.current = beats.length;
      // tiny delay so layout settles
      const id = window.setTimeout(() => {
        const panels = articleRef.current?.querySelectorAll('.ph-bp');
        const last = panels?.[panels.length - 1] as HTMLElement | undefined;
        last?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return () => window.clearTimeout(id);
    }
    return;
  }, [beats.length]);

  return (
    <div className="ph-beat" style={{ ['--ph-ink' as string]: cover.ink }}>
      <div className="ph-beat__bar">
        <button className="ph-link" onPointerDown={onBack} disabled={loading}>
          ← {t('wall_title')}
        </button>
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

      <div className="ph-beat__article" ref={articleRef}>
        {beats.map((b, i) => (
          <BeatPanel
            key={i}
            beat={b}
            cover={cover}
            index={i + 1}
            isPast={i < beats.length - 1}
            onRetry={b.illustrationFailed ? () => onRetryPanel(i) : undefined}
            onLoadFail={() => onLoadFailPanel(i)}
          />
        ))}
        {loading && <WritingPlaceholder />}
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
