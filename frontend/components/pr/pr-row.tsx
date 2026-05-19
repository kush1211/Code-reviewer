'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GitPullRequest, GitMerge, XCircle, Bot, GitBranch, Clock, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import type { PR } from '@/lib/types';

export function PRRow({ pr, repoId }: { pr: PR; repoId: string }) {
  const router = useRouter();
  const navigate = () => router.push(`/repos/${repoId}/pr/${pr.id}`);

  const stateIcon = {
    open:   { Icon: GitPullRequest, cls: '' },
    draft:  { Icon: GitPullRequest, cls: 'draft' },
    merged: { Icon: GitMerge,       cls: 'merged' },
    closed: { Icon: XCircle,        cls: 'closed' },
  }[pr.state];

  const reviewBadgeMap: Record<string, React.ReactNode> = {
    reviewed:  <StatusBadge kind="success">Reviewed</StatusBadge>,
    reviewing: <StatusBadge kind="info">Reviewing</StatusBadge>,
    failed:    <StatusBadge kind="critical">Failed</StatusBadge>,
  };
  const reviewBadge = reviewBadgeMap[pr.reviewStatus] ?? <StatusBadge>Pending</StatusBadge>;

  const initials = pr.authorName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const isBot = pr.author === 'depbot';

  return (
    <div className="pr-row-v2" onClick={navigate}>
      <span className={`pr-icon ${stateIcon.cls}`}>
        <stateIcon.Icon size={16} />
      </span>

      <div className="pr-main">
        <div className="pr-title-line">
          <span className="pr-num mono">#{pr.id}</span>
          <span className="pr-title-text">{pr.title}</span>
          {pr.state === 'draft' && <span className="badge">Draft</span>}
        </div>

        <div className="pr-summary">
          <Bot size={11} className="bot-glyph" />
          {pr.summary}
        </div>

        <div className="pr-meta">
          <span className="meta-chip">
            <span
              className={`avatar xs ${isBot ? 'bot-avatar' : ''}`}
              style={{ width: 18, height: 18, fontSize: 9, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            >
              {isBot ? <Bot size={10} /> : initials}
            </span>
            {pr.authorName}
          </span>
          <span className="meta-chip mono">
            <GitBranch size={11} />
            {pr.branch}
            <ArrowRight size={9} style={{ opacity: 0.5 }} />
            {pr.base}
          </span>
          <span className="meta-chip"><Clock size={11} />{pr.opened}</span>
          {pr.additions > 0 && (
            <span className="meta-chip mono">
              <span style={{ color: 'var(--success)' }}>+{pr.additions}</span>
              <span style={{ color: 'var(--critical)' }}>−{pr.deletions}</span>
            </span>
          )}
        </div>
      </div>

      <div className="pr-right" onClick={e => e.stopPropagation()}>
        {reviewBadge}
        <div className="pr-sev-row">
          {pr.sevCounts.critical > 0 && <SeverityBadge level="critical" count={pr.sevCounts.critical} />}
          {pr.sevCounts.warning  > 0 && <SeverityBadge level="warning"  count={pr.sevCounts.warning} />}
          {pr.sevCounts.critical === 0 && pr.sevCounts.warning === 0 && pr.sevCounts.suggestion > 0 &&
            <SeverityBadge level="suggestion" count={pr.sevCounts.suggestion} />}
          {pr.sevCounts.critical === 0 && pr.sevCounts.warning === 0 && pr.sevCounts.suggestion === 0 && pr.reviewStatus === 'reviewed' &&
            <span className="badge success" style={{ fontSize: 11 }}><span className="dot" /> Clean</span>}
        </div>
        <button className="pr-view" onClick={e => { e.stopPropagation(); navigate(); }}>
          View review <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
