/* global React, Icon, SeverityBadge, StatusBadge, PageHeader, REPOS, PR_LIST */
const { useState: useStateC } = React;

/* ============================================================
   PR REVIEW DETAIL — Summary / Files changed / Suggestions
   ============================================================ */

const FILES = [
  {
    path: 'src/jobs/upload.ts',
    adds: 8, dels: 3,
    findings: { critical: 1, warning: 0, suggestion: 0, nitpick: 0 },
  },
  {
    path: 'src/jobs/queue.ts',
    adds: 14, dels: 6,
    findings: { critical: 0, warning: 1, suggestion: 1, nitpick: 0 },
  },
  {
    path: 'src/jobs/__tests__/upload.test.ts',
    adds: 42, dels: 0,
    findings: { critical: 0, warning: 0, suggestion: 0, nitpick: 1 },
  },
  {
    path: 'src/lib/retryPolicy.ts',
    adds: 18, dels: 4,
    findings: { critical: 0, warning: 1, suggestion: 1, nitpick: 1 },
  },
  {
    path: 'CHANGELOG.md',
    adds: 2, dels: 0,
    findings: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
  },
];

const SUGGESTIONS = [
  {
    id: 's1', severity: 'critical', file: 'src/jobs/upload.ts', line: 43,
    title: 'Don\'t swallow UploadAbortedError',
    body: <>The new <code>await retryUpload()</code> bubbles a rejected promise out of <code>flush()</code>. Its caller at <code>worker.ts:88</code> still has no <code>catch</code>, so a single transient 503 will kill the entire job runner. Wrap it, or escalate to the supervisor.</>,
    suggestion: `try {
  await this.retryUpload(this.queue);
} catch (err) {
  if (err instanceof UploadAbortedError) {
    this.supervisor.escalate(err);
    return;
  }
  throw err;
}`,
    confidence: 0.92,
  },
  {
    id: 's2', severity: 'warning', file: 'src/jobs/queue.ts', line: 118,
    title: '`inFlight` gauge not decremented on failure',
    body: <>If <code>retryUpload</code> throws, the catch logs and returns — but the <code>inFlight</code> gauge stays incremented. Over time this drifts the queue's self-reported pressure and trips backpressure prematurely.</>,
    suggestion: `} catch (err) {
  logger.warn('upload failed', { err });
  this.inFlight--;          //  ← decrement on failure
  return;
}`,
    confidence: 0.87,
  },
  {
    id: 's3', severity: 'warning', file: 'src/lib/retryPolicy.ts', line: 24,
    title: 'Backoff multiplier can overflow Number.MAX_SAFE_INTEGER',
    body: <>Past ~52 attempts the computed delay overflows safe integer range. Add a hard cap or switch to <code>BigInt</code>; the public retry budget allows up to 200 attempts.</>,
    suggestion: `const delay = Math.min(
  baseMs * Math.pow(2, attempt) + jitter(),
  MAX_BACKOFF_MS
);`,
    confidence: 0.81,
  },
  {
    id: 's4', severity: 'suggestion', file: 'src/jobs/queue.ts', line: 162,
    title: 'Extract computeBackoff into retryPolicy.ts',
    body: <>The webhook retry work next sprint will want the same jitter behavior. Tracked in <span className="mono">LIN-3812</span> — low priority but worth doing now to avoid duplication.</>,
    confidence: 0.74,
  },
  {
    id: 's5', severity: 'suggestion', file: 'src/lib/retryPolicy.ts', line: 41,
    title: 'Consider exposing the jitter strategy as a config option',
    body: <>Some callers (notifications fanout) want deterministic backoff for reproducible load tests. A <code>jitter: \'full\' | \'none\' | (attempt) =&gt; number</code> field would cover both cases without forking the helper.</>,
    confidence: 0.66,
  },
  {
    id: 's6', severity: 'nitpick', file: 'src/jobs/__tests__/upload.test.ts', line: 12,
    title: 'Test name doesn\'t match the assertion',
    body: <>The test is titled "drains on flush" but actually asserts on retry count. Renaming to "retries on transient failure" would match what it checks.</>,
    confidence: 0.58,
  },
  {
    id: 's7', severity: 'nitpick', file: 'src/lib/retryPolicy.ts', line: 8,
    title: 'Inconsistent quote style',
    body: <>The rest of the file uses single quotes; this import uses double. Project Prettier config enforces single.</>,
    confidence: 0.99,
  },
];

