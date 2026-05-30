import { COVERS, coverText } from '../utils/covers';
import CoverArt from './CoverArt';
import { t } from '../i18n';
import type { CoverId } from '../types';

interface Props {
  onPick: (id: CoverId) => void;
  onBack: () => void;
}

export default function Newsstand({ onPick, onBack }: Props) {
  return (
    <div className="ph-newsstand">
      <div className="ph-newsstand__bar">
        <button className="ph-link" onPointerDown={onBack}>← {t('wall_title')}</button>
      </div>
      <div className="ph-newsstand__head">
        <div className="ph-newsstand__eyebrow">{t('newsstand_title')}</div>
        <div className="ph-newsstand__hint">{t('newsstand_subtitle')}</div>
      </div>
      <div className="ph-newsstand__rack">
        {COVERS.map(c => (
          <button
            key={c.id}
            className="ph-newsstand__slot"
            // onClick (not onPointerDown) — the rack is a scrollable list
            // and onPointerDown fires before the browser decides tap-vs-scroll,
            // so swiping over a slot enters the cover instead of scrolling.
            // See feedback_onclick_for_scrollable_lists.md.
            onClick={() => onPick(c.id)}
            aria-label={coverText(c, 'title')}
          >
            <CoverArt cover={c} size="md" />
            <div className="ph-newsstand__cta">{t('read_now')}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
