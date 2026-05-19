/* global React, ReactDOM, Sidebar, TopBar, LandingScreen, ReposScreen, RepoDetailScreen, PRDetailScreen, REPOS, PR_LIST, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakSelect, Icon */
const { useState, useEffect } = React;

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "comfortable",
  "showAnnotations": true,
  "startScreen": "pr"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);
  const [route, setRoute] = useState(
    tweaks.startScreen === 'repo' ? { screen: 'repo', repoId: 'api' } :
    tweaks.startScreen === 'pr'   ? { screen: 'pr', repoId: 'api', prId: 482 } :
    { screen: tweaks.startScreen || 'repos' }
  );
  const [collapsed, setCollapsed] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme || 'dark';
  }, [tweaks.theme]);

  // Apply density (root font-size shifts everything proportionally)
  useEffect(() => {
    const map = { compact: '12px', comfortable: '13px', spacious: '14px' };
    document.documentElement.style.setProperty('--t-base', map[tweaks.density] || '13px');
  }, [tweaks.density]);

  // Toggle annotation visibility via attribute (CSS targets [data-anno=hide])
  useEffect(() => {
    document.body.dataset.anno = tweaks.showAnnotations ? 'show' : 'hide';
  }, [tweaks.showAnnotations]);

  const navigate = (r) => setRoute(r);

  // Build crumbs
  const crumbs = (() => {
    if (route.screen === 'landing') return [];
    if (route.screen === 'dashboard') return [{ label: 'Dashboard' }];
    if (route.screen === 'repos') return [{ label: 'Repositories' }];
    if (route.screen === 'repo') {
      const repo = REPOS.find(r => r.id === route.repoId);
      return [
        { label: 'Repositories', to: { screen: 'repos' } },
        { label: `${repo?.org}/${repo?.name}` },
      ];
    }
    if (route.screen === 'pr') {
      const repo = REPOS.find(r => r.id === route.repoId);
      const pr = PR_LIST.find(p => p.id === route.prId);
      return [
        { label: 'Repositories', to: { screen: 'repos' } },
        { label: `${repo?.org}/${repo?.name}`, to: { screen: 'repo', repoId: route.repoId } },
        { label: `#${pr?.id}` },
      ];
    }
    if (route.screen === 'inbox') return [{ label: 'Inbox' }];
    if (route.screen === 'history') return [{ label: 'History' }];
    if (route.screen === 'team') return [{ label: 'Team' }];
    if (route.screen === 'rules') return [{ label: 'Review rules' }];
    if (route.screen === 'settings') return [{ label: 'Settings' }];
    return [];
  })();

  // Landing is full-bleed (no sidebar/topbar)
  if (route.screen === 'landing') {
    return (
      <>
        <div className="app full-bleed">
          <LandingScreen navigate={navigate} />
        </div>
        <TweaksUI tweaks={tweaks} setTweak={setTweak} navigate={navigate} />
      </>
    );
  }

  return (
    <>
      <div className={`app ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} route={route} navigate={navigate} />
        <main style={{ minWidth: 0 }}>
          <TopBar crumbs={crumbs} onCrumb={(to) => navigate(to)} />
          <ScreenRouter route={route} navigate={navigate} />
        </main>
      </div>
      <TweaksUI tweaks={tweaks} setTweak={setTweak} navigate={navigate} />
    </>
  );
}

function ScreenRouter({ route, navigate }) {
  switch (route.screen) {
    case 'repos':     return <ReposScreen navigate={navigate} />;
    case 'repo':      return <RepoDetailScreen repoId={route.repoId} navigate={navigate} />;
    case 'pr':        return <PRDetailScreen repoId={route.repoId} prId={route.prId} navigate={navigate} />;
    case 'dashboard': return <SimpleStub title="Dashboard" sub="Cross-repo review activity and queue health." />;
    case 'inbox':     return <InboxStub navigate={navigate} />;
    case 'history':   return <SimpleStub title="History" sub="Every review Reviewly has posted, across all repos." />;
    case 'team':      return <SimpleStub title="Team" sub="Members, roles, and review preferences." />;
    case 'rules':     return <SimpleStub title="Review rules" sub="Configure how Reviewly weighs severities and which paths it ignores." />;
    case 'settings':  return <SimpleStub title="Settings" sub="Workspace, integrations, and billing." />;
    default:          return <ReposScreen navigate={navigate} />;
  }
}

function SimpleStub({ title, sub }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{sub}</p>
        </div>
      </div>
      <div className="card">
        <div className="empty">
          <div className="icon-wrap"><Icon name="sparkles" size={20} /></div>
          <h3>Coming soon</h3>
          <p>This screen is part of phase 2. The Repositories, Repo detail, and PR review screens are the phase-1 deliverable — try those from the sidebar.</p>
        </div>
      </div>
    </div>
  );
}

function InboxStub({ navigate }) {
  const items = [
    { who: 'jrowe', what: 'opened PR #482', when: '12m', sev: 'critical' },
    { who: 'kgoh',  what: 'opened PR #479', when: '4h', sev: 'critical' },
    { who: 'depbot', what: 'opened PR #480', when: '2h', sev: 'warning' },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inbox</h1>
          <p className="page-sub">PRs that need your attention — surfaced by severity, not by time.</p>
        </div>
        <div className="page-actions">
          <button className="btn">Mark all read</button>
        </div>
      </div>
      <div className="card">
        {items.map((it, i) => (
          <div key={i} className="pr-row" onClick={() => navigate({ screen: 'pr', repoId: 'api', prId: 482 })}
            style={{ gridTemplateColumns: '22px 1fr auto auto' }}>
            <span className="pr-icon"><Icon name="pr" size={16} /></span>
            <div className="pr-title">
              <span className="t">{it.who} {it.what}</span>
              <span className="meta">Reviewly flagged a {it.sev} finding · linear-labs/api</span>
            </div>
            <span className={`badge ${it.sev}`}><span className="dot" /> {it.sev}</span>
            <span className="faint mono" style={{ fontSize: 11 }}>{it.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   TWEAKS PANEL
   ============================================================ */
function TweaksUI({ tweaks, setTweak, navigate }) {
  return (
    <TweaksPanel>
      <TweakSection label="Jump to screen">
        <TweakSelect
          label="Screen"
          value=""
          options={[
            { value: '', label: '— pick a screen —' },
            { value: 'landing', label: 'Landing / login' },
            { value: 'repos',   label: 'Repositories' },
            { value: 'repo',    label: 'Repo detail' },
            { value: 'pr',      label: 'PR review detail' },
            { value: 'inbox',   label: 'Inbox' },
          ]}
          onChange={(v) => {
            if (!v) return;
            if (v === 'repo') navigate({ screen: 'repo', repoId: 'api' });
            else if (v === 'pr') navigate({ screen: 'pr', repoId: 'api', prId: 482 });
            else navigate({ screen: v });
          }}
        />
      </TweakSection>

      <TweakSection label="Appearance">
        <TweakRadio
          label="Theme"
          value={tweaks.theme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfy' },
            { value: 'spacious', label: 'Roomy' },
          ]}
          onChange={(v) => setTweak('density', v)}
        />
      </TweakSection>

      <TweakSection label="Review detail">
        <TweakToggle
          label="Show AI annotations"
          value={tweaks.showAnnotations}
          onChange={(v) => setTweak('showAnnotations', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