const SEVERITY_ORDER = ['critical', 'warning', 'suggestion', 'nitpick'];
const SEVERITY_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  suggestion: 'Suggestion',
  nitpick: 'Nitpick',
};

const VERDICT = 'changes'; // 'approved' | 'changes' | 'comments'

function PRDetailScreen({ repoId, prId, navigate }) {
  const repo = REPOS.find(r => r.id === repoId) || REPOS[0];
  const pr = PR_LIST.find(p => p.id === prId) || PR_LIST[0];
  const [tab, setTab] = useStateC('summary');
  const [activeFile, setActiveFile] = useStateC(FILES[0].path);
  const [jumpToLine, setJumpToLine] = useStateC(null);
  const [diffMode, setDiffMode] = useStateC('unified');

  const totals = SUGGESTIONS.reduce((acc, s) => {
    acc[s.severity] = (acc[s.severity] || 0) + 1;
    return acc;
  }, {});

  const jumpToContext = (file, line) => {
    setActiveFile(file);
    setJumpToLine({ file, line, key: Date.now() });
    setTab('files');
  };

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <PRHeaderCard pr={pr} repo={repo} />

      <div className="tabs pr-tabs">
        <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          <Icon name="bot" size={12} /> Summary
        </button>
        <button className={`tab ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
          <Icon name="file" size={12} /> Files changed <span className="count">{FILES.length}</span>
        </button>
        <button className={`tab ${tab === 'suggestions' ? 'active' : ''}`} onClick={() => setTab('suggestions')}>
          <Icon name="sparkles" size={12} /> Suggestions <span className="count">{SUGGESTIONS.length}</span>
        </button>
      </div>

      {tab === 'summary' && <SummaryTab pr={pr} totals={totals} jumpToContext={jumpToContext} />}
      {tab === 'files' && (
        <FilesChangedTab
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          jumpToLine={jumpToLine}
          diffMode={diffMode}
          setDiffMode={setDiffMode}
        />
      )}
      {tab === 'suggestions' && <SuggestionsTab jumpToContext={jumpToContext} />}
    </div>
  );
}

/* ============================================================
   PR HEADER CARD
   ============================================================ */
function PRHeaderCard({ pr, repo }) {
  return (
    <div className="pr-header-card">
      <div className="pr-header-top">
        <div className="pr-header-title-block">
          <div className="pr-header-title">
            {pr.title}
            <span className="pr-num-large mono">#{pr.id}</span>
          </div>
          <div className="pr-header-meta">
            <StatusBadge kind={pr.state === 'merged' ? 'accent' : pr.state === 'closed' ? 'critical' : 'success'}>
              {pr.state === 'open' ? 'Open' :
               pr.state === 'merged' ? 'Merged' :
               pr.state === 'closed' ? 'Closed' : 'Draft'}
            </StatusBadge>
            <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="avatar xs" style={{ width: 18, height: 18, fontSize: 9 }}>
                {pr.authorName.split(' ').map(s => s[0]).join('').slice(0,2)}
              </span>
              <span style={{ color: 'var(--fg)' }}>{pr.authorName}</span>
              wants to merge
            </span>
            <span className="badge mono"><Icon name="branch" size={11} /> {pr.branch}</span>
            <Icon name="arrowRight" size={11} className="faint" />
            <span className="badge mono"><Icon name="branch" size={11} /> main</span>
            <span className="faint">· opened {pr.opened}</span>
          </div>
        </div>
        <div className="pr-header-actions">
          <button className="btn"><Icon name="refresh" size={13} /> Re-run review</button>
          <button className="btn primary"><Icon name="open" size={13} /> View on GitHub</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 1 — SUMMARY
   ============================================================ */
function SummaryTab({ pr, totals, jumpToContext }) {
  const verdictConfig = {
    approved: { label: 'Approved', accent: 'success', icon: 'check', desc: 'No blocking issues found.' },
    changes:  { label: 'Needs changes', accent: 'warning', icon: 'sliders', desc: 'One critical and two warnings worth addressing before merge.' },
    comments: { label: 'Comments only', accent: 'info', icon: 'sparkles', desc: 'Suggestions and nits — nothing blocking.' },
  }[VERDICT];

  return (
    <div className="summary-tab">
      <div className={`verdict-card verdict-${verdictConfig.accent}`}>
        <div className="verdict-band" />
        <div className="verdict-icon">
          <Icon name={verdictConfig.icon} size={20} />
        </div>
        <div className="verdict-body">
          <div className="verdict-label-row">
            <h2 className="verdict-label">{verdictConfig.label}</h2>
            <span className="badge accent"><Icon name="sparkles" size={10} /> claude-3-opus</span>
            <span className="faint" style={{ marginLeft: 'auto', fontSize: 12 }}>
              finished in 47s · 12 minutes ago
            </span>
          </div>
          <p className="verdict-desc">{verdictConfig.desc}</p>
          <div className="severity-counts" style={{ margin: 0 }}>
            {SEVERITY_ORDER.map(s => totals[s] > 0 && (
              <SeverityBadge key={s} level={s} count={totals[s]} />
            ))}
            <span className="spacer" style={{ flex: 1 }} />
            <span className="badge mono"><Icon name="file" size={11} />{FILES.length} files</span>
            <span className="badge success mono">+{FILES.reduce((s, f) => s + f.adds, 0)}</span>
            <span className="badge critical mono">−{FILES.reduce((s, f) => s + f.dels, 0)}</span>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="sc-head">
            <Icon name="bot" size={15} className="muted" />
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
              wiring at the caller. Specifically, <code>flush()</code>'s only consumer in
              <code>worker.ts</code> doesn't have a catch for the now-bubbling
              <code>UploadAbortedError</code> — which is the blocking issue for merge.
            </p>
            <p>
              The <code>inFlight</code> gauge in the queue isn't decremented in the failure branch,
              so observability for queue pressure will drift over time. Tests for the partial
              failure case exist but don't assert metric state.
            </p>
            <p>
              Backoff jitter has been pulled into a shared helper — reusable for the upcoming
              webhook retry work next sprint. Nice cleanup.
            </p>
          </div>
        </div>

        <div className="summary-card">
          <div className="sc-head">
            <Icon name="zap" size={15} className="muted" />
            <div className="title">Key concerns</div>
          </div>
          <ul className="key-concerns">
            {SUGGESTIONS.filter(s => s.severity === 'critical' || s.severity === 'warning').map(s => (
              <li key={s.id}>
                <span className="kc-sev"><SeverityBadge level={s.severity} /></span>
                <div>
                  <div className="kc-title">{s.title}</div>
                  <div className="kc-loc mono" onClick={() => jumpToContext(s.file, s.line)}>
                    {s.file}:{s.line}
                    <Icon name="arrowRight" size={10} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="divider" />

          <div className="sc-head" style={{ marginBottom: 12 }}>
            <Icon name="check" size={15} className="muted" />
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

/* ============================================================
   TAB 2 — FILES CHANGED
   ============================================================ */
function FilesChangedTab({ activeFile, setActiveFile, jumpToLine, diffMode, setDiffMode }) {
  const file = FILES.find(f => f.path === activeFile) || FILES[0];

  return (
    <div className="files-tab">
      <FileTree files={FILES} active={activeFile} setActive={setActiveFile} />
      <div className="diff-pane">
        <div className="diff-pane-head">
          <div className="row" style={{ gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Icon name="file" size={14} className="muted" />
            <span className="mono" style={{ fontSize: 13 }}>{file.path}</span>
            <span className="badge success mono" style={{ marginLeft: 4 }}>+{file.adds}</span>
            <span className="badge critical mono">−{file.dels}</span>
          </div>
          <div className="seg">
            <button className={diffMode === 'unified' ? 'active' : ''} onClick={() => setDiffMode('unified')}>
              <Icon name="diff" size={11} /> Unified
            </button>
            <button className={diffMode === 'split' ? 'active' : ''} onClick={() => setDiffMode('split')}>
              <Icon name="panelLeft" size={11} /> Split
            </button>
          </div>
          <button className="btn sm"><Icon name="open" size={11} /> View file</button>
        </div>

        <FileDiff path={file.path} jumpToLine={jumpToLine} />
      </div>
    </div>
  );
}

function FileTree({ files, active, setActive }) {
  // Group by directory (simple split)
  const tree = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    let node = tree;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) {
        node[p] = { __file: f };
      } else {
        node[p] = node[p] || {};
        node = node[p];
      }
    });
  });

  return (
    <aside className="file-tree">
      <div className="file-tree-head">
        <span style={{ fontWeight: 500 }}>Files</span>
        <span className="badge mono" style={{ marginLeft: 'auto' }}>{files.length}</span>
      </div>
      <div className="file-tree-body">
        <TreeNode node={tree} depth={0} active={active} setActive={setActive} />
      </div>
    </aside>
  );
}

function TreeNode({ node, depth, active, setActive }) {
  const [open, setOpen] = useStateC(true);
  const entries = Object.entries(node);
  return (
    <>
      {entries.map(([name, val]) => {
        if (val.__file) {
          const f = val.__file;
          const totalFindings = (f.findings.critical + f.findings.warning + f.findings.suggestion + f.findings.nitpick);
          const isActive = active === f.path;
          return (
            <button
              key={name}
              className={`tree-row file ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => setActive(f.path)}
            >
              <Icon name="file" size={12} className="tree-ico" />
              <span className="tree-name">{name}</span>
              <span className="tree-stats">
                <span className="diff-add-num">+{f.adds}</span>
                <span className="diff-del-num">−{f.dels}</span>
              </span>
              {totalFindings > 0 && (
                <span className={`tree-badge ${f.findings.critical > 0 ? 'crit' : f.findings.warning > 0 ? 'warn' : 'note'}`}>
                  {totalFindings}
                </span>
              )}
            </button>
          );
        }
        return (
          <FolderRow
            key={name}
            name={name}
            depth={depth}
            child={val}
            active={active}
            setActive={setActive}
          />
        );
      })}
    </>
  );
}

