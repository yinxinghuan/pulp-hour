// Visible during the ~10s wait for the next beat's LLM text.
// "ON DEADLINE" yellow stamp + typewriter strip with cycling pulp-editor
// metaphors + 3 bouncing key tiles + 4 floating paper scraps.
// Sits in the article column right after the previous panels.

import { useEffect, useState } from 'react';
import { t } from '../i18n';

const WRITING_KEYS = [
  'writing_1', 'writing_2', 'writing_3', 'writing_4', 'writing_5',
] as const;

type WritingKey = (typeof WRITING_KEYS)[number];

export default function WritingPlaceholder() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setIdx(n => (n + 1) % WRITING_KEYS.length),
      1700,
    );
    return () => window.clearInterval(id);
  }, []);
  const line = t(WRITING_KEYS[idx] as WritingKey);

  return (
    <div className="ph-writing" role="status" aria-live="polite">
      <div className="ph-writing__scraps" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`ph-writing__scrap ph-writing__scrap--${i}`} />
        ))}
      </div>
      <div className="ph-writing__banner">{t('writing_banner').toUpperCase()}</div>
      <div className="ph-writing__paper">
        <span className="ph-writing__line">{line}</span>
        <span className="ph-writing__caret" aria-hidden />
      </div>
      <div className="ph-writing__keys" aria-hidden>
        <span className="ph-writing__key ph-writing__key--y">T</span>
        <span className="ph-writing__key ph-writing__key--c">Y</span>
        <span className="ph-writing__key ph-writing__key--p">P</span>
      </div>
    </div>
  );
}
