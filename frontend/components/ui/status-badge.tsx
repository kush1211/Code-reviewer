import type { ReactNode } from 'react';

interface Props { kind?: string; children: ReactNode; }

export function StatusBadge({ kind, children }: Props) {
  return (
    <span className={`badge ${kind ?? ''}`}>
      <span className="dot" />
      {children}
    </span>
  );
}
