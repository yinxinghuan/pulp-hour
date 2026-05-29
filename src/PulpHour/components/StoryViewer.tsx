import { useMemo } from 'react';
import type { WallEntry } from '../types';
import { getCover } from '../utils/covers';
import { t, locale } from '../i18n';
import { useTranslateStory, storySourceLocale } from '../hooks/useTranslateStory';

interface Props {
  entry: WallEntry;
  onClose: () => void;
}

const AXIS_GLYPH = { defy: '↺', yield: '↓', lie: '↹' } as const;

export default function StoryViewer({ entry, onClose }: Props) {
  const cover = getCover(entry.story.coverId);
  const { beats, ending, authorName } = entry.story;

  const viewerLocale = locale();
  const sourceLocale = useMemo(() => storySourceLocale(entry.story), [entry.story]);
  const canTranslate = sourceLocale !== viewerLocale;

  const { translated, loading, translate, showOriginal } =
    useTranslateStory(entry.story, viewerLocale);

  // Use translated data when available, otherwise the saved original.
  const showBeats = translated ? translated.beats : beats;
  const showEnding = translated ? translated.ending : ending;

  const targetLangName = t(`lang_name_${viewerLocale}` as 'lang_name_en');

  return (
    <div className="ph-viewer" role="dialog" aria-label={ending.title}>
      <div className="ph-viewer__sheet" style={{ ['--ph-ink' as string]: cover.ink }}>
        <div className="ph-viewer__bar">
          <span className="ph-viewer__masthead">PULP HOUR</span>
          <button className="ph-link" onPointerDown={onClose}>{t('story_close')} ✕</button>
        </div>

        {canTranslate && (
          <div className="ph-viewer__trbar">
            {translated ? (
              <button
                className="ph-viewer__trbtn ph-viewer__trbtn--orig"
                onPointerDown={showOriginal}
                disabled={loading}
              >
                {t('show_original')}
              </button>
            ) : (
              <button
                className="ph-viewer__trbtn"
                onPointerDown={translate}
                disabled={loading}
              >
                {loading
                  ? t('translating')
                  : t('translate_to', { lang: targetLangName })}
              </button>
            )}
          </div>
        )}

        <div className="ph-viewer__scroll">
          <div
            className="ph-viewer__hero"
            style={{ backgroundImage: `url(${ending.illustrationUrl || cover.imageUrl})` }}
          />
          <div className="ph-viewer__title">{showEnding.title}</div>
          <div className="ph-viewer__byline">
            {t('ending_byline')} <strong>{authorName || entry.userName || t('ending_anonymous')}</strong>
          </div>

          <div className="ph-viewer__beats">
            {beats.map((b, i) => (
              <div key={i} className="ph-viewer__beat">
                <div className="ph-viewer__beat-no">PANEL {i + 1}</div>
                <div
                  className="ph-viewer__beat-art"
                  style={{ backgroundImage: `url(${b.illustrationUrl || cover.imageUrl})` }}
                />
                <p className="ph-viewer__beat-text">{showBeats[i]?.narration ?? b.narration}</p>
                {b.chosen && (
                  <div className="ph-viewer__chose">
                    <span className="ph-viewer__chose-glyph">{AXIS_GLYPH[b.chosen]}</span>
                    {t(`axis_${b.chosen}` as 'axis_defy')} · "{showBeats[i]?.choices?.[b.chosen] ?? b.choices[b.chosen]}"
                  </div>
                )}
              </div>
            ))}
            <div className="ph-viewer__beat">
              <div className="ph-viewer__beat-no">PANEL 6 · FINALE</div>
              <div
                className="ph-viewer__beat-art"
                style={{
                  backgroundImage: `url(${ending.illustrationUrl || cover.imageUrl})`,
                }}
              />
              <p className="ph-viewer__beat-text">{showEnding.narration}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
