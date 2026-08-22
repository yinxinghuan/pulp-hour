import type { Axis, Reaction } from '../types';

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

export function BackIcon() {
  return <svg aria-hidden viewBox="0 0 20 20" width="18" height="18"><path d="M12.5 4L6.5 10l6 6" {...common} /></svg>;
}

export function CloseIcon() {
  return <svg aria-hidden viewBox="0 0 20 20" width="16" height="16"><path d="M4 4l12 12M16 4L4 16" {...common} /></svg>;
}

export function EmptyBurstIcon() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" width="48" height="48">
      <path d="M24 3l3.8 13.2L40 8l-8.2 12.2L45 24l-13.2 3.8L40 40l-12.2-8.2L24 45l-3.8-13.2L8 40l8.2-12.2L3 24l13.2-3.8L8 8l12.2 8.2L24 3z" fill="currentColor" />
      <circle cx="24" cy="24" r="5" fill="#fbf4dd" />
    </svg>
  );
}

export function AxisIcon({ axis }: { axis: Axis }) {
  if (axis === 'defy') return <svg aria-hidden viewBox="0 0 24 24"><path d="M19 7H9l4-4M9 7l4 4M8 17h8" {...common} /></svg>;
  if (axis === 'yield') return <svg aria-hidden viewBox="0 0 24 24"><path d="M12 3v15M6 12l6 6 6-6" {...common} /></svg>;
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 6h5l4 6h5M5 18h5l4-6M16 9l3 3-3 3" {...common} /></svg>;
}

export function ReactionIcon({ kind }: { kind: Reaction }) {
  if (kind === 'riveted') return <svg aria-hidden viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.7 6.2.8-4.6 4.4 1.2 6.2-5.5-3-5.5 3 1.2-6.2-4.6-4.4 6.2-.8L12 2.8z" fill="currentColor" /></svg>;
  if (kind === 'spooked') return <svg aria-hidden viewBox="0 0 24 24"><path d="M12 2l2.1 6.1L20 5l-3.1 5.9L23 13l-6.4 1.2L19 20l-5.3-3.8L12 22l-1.7-5.8L5 20l2.4-5.8L1 13l6.1-2.1L4 5l5.9 3.1L12 2z" fill="currentColor" /></svg>;
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M12 2l2.2 4.1 4.6-.6-.4 4.7L22 13l-3.6 2.8.4 4.7-4.6-.6L12 24l-2.2-4.1-4.6.6.4-4.7L2 13l3.6-2.8-.4-4.7 4.6.6L12 2z" fill="currentColor" /></svg>;
}
