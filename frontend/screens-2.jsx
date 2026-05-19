/* global React, Icon, SeverityBadge, StatusBadge, PageHeader, LangDot, REPOS */
const { useState: useStateB, useMemo: useMemoB } = React;

/* ============================================================
   REPO DETAIL — PR list for a single repo
   ============================================================ */
const PR_LIST = [
  {
    id: 482, title: 'Refactor upload retry queue to await flush', branch: 'feat/await-flush', base: 'main',
    author: 'jrowe', authorName: 'Jordan Rowe', state: 'open',
    sevCounts: { critical: 1, warning: 2, suggestion: 4, nitpick: 3 },
    reviewState: 'changes',
    reviewStatus: 'reviewed',
    summary: 'Tight refactor — but the new await bubbles UploadAbortedError into a caller that doesn\'t catch it.',
    additions: 84, deletions: 32, files: 6,
    opened: '12 minutes ago', checks: 'pass',
  },
  {
    id: 481, title: 'Add billing webhook handler for failed renewals', branch: 'billing/failed-renewals', base: 'main',
    author: 'mira', authorName: 'Mira Kapoor', state: 'open',
    sevCounts: { critical: 0, warning: 0, suggestion: 2, nitpick: 1 },
    reviewState: 'approved',
    reviewStatus: 'reviewed',
    summary: 'Clean handler. Two suggestions around idempotency keys and one nit on log shape.',
    additions: 218, deletions: 14, files: 11,
    opened: '38 minutes ago', checks: 'pass',
  },
  {
    id: 480, title: 'Bump pg client to 8.11 and pin sub-deps', branch: 'chore/pg-bump', base: 'main',
    author: 'depbot', authorName: 'dependabot', state: 'open',
    sevCounts: { critical: 0, warning: 1, suggestion: 0, nitpick: 0 },
    reviewState: 'commented',
    reviewStatus: 'reviewing',
    summary: 'Reviewing changelog and breaking-change notes for 8.10 → 8.11…',
    additions: 12, deletions: 12, files: 2,
    opened: '2 hours ago', checks: 'pending',
  },
  {
    id: 479, title: 'Idempotent invoice generation under retry storms', branch: 'fix/invoice-idempotency', base: 'main',
    author: 'kgoh', authorName: 'Kenji Goh', state: 'open',
    sevCounts: { critical: 2, warning: 3, suggestion: 1, nitpick: 0 },
    reviewState: 'changes',
    reviewStatus: 'reviewed',
    summary: 'Two critical races around the locking primitive — needs a transaction wrap before merge.',
    additions: 312, deletions: 88, files: 14,
    opened: '4 hours ago', checks: 'fail',
  },
  {
    id: 478, title: 'Draft: rewrite payments adapter with typed errors', branch: 'draft/payments-typed', base: 'main',
    author: 'jrowe', authorName: 'Jordan Rowe', state: 'draft',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'pending',
    reviewStatus: 'failed',
    summary: 'Review skipped — draft PRs are not auto-reviewed. Mark ready for review to run.',
    additions: 0, deletions: 0, files: 0,
    opened: 'yesterday', checks: 'pending',
  },
  {
    id: 477, title: 'Inline preview for embeds in customer dashboard', branch: 'feat/inline-embed-preview', base: 'main',
    author: 'avale', authorName: 'Ana Valenti', state: 'open',
    sevCounts: { critical: 0, warning: 0, suggestion: 1, nitpick: 4 },
    reviewState: 'approved',
    reviewStatus: 'reviewed',
    summary: 'Solid feature work. One suggestion around the SSR fallback, four nits in markdown copy.',
    additions: 96, deletions: 22, files: 5,
    opened: 'yesterday', checks: 'pass',
  },
  {
    id: 476, title: 'Move retry budget to per-tenant config table', branch: 'feat/retry-budget', base: 'main',
    author: 'mira', authorName: 'Mira Kapoor', state: 'merged',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'approved',
    reviewStatus: 'reviewed',
    summary: 'Approved cleanly. Migration is reversible and the rollout plan is documented.',
    additions: 142, deletions: 38, files: 8,
    opened: '2 days ago', checks: 'pass',
  },
  {
    id: 475, title: 'Fix: invoice PDF rendering on Safari < 16', branch: 'fix/safari-pdf', base: 'main',
    author: 'kgoh', authorName: 'Kenji Goh', state: 'closed',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'pending',
    reviewStatus: 'reviewed',
    summary: 'Approved, but author closed in favor of #481 which subsumes the same fix.',
    additions: 18, deletions: 6, files: 2,
    opened: '3 days ago', checks: 'pass',
  },
  {
    id: 474, title: 'Telemetry: tag retries with parent span ID', branch: 'feat/telemetry-retry-spans', base: 'main',
    author: 'avale', authorName: 'Ana Valenti', state: 'merged',
    sevCounts: { critical: 0, warning: 1, suggestion: 2, nitpick: 1 },
    reviewState: 'approved',
    reviewStatus: 'reviewed',
    summary: 'Warning about span cardinality blowup if user IDs leak into tag values.',
    additions: 64, deletions: 8, files: 4,
    opened: '4 days ago', checks: 'pass',
  },
];

