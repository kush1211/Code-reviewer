/* global React, Icon, SeverityBadge, StatusBadge, PageHeader, LangDot, LANG_COLORS, Skel */
const { useState: useStateA, useMemo: useMemoA } = React;

/* ============================================================
   LANDING / LOGIN
   ============================================================ */
function LandingScreen({ navigate }) {
  const [state, setState] = useStateA('idle'); // 'idle' | 'loading' | 'redirect'

  const handleSignIn = () => {
    setState('loading');
    setTimeout(() => setState('redirect'), 1200);
    setTimeout(() => navigate({ screen: 'repos' }), 2400);
  };

  return (
    <div className="login-shell">
      <div className="login-grid-bg" aria-hidden />

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden />
          <span>Reviewly</span>
        </div>

        <div className="login-body">
          <h1 className="login-tagline">AI code reviews on every pull request.</h1>
          <p className="login-prop">
            Reviewly reads the diff the second a PR opens, posts a severity-tagged
            review, and flags the one thing that&rsquo;ll bite you in production &mdash;
            usually before CI finishes.
          </p>

          {state === 'idle' && (
            <button className="btn login-cta" onClick={handleSignIn}>
              <Icon name="github" size={18} />
              Continue with GitHub
              <Icon name="arrowRight" size={14} className="cta-arrow" />
            </button>
          )}
          {state === 'loading' && (
            <button className="btn login-cta loading" disabled>
              <span className="spinner" />
              Connecting to GitHub&hellip;
            </button>
          )}
          {state === 'redirect' && (
            <button className="btn login-cta redirect" disabled>
              <Icon name="open" size={14} />
              Redirecting to github.com&hellip;
            </button>
          )}

          <p className="login-micro">
            <Icon name="shield" size={11} />
            We only request <strong>read access</strong> to repositories you select.
          </p>

          <div className="login-divider"><span>or</span></div>

          <button className="btn login-secondary">
            <Icon name="user" size={14} />
            Continue with SSO &middot; <span className="faint" style={{ marginLeft: 4 }}>SAML / Okta</span>
          </button>
        </div>

        <div className="login-foot">
          <a>Docs</a>
          <span className="login-foot-sep">&middot;</span>
          <a>Privacy</a>
          <span className="login-foot-sep">&middot;</span>
          <a>Terms</a>
          <span className="spacer" style={{ flex: 1 }} />
          <span className="faint">v1.4</span>
        </div>
      </div>

      <div className="login-ticker">
        <span className="badge accent"><Icon name="sparkles" size={10} /> Live</span>
        <span className="faint">Reviewly posted&nbsp;</span>
        <span className="mono">128 reviews</span>
        <span className="faint">&nbsp;in the last 24h across&nbsp;</span>
        <span className="mono">1,204 repos</span>
      </div>
    </div>
  );
}

/* ============================================================
   REPOS DASHBOARD
   ============================================================ */
