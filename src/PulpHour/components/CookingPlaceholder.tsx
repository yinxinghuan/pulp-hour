// "DEVELOPING…" placeholder for the per-beat splash and the ending overlay.
// Cycles 5 pulp-print themed status lines + scatters decorative bursts so
// the wait reads like a comic studio working on the panel.

import { useEffect, useState } from 'react';
import Burst from './Burst';
import { t } from '../i18n';

const COOK_KEYS = ['cook_1', 'cook_2', 'cook_3', 'cook_4', 'cook_5'] as const;
type CookKey = (typeof COOK_KEYS)[number];

interface Props {
  /** When true, show the "fresh off the press!" line instead of cycling. */
  ready?: boolean;
  /** Seed for the burst layout — pass beat index so each panel looks distinct. */
  seed?: number;
}

// Bursts at the 4 corners + 2 off-center, all kept clear of the central
// stamp. Seeded so each beat looks distinct (size / color / points vary).
function bursts(seed: number) {
  const palette = ['#ffd60a', '#e63946', '#2c6df4', '#ff6b9d'];
  // x,y are top-left percent of each burst; size offset is applied in CSS.
  const slots = [
    { x: 6,  y: 8  },   // top-left
    { x: 74, y: 12 },   // top-right
    { x: 8,  y: 70 },   // bottom-left
    { x: 76, y: 66 },   // bottom-right
    { x: 42, y: 4  },   // top-mid
    { x: 44, y: 78 },   // bottom-mid
  ];
  let s = seed * 31 + 7;
  return slots.map((slot, i) => {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    return {
      x: slot.x + (r * 6 - 3),
      y: slot.y + (r * 6 - 3),
      delay: 0.18 * i,
      size: 44 + Math.floor(r * 28),
      color: palette[(i + seed) % palette.length],
      points: 10 + ((i + seed) % 6),
    };
  });
}

export default function CookingPlaceholder({ ready = false, seed = 0 }: Props) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setIdx(n => (n + 1) % COOK_KEYS.length), 1700);
    return () => window.clearInterval(id);
  }, [ready]);

  const line = ready ? t('cook_ready') : t(COOK_KEYS[idx] as CookKey);
  const decor = bursts(seed);

  return (
    <div className="ph-cook" aria-live="polite">
      <div className="ph-cook__bursts" aria-hidden>
        {decor.map((b, i) => (
          <div
            key={i}
            className="ph-cook__burst"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <Burst fill={b.color} outer={48} inner={22} points={b.points} strokeWidth={2} />
          </div>
        ))}
      </div>
      <div className={`ph-cook__stamp ${ready ? 'ph-cook__stamp--ready' : ''}`}>
        {line}
      </div>
      <div className="ph-cook__dots" aria-hidden>
        <span /><span /><span />
      </div>
    </div>
  );
}
