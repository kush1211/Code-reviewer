'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Bot, File, Sparkles, GitPullRequest, GitMerge, RefreshCw, ExternalLink, ArrowRight } from 'lucide-react';
import { REPOS, PR_LIST, FILES } from '@/lib/data';
import { SUGGESTIONS } from '@/lib/suggestions';
import { StatusBadge } from '@/components/ui/status-badge';
import { SummaryTab } from '@/components/pr/summary-tab';
import { FilesTab } from '@/components/pr/files-tab';
import { SuggestionsTab } from '@/components/pr/suggestions-tab';
import type { Severity } from '@/lib/types';

type Tab = 'summary' | 'files' | 'suggestions';
interface JumpTarget { file: string; line: number; key: number }

export default function PRDetailPage() {
  const { repoId, prId } = useParams<{ repoId: string; prId: string }>();
  const repo = REPOS.find(r => r.id === repoId) ?? REPOS[0];
  const pr   = PR_LIST.find(p => p.id === Number(prId)) ?? PR_LIST[0];

  const [tab, setTab] = useState<Tab>('summary');
  const [activeFile, setActiveFile] = useState(FILES[0].path);
  const [jumpToLine, setJumpToLine] = useState<JumpTarget | null>(null);

  const totals = useMemo(
    () => SUGGESTIONS.reduce<Partial<Record<Severity, number>>>((acc, s) => {
      acc[s.severity] = (acc[s.severity] ?? 0) + 1;
      return acc;
    }, {}),
    []
  );

  const jumpToContext = (file: string, line: number) => {
    setActiveFile(file);
    setJumpToLine({ file, line, key: Date.now() });
    setTab('files');
  };

  const stateKind = pr.state === 'merged' ? 'accent' : pr.state === 'closed' ? 'critical' : 'success';
  const stateLabel = pr.state === 'open' ? 'Open' : pr.state === 'merged' ? 'Merged' : pr.state === 'closed' ? 'Closed' : 'Draft';
  const initials = pr.authorName.split(' ').map(s => s[0]).join('').slice(0, 2);

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* PR header card */}
      <div className="pr-header-card">
        <div className="pr-header-top">
          <div className="pr-header-title-block">
            <div className="pr-header-title">
              {pr.title}
              <span className="pr-num-large mono">#{pr.id}</span>
            </div>
            <div className="pr-header-meta">
              <StatusBadge kind={stateKind}>{stateLabel}</StatusBadge>
              <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="avatar xs" style={{ width: 18, height: 18, fontSize: 9 }}>
                  {initials}
                </span>
                <span style={{ color: 'var(--fg)' }}>{pr.authorName}</span>
                wants to merge
              </span>
              <span className="badge mono">
                <GitPullRequest size={11} /> {pr.branch}
              </span>
              <ArrowRight size={11} className="faint" />
              <span className="badge mono">
                <GitPullRequest size={11} /> main
              </span>
              <span className="faint">· opened {pr.opened}</span>
            </div>
          </div>
          <div className="pr-header-actions">
            <button className="btn"><RefreshCw size={13} /> Re-run review</button>
            <button className="btn primary"><ExternalLink size={13} /> View on GitHub</button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabs pr-tabs">
        <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          <Bot size={12} /> Summary
        </button>
        <button className={`tab ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
          <File size={12} /> Files changed <span className="count">{FILES.length}</span>
        </button>
        <button className={`tab ${tab === 'suggestions' ? 'active' : ''}`} onClick={() => setTab('suggestions')}>
          <Sparkles size={12} /> Suggestions <span className="count">{SUGGESTIONS.length}</span>
        </button>
      </div>

      {tab === 'summary' && (
        <SummaryTab pr={pr} totals={totals} jumpToContext={jumpToContext} />
      )}
      {tab === 'files' && (
        <FilesTab
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          jumpToLine={jumpToLine}
        />
      )}
      {tab === 'suggestions' && (
        <SuggestionsTab jumpToContext={jumpToContext} />
      )}
    </div>
  );
}
