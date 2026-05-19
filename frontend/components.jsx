/* global React */
const { useState, useEffect, useMemo, useRef } = React;

/* ============================================================
   ICONS — tight outline set, 16px default
   ============================================================ */
function Icon({ name, size = 16, className = '', strokeWidth = 1.6, ...rest }) {
  const s = size;
  const props = {
    width: s, height: s, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, ...rest,
  };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.4" /><rect x="14" y="3" width="7" height="5" rx="1.4" /><rect x="14" y="12" width="7" height="9" rx="1.4" /><rect x="3" y="16" width="7" height="5" rx="1.4" /></>,
    repo: <><path d="M4 4.5A2.5 2.5 0 016.5 2H20v15H6.5A2.5 2.5 0 014 19.5v-15z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20v5H6.5A2.5 2.5 0 014 19.5z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    pr: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M6 8v8" /><path d="M14 5h2a2 2 0 012 2v9" /><path d="M14 2l-3 3 3 3" /></>,
    branch: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 8v8" /><path d="M18 8c0 4-4 4-6 6" /></>,
    star: <path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z" />,
    check: <path d="M5 13l4 4L19 7" />,
    x: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
    bell: <><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" /><path d="M10 21a2 2 0 004 0" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    chevronLeft: <path d="M15 6l-6 6 6 6" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    arrowRight: <><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></>,
    sparkles: <><path d="M12 3v4" /><path d="M12 17v4" /><path d="M5 12H1" /><path d="M23 12h-4" /><path d="M19 5l-2.5 2.5" /><path d="M7.5 16.5L5 19" /><path d="M19 19l-2.5-2.5" /><path d="M7.5 7.5L5 5" /></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M12 7V3" /><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" /><path d="M9 17h6" /></>,
    github: <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.7-.3 2.5-.3s1.7.1 2.5.3c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v2.6c0 .3.2.6.7.5C19.1 20.2 22 16.4 22 12c0-5.5-4.5-10-10-10z" fill="currentColor" stroke="none" />,
    folder: <path d="M3 6.5A2.5 2.5 0 015.5 4h3.6a2 2 0 011.5.7l1.2 1.4a2 2 0 001.5.7h5.2A2.5 2.5 0 0121 9.3v8.2A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-11z" />,
    file: <><path d="M14 3H6.5A2.5 2.5 0 004 5.5v13A2.5 2.5 0 006.5 21h11A2.5 2.5 0 0020 18.5V9z" /><path d="M14 3v5a1 1 0 001 1h5" /></>,
    code: <><path d="M9 8l-4 4 4 4" /><path d="M15 8l4 4-4 4" /></>,
    activity: <path d="M3 12h4l2-8 4 16 2-8h6" />,
    refresh: <><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>,
    open: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v4.5A1.5 1.5 0 0117.5 20h-12A1.5 1.5 0 014 18.5v-12A1.5 1.5 0 015.5 5H10" /></>,
    dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    history: <><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3" /><path d="M3 4v4h4" /><path d="M12 7v5l3 2" /></>,
    play: <path d="M6 4l14 8-14 8V4z" />,
    moreH: <><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    book: <><path d="M4 4v15.5A1.5 1.5 0 005.5 21H20V6.5A2.5 2.5 0 0017.5 4H6a2 2 0 00-2 2z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></>,
    shield: <><path d="M12 3l8 3v6c0 4.5-3.5 8.5-8 9-4.5-.5-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
    zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 4v16" /></>,
    commit: <><circle cx="12" cy="12" r="3" /><path d="M2 12h7" /><path d="M15 12h7" /></>,
    merge: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 8v8" /><path d="M6 12h10" /></>,
    closed: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6" /><path d="M15 9l-6 6" /></>,
    play2: <><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" /></>,
    sliders: <><path d="M4 6h8" /><path d="M16 6h4" /><circle cx="14" cy="6" r="2" /><path d="M4 12h2" /><path d="M10 12h10" /><circle cx="8" cy="12" r="2" /><path d="M4 18h12" /><path d="M20 18" /><circle cx="18" cy="18" r="2" /></>,
    download: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
    diff: <><path d="M4 6h10" /><path d="M9 1v10" /><path d="M14 23l-4-4 4-4" /><path d="M20 19H10" /></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

/* ============================================================
   Severity Badge
   ============================================================ */
function SeverityBadge({ level, count }) {
  const meta = {
    critical:   { label: 'Critical', dot: true },
    warning:    { label: 'Warning', dot: true },
    suggestion: { label: 'Suggestion', dot: true },
    nitpick:    { label: 'Nitpick', dot: false },
  }[level] || { label: level };
  return (
    <span className={`sev ${level}`}>
      <span className="mark" />
      {meta.label}
      {count != null && <span style={{ marginLeft: 4, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
    </span>
  );
}

/* ============================================================
   Status Badge
   ============================================================ */
function StatusBadge({ kind, children }) {
  return (
    <span className={`badge ${kind || ''}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

/* ============================================================
   Sidebar
   ============================================================ */
function Sidebar({ collapsed, setCollapsed, route, navigate }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'repos', label: 'Repositories', icon: 'repo', count: 12 },
    { id: 'inbox', label: 'Inbox', icon: 'bell', count: 3 },
    { id: 'history', label: 'History', icon: 'history' },
  ];
  const teamItems = [
    { id: 'team', label: 'Team', icon: 'user' },
    { id: 'rules', label: 'Review rules', icon: 'sliders' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const navTo = (id) => {
    if (id === 'repos' || id === 'dashboard') navigate({ screen: id });
    else navigate({ screen: id });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden />
        <span className="brand-name">Reviewly</span>
      </div>

      <button className="org-switch" type="button">
        <span className="org-dot" />
        <span>linear-labs</span>
        <Icon name="chevronDown" size={14} />
      </button>

      <div className="sidebar-section">
        {items.map(it => (
          <button
            key={it.id}
            className={`nav-item ${route.screen === it.id || (it.id === 'repos' && (route.screen === 'repo' || route.screen === 'pr')) ? 'active' : ''}`}
            onClick={() => navTo(it.id)}
          >
            <Icon name={it.icon} className="ico" />
            <span className="nav-label">{it.label}</span>
            {it.count != null && <span className="count">{it.count}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="nav-section-title">Workspace</div>
        {teamItems.map(it => (
          <button
            key={it.id}
            className={`nav-item ${route.screen === it.id ? 'active' : ''}`}
            onClick={() => navTo(it.id)}
          >
            <Icon name={it.icon} className="ico" />
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="avatar">MK</div>
        <div className="meta">
          <span className="name">Mira Kapoor</span>
          <span className="email">mira@linear-labs.dev</span>
        </div>
      </div>

      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={12} />
      </button>
    </aside>
  );
}

/* ============================================================
   TopBar with breadcrumbs
   ============================================================ */
function TopBar({ crumbs, onCrumb }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevronRight" size={12} className="sep" />}
            <span
              className={`crumb ${i === crumbs.length - 1 ? 'current' : ''}`}
              onClick={() => c.to && onCrumb && onCrumb(c.to)}
            >
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="search">
        <Icon name="search" size={14} />
        <input placeholder="Search repos, PRs, files…" />
        <span className="kbd">⌘K</span>
      </div>

      <button className="icon-btn" title="Notifications">
        <Icon name="bell" size={16} />
        <span className="dot" />
      </button>

      <div className="avatar" style={{ cursor: 'pointer' }}>MK</div>
    </header>
  );
}

/* ============================================================
   Page Header
   ============================================================ */
function PageHeader({ title, sub, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

/* ============================================================
   Skeleton helpers
   ============================================================ */
function Skel({ w, h = 12, r = 4, style }) {
  return <span className="skel" style={{ display: 'inline-block', width: w, height: h, borderRadius: r, ...style }} />;
}

/* ============================================================
   Lang dot (small color swatch)
   ============================================================ */
const LANG_COLORS = {
  TypeScript: 'oklch(0.65 0.14 245)',
  JavaScript: 'oklch(0.82 0.15 90)',
  Python:     'oklch(0.68 0.13 220)',
  Go:         'oklch(0.72 0.13 195)',
  Rust:       'oklch(0.62 0.18 30)',
  Swift:      'oklch(0.68 0.18 30)',
};
function LangDot({ lang }) {
  return <span className="lang-dot" style={{ background: LANG_COLORS[lang] || 'var(--fg-faint)' }} />;
}

Object.assign(window, {
  Icon, SeverityBadge, StatusBadge,
  Sidebar, TopBar, PageHeader,
  Skel, LangDot, LANG_COLORS,
});