const REPOS = [
  {
    id: 'api', name: 'api', org: 'linear-labs',
    desc: 'Public API gateway, billing, and webhooks for the Linear Labs platform.',
    lang: 'TypeScript', stars: 1280,
    openPRs: 14, reviewed: 312, findings: 47,
    lastReview: '2 minutes ago', updated: '4 minutes ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'web', name: 'web', org: 'linear-labs',
    desc: 'Customer-facing dashboard, marketing site, and authentication flows.',
    lang: 'TypeScript', stars: 842,
    openPRs: 9, reviewed: 528, findings: 32,
    lastReview: '8 minutes ago', updated: '12 minutes ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'pipelines', name: 'pipelines', org: 'linear-labs',
    desc: 'ETL jobs and warehouse sync for analytics, with retry semantics.',
    lang: 'Python', stars: 96,
    openPRs: 3, reviewed: 188, findings: 12,
    lastReview: '1 hour ago', updated: '2 hours ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'cli', name: 'cli', org: 'linear-labs',
    desc: 'Local developer toolchain — scaffolds, deploys, tails logs.',
    lang: 'Go', stars: 412,
    openPRs: 2, reviewed: 96, findings: 4,
    lastReview: '3 hours ago', updated: '5 hours ago',
    privacy: 'public', connected: true,
  },
  {
    id: 'edge', name: 'edge', org: 'linear-labs',
    desc: 'Edge worker runtime for low-latency rules — Rust + WASM.',
    lang: 'Rust', stars: 64,
    openPRs: 1, reviewed: 41, findings: 2,
    lastReview: '1 day ago', updated: '1 day ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'docs', name: 'docs', org: 'linear-labs',
    desc: 'Public documentation site and SDK reference, rebuilt nightly.',
    lang: 'TypeScript', stars: 28,
    openPRs: 0, reviewed: 22, findings: 0,
    lastReview: '2 days ago', updated: '2 days ago',
    privacy: 'public', connected: true,
  },
  // Not-connected (available)
  {
    id: 'experiments', name: 'experiments', org: 'linear-labs',
    desc: 'Quick prototypes and spike branches — not actively deployed.',
    lang: 'TypeScript', updated: '6 hours ago',
    privacy: 'private', connected: false,
  },
  {
    id: 'design-tokens', name: 'design-tokens', org: 'linear-labs',
    desc: 'Shared color, type, and spacing tokens — published to npm nightly.',
    lang: 'TypeScript', updated: '1 day ago',
    privacy: 'public', connected: false,
  },
  {
    id: 'mobile-ios', name: 'mobile-ios', org: 'linear-labs',
    desc: 'iOS application source — SwiftUI screens and shared models.',
    lang: 'Swift', updated: '3 days ago',
    privacy: 'private', connected: false,
  },
  {
    id: 'mobile-android', name: 'mobile-android', org: 'linear-labs',
    desc: 'Android application source — Kotlin, Jetpack Compose.',
    lang: 'Go', updated: '4 days ago',
    privacy: 'private', connected: false,
  },
  {
    id: 'support-bot', name: 'support-bot', org: 'linear-labs',
    desc: 'Slack-based help-center automations and triage routing.',
    lang: 'Python', updated: '1 week ago',
    privacy: 'private', connected: false,
  },
];

