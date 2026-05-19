'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, BookOpen, Check, RefreshCw, GitPullRequest, GitMerge, XCircle, Filter, Github, Settings } from 'lucide-react';
import { REPOS, PR_LIST } from '@/lib/data';
import { LangDot } from '@/components/ui/lang-dot';
import { PRRow } from '@/components/pr/pr-row';

type Tab = 'all' | 'open' | 'closed' | 'merged';

export default function RepoDetailPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const repo = REPOS.find(r => r.id === repoId) ?? REPOS[0];
  const [tab, setTab] = useState<Tab>('all');

  const filtered = useMemo(() => {
    if (tab === 'open')   return PR_LIST.filter(p => p.state === 'open' || p.state === 'draft');
    if (tab === 'merged') return PR_LIST.filter(p => p.state === 'merged');
    if (tab === 'closed') return PR_LIST.filter(p => p.state === 'closed');
    return PR_LIST;
  }, [tab]);

  const totalReviewed  = PR_LIST.filter(p => p.reviewStatus === 'reviewed').length;
  const totalIssues    = PR_LIST.reduce((sum, p) => sum + p.sevCounts.critical + p.sevCounts.warning + p.sevCounts.suggestion, 0);
  const openCount      = PR_LIST.filter(p => p.state === 'open').length;
  const draftCount     = PR_LIST.filter(p => p.state === 'draft').length;
  const criticalCount  = PR_LIST.filter(p => p.sevCounts.critical > 0).length;
  const openOrDraft    = PR_LIST.filter(p => p.state === 'open' || p.state === 'draft').length;
  const closedCount    = PR_LIST.filter(p => p.state === 'closed').length;
  const mergedCount    = PR_LIST.filter(p => p.state === 'merged').length;

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="repo-header">
        <div className="repo-header-main">
          <div className="repo-header-title">
            {repo.privacy === 'private'
              ? <Shield size={18} className="muted" />
              : <BookOpen size={18} className="muted" />}
            <span className="muted">{repo.org}</span>
            <span className="faint">/</span>
            <span style={{ fontWeight: 600 }}>{repo.name}</span>
            <span className="badge" style={{ marginLeft: 8 }}>
              {repo.privacy === 'private' ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="repo-header-desc">{repo.desc}</p>
          <div className="repo-header-meta">
            <span className="meta-chip"><LangDot lang={repo.lang} />{repo.lang}</span>
            <span className="meta-chip"><Check size={11} />Connected since Feb 14, 2026</span>
            <span className="meta-chip"><RefreshCw size={11} />Auto-review on every push</span>
            <span className="meta-chip mono"><GitPullRequest size={11} />main</span>
          </div>
        </div>
        <div className="repo-header-actions">
          <button className="btn"><Github size={13} /> Open in GitHub</button>
          <button className="btn"><Settings size={13} /> Configure</button>
          <button className="btn ghost subtle-danger"><XCircle size={12} /> Disconnect</button>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-card">
          <div className="label">Total PRs reviewed</div>
          <div className="value">{repo.reviewed}</div>
          <div className="delta up">+{totalReviewed} this week</div>
        </div>
        <div className="stat-card">
          <div className="label">Open PRs</div>
          <div className="value">{openCount}</div>
          <div className="delta">{draftCount} draft</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg review time</div>
          <div className="value">42<span style={{ fontSize: 16, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 2 }}>s</span></div>
          <div className="delta">P95 1m 47s</div>
        </div>
        <div className="stat-card">
          <div className="label">Issues flagged</div>
          <div className="value">{totalIssues}</div>
          <div className="delta down">{criticalCount} critical</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All <span className="count">{PR_LIST.length}</span>
        </button>
        <button className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>
          <GitPullRequest size={12} />
          Open <span className="count">{openOrDraft}</span>
        </button>
        <button className={`tab ${tab === 'closed' ? 'active' : ''}`} onClick={() => setTab('closed')}>
          <XCircle size={12} />
          Closed <span className="count">{closedCount}</span>
        </button>
        <button className={`tab ${tab === 'merged' ? 'active' : ''}`} onClick={() => setTab('merged')}>
          <GitMerge size={12} />
          Merged <span className="count">{mergedCount}</span>
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" style={{ alignSelf: 'center', marginBottom: 4 }}>
          <Filter size={11} />
          Sort: Most recent
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="icon-wrap"><GitPullRequest size={20} /></div>
            <h3>No PRs in this view</h3>
            <p>Open a PR in this repo to get started. Reviewly auto-reviews every PR opened against the default branch.</p>
            <button className="btn primary" style={{ marginTop: 8 }}>
              <Github size={13} /> Open new PR on GitHub
            </button>
          </div>
        ) : (
          filtered.map(pr => <PRRow key={pr.id} pr={pr} repoId={repo.id} />)
        )}
      </div>
    </div>
  );
}
