'use client';

import { Bot, Sparkles, Zap, Check } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { FILES } from '@/lib/data';
import { SUGGESTIONS, SEVERITY_ORDER } from '@/lib/suggestions';
import type { PR } from '@/lib/types';
import type { Severity } from '@/lib/types';

type Verdict = 'approved' | 'changes' | 'comments';

const VERDICT_CONFIG = {
  approved: { label: 'Approved',       accent: 'success', Icon: Check,    desc: 'No blocking issues found.' },
  changes:  { label: 'Needs changes',  accent: 'warning', Icon: Zap,      desc: 'One critical and two warnings worth addressing before merge.' },
  comments: { label: 'Comments only',  accent: 'info',    Icon: Sparkles, desc: 'Suggestions and nits — nothing blocking.' },
} as const;

interface SummaryTabProps {
  pr: PR;
  totals: Partial<Record<Severity, number>>;
  jumpToContext: (file: string, line: number) => void;
}

export function SummaryTab({ pr, totals, jumpToContext }: SummaryTabProps) {
  const verdict: Verdict = pr.reviewState === 'approved' ? 'approved' : pr.reviewState === 'changes' ? 'changes' : 'comments';
  const cfg = VERDICT_CONFIG[verdict];
  const { Icon } = cfg;

  const totalAdds = FILES.reduce((s, f) => s + f.adds, 0);
  const totalDels = FILES.reduce((s, f) => s + f.dels, 0);
  const blocking = SUGGESTIONS.filter(s => s.severity === 'critical' || s.severity === 'warning');

  return (
    <div className="summary-tab">
      <div className={`verdict-card verdict-${cfg.accent}`}>
        <div className="verdict-band" />
        <div className="verdict-icon">
          <Icon size={20} />
        </div>
        <div className="verdict-body">
          <div className="verdict-label-row">
            <h2 className="verdict-label">{cfg.label}</h2>
            <span className="badge accent"><Sparkles size={10} /> claude-3-opus</span>
            <span className="faint" style={{ marginLeft: 'auto', fontSize: 12 }}>
              finished in 47s · 12 minutes ago
            </span>
          </div>
          <p className="verdict-desc">{cfg.desc}</p>
          <div className="severity-counts" style={{ margin: 0 }}>
            {SEVERITY_ORDER.map(s => (totals[s] ?? 0) > 0 && (
              <SeverityBadge key={s} level={s} count={totals[s]} />
            ))}
            <span style={{ flex: 1 }} />
            <span className="badge mono"><Bot size={11} />{FILES.length} files</span>
            <span className="badge success mono">+{totalAdds}</span>
            <span className="badge critical mono">−{totalDels}</span>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="sc-head">
            <Bot size={15} className="muted" />
            <div className="title">Overall review</div>
          </div>
          <div className="md">
            <p>
              This PR refactors the upload-retry queue to <code>await</code> the inner flush call,
              fixing a fire-and-forget bug that swallowed transient S3 failures. The diff is
              tight and the test additions cover the happy path well.
            </p>
            <p>
              The new <code>retryUpload</code> contract is the right shape, but it needs careful
              wiring at the caller. Specifically, <code>flush()</code>&apos;s only consumer in{' '}
              <code>worker.ts</code> doesn&apos;t have a catch for the now-bubbling{' '}
              <code>UploadAbortedError</code> — which is the blocking issue for merge.
            </p>
            <p>
              The <code>inFlight</code> gauge in the queue isn&apos;t decremented in the failure
              branch, so observability for queue pressure will drift over time. Tests for the
              partial failure case exist but don&apos;t assert metric state.
            </p>
            <p>
              Backoff jitter has been pulled into a shared helper — reusable for the upcoming
              webhook retry work next sprint. Nice cleanup.
            </p>
          </div>
        </div>

        <div className="summary-card">
          <div className="sc-head">
            <Zap size={15} className="muted" />
            <div className="title">Key concerns</div>
          </div>
          <ul className="key-concerns">
            {blocking.map(s => (
              <li key={s.id}>
                <span className="kc-sev"><SeverityBadge level={s.severity} /></span>
                <div>
                  <div className="kc-title">{s.title}</div>
                  <div
                    className="kc-loc mono"
                    onClick={() => jumpToContext(s.file, s.line)}
                    style={{ cursor: 'pointer' }}
                  >
                    {s.file}:{s.line}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="divider" />

          <div className="sc-head" style={{ marginBottom: 12 }}>
            <Check size={15} className="muted" />
            <div className="title">What looks great</div>
          </div>
          <ul className="key-concerns plain">
            <li><div className="kc-title">Clean separation between transport and retry policy.</div></li>
            <li><div className="kc-title">Backoff jitter pulled into a shared helper.</div></li>
            <li><div className="kc-title">Test coverage on the happy path is thorough.</div></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
