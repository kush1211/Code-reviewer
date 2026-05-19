import { LANG_COLORS } from '@/lib/data';

export function LangDot({ lang }: { lang: string }) {
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: LANG_COLORS[lang] ?? 'var(--fg-faint)',
        flexShrink: 0,
      }}
    />
  );
}
