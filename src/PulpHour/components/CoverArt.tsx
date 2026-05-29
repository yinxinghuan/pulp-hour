import type { Cover } from '../types';

interface Props {
  cover: Cover;
  size?: 'sm' | 'md' | 'lg';
  /** When true, overlays the printed magazine title + dek + hook over the artwork. */
  printed?: boolean;
}

/** The pulp magazine cover — illustration + headline strip + dek. */
export default function CoverArt({ cover, size = 'md', printed = true }: Props) {
  return (
    <div className={`ph-cover ph-cover--${size}`} style={{ ['--ph-ink' as string]: cover.ink }}>
      <div
        className="ph-cover__art"
        style={{ backgroundImage: `url(${cover.imageUrl})` }}
      />
      <div className="ph-cover__veil" aria-hidden />
      {printed && (
        <>
          <div className="ph-cover__masthead">
            <span className="ph-cover__masthead-text">PULP HOUR</span>
            <span className="ph-cover__masthead-issue">VOL · I</span>
          </div>
          <div className="ph-cover__title">{cover.title}</div>
          <div className="ph-cover__dek">{cover.subtitle}</div>
          <div className="ph-cover__hook">{cover.hook}</div>
        </>
      )}
    </div>
  );
}