function RepoDetailScreen({ repoId, navigate }) {
  const repo = REPOS.find(r => r.id === repoId) || REPOS[0];
  const [tab, setTab] = useStateB('all');

  const filtered = useMemoB(() => {
    if (tab === 'all') return PR_LIST;
    if (tab === 'open') return PR_LIST.filter(p => p.state === 'open' || p.state === 'draft');
    if (tab === 'merged') return PR_LIST.filter(p => p.state === 'merged');
    if (tab === 'closed') return PR_LIST.filter(p => p.state === 'closed');
    return PR_LIST;
  }, [tab]);

  const totalReviewed = PR_LIST.filter(p => p.reviewStatus === 'reviewed').length;
  const totalIssues = PR_LIST.reduce((sum, p) =>
    sum + p.sevCounts.critical + p.sevCounts.warning + p.sevCounts.suggestion,
  0);
  const openCount = PR_LIST.filter(p => p.state === 'open').length;

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="repo-header">
        <div className="repo-header-main">
          <div className="repo-header-title">
            <Icon name={repo.privacy === 'private' ? 'shield' : 'repo'} size={18} className="muted" />
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
            <span className="meta-chip"><Icon name="check" size={11} />Connected since Feb 14, 2026</span>
            <span className="meta-chip"><Icon name="refresh" size={11} />Auto-review on every push</span>
            <span className="meta-chip mono"><Icon name="branch" size={11} />main</span>
          </div>
        </div>
        <div className="repo-header-actions">
          <button className="btn"><Icon name="github" size={13} /> Open in GitHub</button>
          <button className="btn"><Icon name="sliders" size={13} /> Configure</button>
          <button className="btn ghost subtle-danger"><Icon name="x" size={12} /> Disconnect</button>
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
          <div className="delta">{PR_LIST.filter(p => p.state === 'draft').length} draft</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg review time</div>
          <div className="value">42<span style={{ fontSize: 16, color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 2 }}>s</span></div>
          <div className="delta">P95 1m 47s</div>
        </div>
        <div className="stat-card">
          <div className="label">Issues flagged</div>
          <div className="value">{totalIssues}</div>
          <div className="delta down">{PR_LIST.filter(p => p.sevCounts.critical > 0).length} critical</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All <span className="count">{PR_LIST.length}</span>
        </button>
        <button className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>
          <Icon name="pr" size={12} />
          Open <span className="count">{PR_LIST.filter(p => p.state === 'open' || p.state === 'draft').length}</span>
        </button>
        <button className={`tab ${tab === 'closed' ? 'active' : ''}`} onClick={() => setTab('closed')}>
          <Icon name="closed" size={12} />
          Closed <span className="count">{PR_LIST.filter(p => p.state === 'closed').length}</span>
        </button>
        <button className={`tab ${tab === 'merged' ? 'active' : ''}`} onClick={() => setTab('merged')}>
          <Icon name="merge" size={12} />
          Merged <span className="count">{PR_LIST.filter(p => p.state === 'merged').length}</span>
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" style={{ alignSelf: 'center', marginBottom: 4 }}>
          <Icon name="filter" size={11} />
          Sort: Most recent
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="icon-wrap"><Icon name="pr" size={20} /></div>
            <h3>No PRs reviewed yet</h3>
            <p>Open a PR in this repo to get started. Reviewly auto-reviews every PR opened against the default branch.</p>
            <button className="btn primary" style={{ marginTop: 8 }}>
              <Icon name="github" size={13} /> Open new PR on GitHub
            </button>
          </div>
        ) : (
          filtered.map(pr => <PRRow key={pr.id} pr={pr} navigate={navigate} repoId={repo.id} base={repo.name === 'api' ? 'main' : 'main'} />)
        )}
      </div>
    </div>
  );
}

