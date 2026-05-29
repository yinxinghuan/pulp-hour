// Ben-Day halftone — SVG <pattern> scales cleanly at any size.

interface Props {
  color?: string;
  bg?: string;
  spacing?: number;
  radius?: number;
  opacity?: number;
  className?: string;
}

export default function Halftone({
  color = '#111',
  bg = 'transparent',
  spacing = 12,
  radius = 2,
  opacity = 1,
  className,
}: Props) {
  const id = `ph-ht-${spacing}-${radius}-${color.replace('#', '')}`;
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id={id}
          x="0"
          y="0"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          {bg !== 'transparent' && (
            <rect x="0" y="0" width={spacing} height={spacing} fill={bg} />
          )}
          <circle cx={spacing / 2} cy={spacing / 2} r={radius} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
