'use client';

import { Check, X, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { SUGGESTIONS, SEVERITY_ORDER, SEVERITY_LABEL } from '@/lib/suggestions';

interface SuggestionsTabProps {
  jumpToContext: (file: string, line: number) => void;
}

export function SuggestionsTab({ jumpToContext }: SuggestionsTabProps) {
  const grouped = SEVERITY_ORDER
    .map(sev => ({ sev, items: SUGGESTIONS.filter(s => s.severity === sev) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="suggestions-tab">
      {grouped.map(group => (
        <section key={group.sev} className={`sev-group sev-group-${group.sev}`}>
          <header className="sev-group-head">
            <h3 className="sev-group-title">
              <span className={`sev-dot sev-dot-${group.sev}`} />
              {SEVERITY_LABEL[group.sev]}
              <span className="faint" style={{ fontSize: 13, fontWeight: 400 }}>
                · {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </span>
            </h3>
          </header>

          <div className="sev-group-list">
            {group.items.map(s => (
              <article key={s.id} className="sugg-item">
                <div className="sugg-head">
                  <SeverityBadge level={s.severity} />
                  <span
                    className="sugg-loc mono"
                    onClick={() => jumpToContext(s.file, s.line)}
                    style={{ cursor: 'pointer' }}
                  >
                    {s.file}<span className="faint">:</span>
                    <span style={{ color: 'var(--fg-muted)' }}>{s.line}</span>
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="faint mono" style={{ fontSize: 11 }}>conf {s.confidence.toFixed(2)}</span>
                </div>
                <h4 className="sugg-title">{s.title}</h4>
                <div className="sugg-body">{s.body}</div>
                {s.suggestion && (
                  <pre className="suggestion-code sugg-inline"><code>{s.suggestion}</code></pre>
                )}
                <div className="sugg-actions">
                  <button className="sugg-jump" onClick={() => jumpToContext(s.file, s.line)}>
                    Jump to context
                    <ArrowRight size={11} />
                  </button>
                  <span style={{ flex: 1 }} />
                  <button className="btn sm ghost"><Check size={11} /> Resolve</button>
                  <button className="btn sm ghost"><X size={11} /> Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