function PRRow({ pr, navigate, repoId }) {
  const stateIcon = {
    open:   { name: 'pr',     cls: '' },
    draft:  { name: 'pr',     cls: 'draft' },
    merged: { name: 'merge',  cls: 'merged' },
    closed: { name: 'closed', cls: 'closed' },
  }[pr.state];

  const reviewBadge = {
    reviewed:  <StatusBadge kind="success">Reviewed</StatusBadge>,
    reviewing: <StatusBadge kind="info">Reviewing</StatusBadge>,
    failed:    <StatusBadge kind="critical">Failed</StatusBadge>,
  }[pr.reviewStatus] || <StatusBadge>Pending</StatusBadge>;

  const initials = pr.authorName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const isBot = pr.author === 'depbot';

  const open = (e) => {
    e.stopPropagation();
    navigate({ screen: 'pr', repoId, prId: pr.id });
  };

  return (
    <div className="pr-row-v2" onClick={() => navigate({ screen: 'pr', repoId, prId: pr.id })}>
      <span className={`pr-icon ${stateIcon.cls}`}>
        <Icon name={stateIcon.name} size={16} />
      </span>

      <div className="pr-main">
        <div className="pr-title-line">
          <span className="pr-num mono">#{pr.id}</span>
          <span className="pr-title">{pr.title}</span>
          {pr.state === 'draft' && <span className="badge">Draft</span>}
        </div>

        <div className="pr-summary">
          <Icon name="bot" size={11} className="bot-glyph" />
          {pr.summary}
        </div>

        <div className="pr-meta">
          <span className="meta-chip">
            <span className={`avatar xs ${isBot ? 'bot-avatar' : ''}`} style={{ width: 18, height: 18, fontSize: 9 }}>
              {isBot ? <Icon name="bot" size={10} /> : initials}
            </span>
            {pr.authorName}
          </span>
          <span className="meta-chip mono">
            <Icon name="branch" size={11} />
            {pr.branch}
            <Icon name="arrowRight" size={9} style={{ opacity: 0.5 }} />
            {pr.base || 'main'}
          </span>
          <span className="meta-chip">
            <Icon name="clock" size={11} />
            {pr.opened}
          </span>
          {pr.additions > 0 && (
            <span className="meta-chip mono">
              <span style={{ color: 'var(--success)' }}>+{pr.additions}</span>
              <span style={{ color: 'var(--critical)' }}>−{pr.deletions}</span>
            </span>
          )}
        </div>
      </div>

      <div className="pr-right" onClick={(e) => e.stopPropagation()}>
        {reviewBadge}
        <div className="pr-sev-row">
          {pr.sevCounts.critical > 0 && <SeverityBadge level="critical" count={pr.sevCounts.critical} />}
          {pr.sevCounts.warning > 0 && <SeverityBadge level="warning" count={pr.sevCounts.warning} />}
          {pr.sevCounts.critical === 0 && pr.sevCounts.warning === 0 && pr.sevCounts.suggestion > 0 &&
            <SeverityBadge level="suggestion" count={pr.sevCounts.suggestion} />}
          {pr.sevCounts.critical === 0 && pr.sevCounts.warning === 0 && pr.sevCounts.suggestion === 0 && pr.reviewStatus === 'reviewed' &&
            <span className="badge success" style={{ fontSize: 11 }}><span className="dot" /> Clean</span>}
        </div>
        <button className="pr-view" onClick={open}>
          View review
          <Icon name="arrowRight" size={11} />
        </button>
      </div>
    </div>
  );
}

window.RepoDetailScreen = RepoDetailScreen;
window.PR_LIST = PR_LIST;