function FolderRow({ name, depth, child, active, setActive }) {
  const [open, setOpen] = useStateC(true);
  return (
    <>
      <button
        className="tree-row folder"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => setOpen(o => !o)}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={11} className="tree-chev" />
        <Icon name="folder" size={12} className="tree-ico" />
        <span className="tree-name folder-name">{name}</span>
      </button>
      {open && <TreeNode node={child} depth={depth + 1} active={active} setActive={setActive} />}
    </>
  );
}

/* ============================================================
   File-specific diff bodies
   ============================================================ */
function FileDiff({ path, jumpToLine }) {
  const targetLine = jumpToLine && jumpToLine.file === path ? jumpToLine.line : null;

  if (path === 'src/jobs/upload.ts') {
    return (
      <DiffPanel>
        <DiffHunk label="@@ -40,7 +40,12 @@ class UploadWorker" />
        <Line ol={40} nl={40}>  <span className="tok-c">// drains the buffer in next tick</span></Line>
        <Line ol={41} nl={41}>  <span className="tok-c">// returns when the queue is empty</span></Line>
        <Line ol={42} nl={42}>  <span className="tok-k">async</span> <span className="tok-f">flush</span>() {'{'}</Line>
        <Line kind="del" ol={43}>    <span className="tok-f">retryUpload</span>(<span className="tok-k">this</span>.queue);</Line>
        <Line kind="add" nl={43} highlight={targetLine === 43}>    <span className="tok-k">await</span> <span className="tok-f">retryUpload</span>(<span className="tok-k">this</span>.queue);</Line>
        <Thread severity="critical" line={43} active={targetLine === 43}
          title="Don't swallow UploadAbortedError"
          body={<>The new <code>await retryUpload()</code> bubbles a rejected promise out of <code>flush()</code>. Its caller at <code>worker.ts:88</code> still has no <code>catch</code> — a single transient 503 will kill the entire job runner.</>}
          suggestion={`try {
  await this.retryUpload(this.queue);
} catch (err) {
  if (err instanceof UploadAbortedError) {
    this.supervisor.escalate(err);
    return;
  }
  throw err;
}`}
        />
        <Line ol={44} nl={44}>  {'}'}</Line>
        <Line ol={45} nl={45}></Line>
        <Line ol={46} nl={46}>  <span className="tok-k">async</span> <span className="tok-f">stop</span>() {'{'}</Line>
        <Line ol={47} nl={47}>    <span className="tok-k">await</span> <span className="tok-k">this</span>.<span className="tok-f">flush</span>();</Line>
        <Line ol={48} nl={48}>  {'}'}</Line>
      </DiffPanel>
    );
  }

  if (path === 'src/jobs/queue.ts') {
    return (
      <DiffPanel>
        <DiffHunk label="@@ -114,9 +114,17 @@ export class UploadQueue" />
        <Line ol={114} nl={114}>  <span className="tok-k">async</span> <span className="tok-f">push</span>(batch: <span className="tok-t">Batch</span>) {'{'}</Line>
        <Line ol={115} nl={115}>    <span className="tok-k">this</span>.inFlight++;</Line>
        <Line ol={116} nl={116}>    <span className="tok-k">try</span> {'{'}</Line>
        <Line ol={117} nl={117}>      <span className="tok-k">await</span> <span className="tok-f">retryUpload</span>(batch);</Line>
        <Line kind="add" nl={118} highlight={targetLine === 118}>    {'}'} <span className="tok-k">catch</span> (<span className="tok-p">err</span>) {'{'}</Line>
        <Line kind="add" nl={119}>      logger.<span className="tok-f">warn</span>(<span className="tok-s">'upload failed'</span>, {'{'} err {'}'});</Line>
        <Line kind="add" nl={120}>      <span className="tok-k">return</span>; <span className="tok-c">{`// inFlight stays incremented`}</span></Line>
        <Thread severity="warning" line={118} active={targetLine === 118}
          title="`inFlight` not decremented on the failure path"
          body={<>If <code>retryUpload</code> throws, the catch logs and returns — but the <code>inFlight</code> gauge stays incremented. Over time this drifts the queue's self-reported pressure and trips backpressure prematurely.</>}
          suggestion={`} catch (err) {
  logger.warn('upload failed', { err });
  this.inFlight--;          //  ← decrement on failure
  return;
}`}
        />
        <Line ol={118} nl={121}>    {'}'}</Line>
        <DiffHunk label="@@ -154,3 +162,6 @@" />
        <Line kind="add" nl={163}>  <span className="tok-k">function</span> <span className="tok-f">computeBackoff</span>(<span className="tok-p">attempt</span>: <span className="tok-t">number</span>): <span className="tok-t">number</span> {'{'} ... {'}'}</Line>
        <Thread severity="suggestion" line={163}
          title="Extract computeBackoff into retryPolicy.ts"
          body={<>The webhook retry work next sprint will want the same jitter behavior. Tracked in <span className="mono">LIN-3812</span>.</>}
        />
      </DiffPanel>
    );
  }

  if (path === 'src/jobs/__tests__/upload.test.ts') {
    return (
      <DiffPanel>
        <DiffHunk label="@@ -0,0 +1,42 @@" />
        <Line kind="add" nl={1}><span className="tok-k">import</span> {'{'} describe, it, expect {'}'} <span className="tok-k">from</span> <span className="tok-s">'vitest'</span>;</Line>
        <Line kind="add" nl={2}><span className="tok-k">import</span> {'{'} UploadWorker {'}'} <span className="tok-k">from</span> <span className="tok-s">'../upload'</span>;</Line>
        <Line kind="add" nl={3}></Line>
        <Line kind="add" nl={4}><span className="tok-f">describe</span>(<span className="tok-s">'UploadWorker'</span>, () =&gt; {'{'}</Line>
        <Line kind="add" nl={5}>  <span className="tok-f">it</span>(<span className="tok-s">'drains on flush'</span>, <span className="tok-k">async</span> () =&gt; {'{'}</Line>
        <Thread severity="nitpick" line={5}
          title="Test name doesn't match the assertion"
          body={<>This test is titled "drains on flush" but actually asserts on retry count. Renaming to "retries on transient failure" would match what it checks.</>}
        />
        <Line kind="add" nl={6}>    <span className="tok-k">const</span> worker = <span className="tok-k">new</span> <span className="tok-f">UploadWorker</span>();</Line>
        <Line kind="add" nl={7}>    <span className="tok-k">await</span> worker.<span className="tok-f">enqueue</span>([<span className="tok-s">'a'</span>, <span className="tok-s">'b'</span>, <span className="tok-s">'c'</span>]);</Line>
        <Line kind="add" nl={8}>    <span className="tok-k">await</span> worker.<span className="tok-f">flush</span>();</Line>
        <Line kind="add" nl={9}>    <span className="tok-f">expect</span>(worker.retryCount).<span className="tok-f">toBe</span>(<span className="tok-n">0</span>);</Line>
        <Line kind="add" nl={10}>  {'}'});</Line>
        <Line kind="add" nl={11}>{'}'});</Line>
      </DiffPanel>
    );
  }

  if (path === 'src/lib/retryPolicy.ts') {
    return (
      <DiffPanel>
        <DiffHunk label="@@ -1,4 +1,4 @@" />
        <Line kind="del" ol={1}><span className="tok-k">import</span> {'{'} sleep {'}'} <span className="tok-k">from</span> <span className="tok-s">{`"../util"`}</span>;</Line>
        <Line kind="add" nl={1}><span className="tok-k">import</span> {'{'} sleep {'}'} <span className="tok-k">from</span> <span className="tok-s">'../util'</span>;</Line>
        <Thread severity="nitpick" line={1}
          title="Inconsistent quote style"
          body={<>Rest of the file uses single quotes; Prettier config enforces single.</>}
        />
        <Line ol={2} nl={2}></Line>
        <DiffHunk label="@@ -20,3 +20,10 @@" />
        <Line ol={20} nl={20}><span className="tok-k">export function</span> <span className="tok-f">computeBackoff</span>(attempt: <span className="tok-t">number</span>) {'{'}</Line>
        <Line ol={21} nl={21}>  <span className="tok-k">const</span> baseMs = <span className="tok-n">100</span>;</Line>
        <Line ol={22} nl={22}>  <span className="tok-k">const</span> jitter = <span className="tok-f">Math.random</span>() * <span className="tok-n">50</span>;</Line>
        <Line kind="add" nl={24} highlight={targetLine === 24}>  <span className="tok-k">return</span> baseMs * <span className="tok-f">Math.pow</span>(<span className="tok-n">2</span>, attempt) + jitter;</Line>
        <Thread severity="warning" line={24} active={targetLine === 24}
          title="Backoff multiplier can overflow Number.MAX_SAFE_INTEGER"
          body={<>Past ~52 attempts the computed delay overflows safe-integer range. Add a hard cap.</>}
          suggestion={`return Math.min(
  baseMs * Math.pow(2, attempt) + jitter,
  MAX_BACKOFF_MS
);`}
        />
        <Line kind="add" nl={41}><span className="tok-k">export type</span> <span className="tok-t">Jitter</span> = <span className="tok-s">'full'</span> | <span className="tok-s">'none'</span>;</Line>
        <Thread severity="suggestion" line={41}
          title="Consider exposing the jitter strategy as a config option"
          body={<>Some callers (notifications fanout) want deterministic backoff for reproducible load tests.</>}
        />
      </DiffPanel>
    );
  }

  if (path === 'CHANGELOG.md') {
    return (
      <DiffPanel>
        <DiffHunk label="@@ -1,3 +1,5 @@" />
        <Line ol={1} nl={1}># Changelog</Line>
        <Line ol={2} nl={2}></Line>
        <Line kind="add" nl={3}>## v2.14.0</Line>
        <Line kind="add" nl={4}>- Fix: retry queue no longer swallows UploadAbortedError on flush.</Line>
      </DiffPanel>
    );
  }
}

function DiffPanel({ children }) {
  return <div className="diff diff-flat">{children}</div>;
}

function Line({ kind, ol, nl, highlight, children }) {
  return (
    <div className={`diff-line ${kind || ''} ${highlight ? 'targeted' : ''}`}>
      <span className="gut">{ol ?? ''}</span>
      <span className="gut">{nl ?? ''}</span>
      <span className="code">
        {kind === 'add' ? '+ ' : kind === 'del' ? '- ' : '  '}
        {children}
      </span>
    </div>
  );
}

function DiffHunk({ label }) {
  return (
    <div className="diff-line hunk">
      <span className="gut"></span>
      <span className="gut"></span>
      <span className="code">{label}</span>
    </div>
  );
}

/* ============================================================
   Threaded inline comment (GitHub-style)
   ============================================================ */
function Thread({ severity, line, title, body, suggestion, active }) {
  const [copied, setCopied] = useStateC(false);
  const copy = (e) => {
    e.stopPropagation();
    if (suggestion) {
      navigator.clipboard?.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };
  return (
    <div className={`thread sev-${severity} ${active ? 'targeted' : ''}`}>
      <div className="thread-head">
        <div className="thread-avatar"><Icon name="bot" size={12} /></div>
        <span className="thread-who">Reviewly</span>
        <SeverityBadge level={severity} />
        <span className="faint mono" style={{ fontSize: 11 }}>line {line}</span>
        <span style={{ flex: 1 }} />
        <span className="faint mono" style={{ fontSize: 11 }}>· conf 0.92</span>
        <button className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="moreH" size={12} /></button>
      </div>
      <div className="thread-title">{title}</div>
      <div className="thread-body">{body}</div>
      {suggestion && (
        <div className="suggestion-block">
          <div className="suggestion-head">
            <span className="badge accent"><Icon name="sparkles" size={10} /> Suggested change</span>
            <span style={{ flex: 1 }} />
            <button className="btn sm" onClick={copy}>
              <Icon name={copied ? 'check' : 'code'} size={11} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn sm primary"><Icon name="zap" size={11} /> Apply</button>
          </div>
          <pre className="suggestion-code"><code>{suggestion}</code></pre>
        </div>
      )}
      <div className="thread-actions">
        <button className="btn sm ghost"><Icon name="check" size={11} /> Resolve</button>
        <button className="btn sm ghost"><Icon name="x" size={11} /> Dismiss</button>
        <span style={{ flex: 1 }} />
        <button className="btn sm ghost">Reply</button>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 — SUGGESTIONS (flat list grouped by severity)
   ============================================================ */
function SuggestionsTab({ jumpToContext }) {
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
                  >
                    {s.file}<span className="faint">:</span><span style={{ color: 'var(--fg-muted)' }}>{s.line}</span>
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="faint mono" style={{ fontSize: 11 }}>conf {s.confidence.toFixed(2)}</span>
                </div>
                <h4 className="sugg-title">{s.title}</h4>
                <p className="sugg-body">{s.body}</p>
                {s.suggestion && (
                  <pre className="suggestion-code sugg-inline"><code>{s.suggestion}</code></pre>
                )}
                <div className="sugg-actions">
                  <button className="sugg-jump" onClick={() => jumpToContext(s.file, s.line)}>
                    Jump to context
                    <Icon name="arrowRight" size={11} />
                  </button>
                  <span style={{ flex: 1 }} />
                  <button className="btn sm ghost"><Icon name="check" size={11} /> Resolve</button>
                  <button className="btn sm ghost"><Icon name="x" size={11} /> Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

window.PRDetailScreen = PRDetailScreen;
