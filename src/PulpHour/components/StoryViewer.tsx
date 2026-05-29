import type { WallEntry } from '../types';
import { getCover } from '../utils/covers';
import { t } from '../i18n';

interface Props {
  entry: WallEntry;
  onClose: () => void;
}

const AXIS_GLYPH = { defy: '↺', yield: '↓', lie: '↹' } as const;

export default function StoryViewer({ entry, onClose }: Props) {
  const cover = getCover(entry.story.coverId);
  const { beats, ending, authorName } = entry.story;

  return (
    <div className="ph-viewer" role="dialog" aria-label={ending.title}>
      <div className="ph-viewer__sheet" style={{ ['--ph-ink' as string]: cover.ink }}>
        <div className="ph-viewer__bar">
          <span className="ph-viewer__masthead">PULP HOUR</span>
          <button className="ph-link" onPointerDown={onClose}>{t('story_close')} ✕</button>
        </div>
        <div className="ph-viewer__scroll">
          <div
            className="ph-viewer__hero"
            style={{ backgroundImage: `url(${ending.illustrationUrl || cover.imageUrl})` }}
          />
          <div className="ph-viewer__title">{ending.title}</div>
          <div className="ph-viewer__byline">
            {t('ending_byline')} <strong>{authorName || entry.userName || t('ending_anonymous')}</strong>
          </div>

          <div className="ph-viewer__beats">
            {beats.map((b, i) => (
              <div key={i} className="ph-viewer__beat">
                <div className="ph-viewer__beat-no">PANEL {i + 1}</div>
                <div
                  className="ph-viewer__beat-art"
                  style={{
                    backgroundImage: `url(${b.illustrationUrl || cover.imageUrl})`,
                  }}
                />
                <p className="ph-viewer__beat-text">{b.narration}</p>
                {b.chosen && (
                  <div className="ph-viewer__chose">
                    <span className="ph-viewer__chose-glyph">{AXIS_GLYPH[b.chosen]}</span>
                    {t(`axis_${b.chosen}` as 'axis_defy')} · "{b.choices[b.chosen]}"
                  </div>
                )}
              </div>
            ))}
            <div className="ph-viewer__beat">
              <div className="ph-viewer__beat-no">PANEL 6 · FINALE</div>
              <p className="ph-viewer__beat-text">{ending.narration}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
