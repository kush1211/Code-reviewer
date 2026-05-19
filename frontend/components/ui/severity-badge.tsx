import type { Severity } from '@/lib/types';

interface Props { level: Severity; count?: number; }

export function SeverityBadge({ level, count }: Props) {
  return (
    <span className={`sev ${level}`}>
      <span className="mark" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
      {count != null && (
        <span style={{ marginLeft: 4, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      )}
    </span>
  );
}
