// Jagged starburst polygon (parametric) used as comic-book panel
// background for shouts, stamps, and choice buttons.

import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface Props {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number;
  outer?: number;
  inner?: number;
  children?: ReactNode;
  className?: string;
}

function makePoints(n: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const isOuter = i % 2 === 0;
    const angle = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const base = isOuter ? outer : inner;
    const jitter = isOuter ? base * (0.93 + ((i * 17) % 12) / 100) : base;
    const x = 50 + Math.cos(angle) * jitter;
    const y = 50 + Math.sin(angle) * jitter;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

export default function Burst({
  fill = '#ffd60a',
  stroke = '#111',
  strokeWidth = 2.5,
  points = 16,
  outer = 48,
  inner = 32,
  children,
  className,
}: Props) {
  const path = useMemo(
    () => makePoints(points, outer, inner),
    [points, outer, inner],
  );
  return (
    <div className={['ph-burst', className].filter(Boolean).join(' ')}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          points={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
      <div className="ph-burst__inner">{children}</div>
    </div>
  );
}