function ReposScreen({ navigate }) {
  const [query, setQuery] = useStateA('');
  const [filter, setFilter] = useStateA('all'); // 'all' | 'connected' | 'available'
  const [loading, setLoading] = useStateA(false);
  const [filterOpen, setFilterOpen] = useStateA(false);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1300);
  };

  // Filter + search + pin connected to top
  const filtered = useMemoA(() => {
    let list = REPOS;
    if (filter === 'connected') list = list.filter(r => r.connected);
    if (filter === 'available') list = list.filter(r => !r.connected);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.org.toLowerCase().includes(q) ||
        (r.desc || '').toLowerCase().includes(q) ||
        (r.lang || '').toLowerCase().includes(q)
      );
    }
    // Pin connected first when showing 'all'
    if (filter === 'all') {
      list = [...list].sort((a, b) =>
        Number(b.connected) - Number(a.connected)
      );
    }
    return list;
  }, [query, filter]);

  const connectedCount = REPOS.filter(r => r.connected).length;
  const availableCount = REPOS.filter(r => !r.connected).length;

  const filterLabel = {
    all: 'All repositories',
    connected: 'Connected',
    available: 'Not connected',
  }[filter];

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <PageHeader
        title="Your repositories"
        sub={`${REPOS.length} repositories visible · ${connectedCount} connected for review`}
      />

      <div className="repo-toolbar">
        <div className="search inline-search">
          <Icon name="search" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories…"
          />
          {query && (
            <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setQuery('')}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>

        <div className="dropdown-wrap">
          <button
            className={`btn ${filterOpen ? 'is-open' : ''}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <Icon name="filter" size={12} />
            {filterLabel}
            <Icon name="chevronDown" size={12} />
          </button>
          {filterOpen && (
            <>
              <div className="dropdown-scrim" onClick={() => setFilterOpen(false)} />
              <div className="dropdown-menu">
                {[
                  { v: 'all', label: 'All repositories', count: REPOS.length },
                  { v: 'connected', label: 'Connected', count: connectedCount },
                  { v: 'available', label: 'Not connected', count: availableCount },
                ].map(opt => (
                  <button
                    key={opt.v}
                    className={`dropdown-item ${filter === opt.v ? 'active' : ''}`}
                    onClick={() => { setFilter(opt.v); setFilterOpen(false); }}
                  >
                    <span className="check">
                      {filter === opt.v && <Icon name="check" size={12} />}
                    </span>
                    <span>{opt.label}</span>
                    <span className="count">{opt.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className={`icon-btn refresh-btn ${loading ? 'spinning' : ''}`}
          onClick={refresh}
          title="Refresh from GitHub"
          disabled={loading}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <div className="repo-list-meta">
        <span className="faint">
          {loading
            ? 'Refreshing from GitHub…'
            : filtered.length === 0
              ? 'No matches'
              : `${filtered.length} ${filtered.length === 1 ? 'repository' : 'repositories'}`}
        </span>
        {query && !loading && filtered.length > 0 && (
          <span className="faint">
            · matching <span className="mono" style={{ color: 'var(--fg-muted)' }}>"{query}"</span>
          </span>
        )}
      </div>

      <div className="repo-list">
        {loading && Array.from({ length: 4 }).map((_, i) => <RepoRowSkeleton key={i} />)}

        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div className="icon-wrap"><Icon name="repo" size={20} /></div>
            <h3>No repositories found</h3>
            <p>
              {query
                ? `Nothing matches "${query}". Try a different search term, or refresh from GitHub.`
                : 'GitHub didn\'t return any repositories for your account. Refresh to try again, or check your organization permissions.'}
            </p>
            <button className="btn primary" style={{ marginTop: 8 }} onClick={refresh}>
              <Icon name="refresh" size={13} />
              Refresh from GitHub
            </button>
          </div>
        )}

        {!loading && filtered.map(r => (
          <RepoRow key={r.id} repo={r} navigate={navigate} highlight={query} />
        ))}
      </div>
    </div>
  );
}

function RepoRow({ repo, navigate, highlight }) {
  const onPrimary = () => {
    if (repo.connected) navigate({ screen: 'repo', repoId: repo.id });
  };
  return (
    <div className="repo-row" onClick={onPrimary} role="button">
      <div className="repo-row-icon">
        <Icon name={repo.privacy === 'private' ? 'shield' : 'repo'} size={15} />
      </div>

      <div className="repo-row-main">
        <div className="repo-row-name-line">
          <span className="repo-org">{repo.org}/</span>
          <span className="repo-name">{highlightText(repo.name, highlight)}</span>
          {repo.connected && repo.findings > 0 && (
            <span className="badge accent" style={{ marginLeft: 6 }}>
              <Icon name="bot" size={10} />
              {repo.findings} findings
            </span>
          )}
        </div>
        <p className="repo-desc">{repo.desc}</p>
        <div className="repo-meta">
          <span className="meta-chip"><LangDot lang={repo.lang} />{repo.lang}</span>
          <span className="meta-chip">
            <Icon name={repo.privacy === 'private' ? 'shield' : 'eye'} size={11} />
            {repo.privacy === 'private' ? 'Private' : 'Public'}
          </span>
          <span className="meta-chip"><Icon name="clock" size={11} />Updated {repo.updated}</span>
          {repo.connected && repo.openPRs != null && (
            <span className="meta-chip"><Icon name="pr" size={11} />{repo.openPRs} open</span>
          )}
        </div>
      </div>

      <div className="repo-row-right" onClick={(e) => e.stopPropagation()}>
        {repo.connected ? (
          <>
            <span className="badge success"><span className="dot" /> Connected</span>
            <button className="btn sm">
              <Icon name="settings" size={11} /> Manage
            </button>
          </>
        ) : (
          <>
            <span className="badge"><span className="dot" style={{ background: 'var(--fg-faint)' }} /> Not connected</span>
            <button className="btn sm primary">
              <Icon name="plus" size={11} /> Connect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function highlightText(text, q) {
  if (!q || !q.trim()) return text;
  const lower = text.toLowerCase();
  const ql = q.trim().toLowerCase();
  const i = lower.indexOf(ql);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{text.slice(i, i + ql.length)}</mark>
      {text.slice(i + ql.length)}
    </>
  );
}

function RepoRowSkeleton() {
  return (
    <div className="repo-row skeleton-row">
      <div className="repo-row-icon"><span className="skel" style={{ width: 16, height: 16, borderRadius: 4 }} /></div>
      <div className="repo-row-main">
        <div className="repo-row-name-line">
          <Skel w={180} h={14} />
        </div>
        <div style={{ marginTop: 6 }}><Skel w={320} h={11} /></div>
        <div className="repo-meta" style={{ marginTop: 10, gap: 12 }}>
          <Skel w={70} h={11} />
          <Skel w={60} h={11} />
          <Skel w={110} h={11} />
        </div>
      </div>
      <div className="repo-row-right">
        <Skel w={86} h={20} r={999} />
        <Skel w={70} h={26} r={6} />
      </div>
    </div>
  );
}

window.LandingScreen = LandingScreen;
window.ReposScreen = ReposScreen;
window.REPOS = REPOS;
