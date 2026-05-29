import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

/** Cream paper frame with halftone-dot edges. Every screen lives inside one. */
export default function PaperFrame({ children, className }: Props) {
  return (
    <div className={['ph-paper', className].filter(Boolean).join(' ')}>
      <div className="ph-paper__grain" aria-hidden />
      <div className="ph-paper__edge ph-paper__edge--top" aria-hidden />
      <div className="ph-paper__edge ph-paper__edge--bot" aria-hidden />
      <div className="ph-paper__inner">{children}</div>
    </div>
  );
}
