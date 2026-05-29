// Diagonal speedlines — purely decorative comic-book speed marks.
// Generated once with deterministic positions so it doesn't flicker.

interface Props {
  color?: string;
  count?: number;
  opacity?: number;
  className?: string;
}

function lines(count: number, seed: number) {
  const result: Array<{ y: number; x1: number; x2: number; w: number }> = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    result.push({
      y: (i / count) * 100 + r * 4,
      x1: r * 30,
      x2: 60 + r * 40,
      w: 1.5 + (i % 3) * 0.8,
    });
  }
  return result;
}

export default function Speedlines({
  color = '#111',
  count = 18,
  opacity = 0.4,
  className,
}: Props) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {lines(count, 7).map((ln, i) => (
        <line
          key={i}
          x1={ln.x1}
          y1={ln.y}
          x2={ln.x2}
          y2={ln.y + 2}
          stroke={color}
          strokeWidth={ln.w}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}
