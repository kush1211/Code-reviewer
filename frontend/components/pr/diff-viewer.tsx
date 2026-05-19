'use client';

import { Thread } from './thread';

interface JumpTarget { file: string; line: number; key?: number }

function DiffPanel({ children }: { children: React.ReactNode }) {
  return <div className="diff diff-flat">{children}</div>;
}

function DiffHunk({ label }: { label: string }) {
  return (
    <div className="diff-line hunk">
      <span className="gut" />
      <span className="gut" />
      <span className="code">{label}</span>
    </div>
  );
}

function Line({
  kind, ol, nl, highlight, children,
}: {
  kind?: 'add' | 'del';
  ol?: number;
  nl?: number;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`diff-line ${kind ?? ''} ${highlight ? 'targeted' : ''}`}>
      <span className="gut">{ol ?? ''}</span>
      <span className="gut">{nl ?? ''}</span>
      <span className="code">
        {kind === 'add' ? '+ ' : kind === 'del' ? '- ' : '  '}
        {children}
      </span>
    </div>
  );
}

function UploadDiff({ target }: { target: number | null }) {
  return (
    <DiffPanel>
      <DiffHunk label="@@ -40,7 +40,12 @@ class UploadWorker" />
      <Line ol={40} nl={40}>  <span className="tok-c">{'// drains the buffer in next tick'}</span></Line>
      <Line ol={41} nl={41}>  <span className="tok-c">{'// returns when the queue is empty'}</span></Line>
      <Line ol={42} nl={42}>  <span className="tok-k">async</span> <span className="tok-f">flush</span>() {'{'}</Line>
      <Line kind="del" ol={43}>    <span className="tok-f">retryUpload</span>(<span className="tok-k">this</span>.queue);</Line>
      <Line kind="add" nl={43} highlight={target === 43}>
        {'    '}<span className="tok-k">await</span> <span className="tok-f">retryUpload</span>(<span className="tok-k">this</span>.queue);
      </Line>
      <Thread
        severity="critical" line={43} active={target === 43} confidence={0.92}
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
      <Line ol={45} nl={45} />
      <Line ol={46} nl={46}>  <span className="tok-k">async</span> <span className="tok-f">stop</span>() {'{'}</Line>
      <Line ol={47} nl={47}>    <span className="tok-k">await</span> <span className="tok-k">this</span>.<span className="tok-f">flush</span>();</Line>
      <Line ol={48} nl={48}>  {'}'}</Line>
    </DiffPanel>
  );
}

function QueueDiff({ target }: { target: number | null }) {
  return (
    <DiffPanel>
      <DiffHunk label="@@ -114,9 +114,17 @@ export class UploadQueue" />
      <Line ol={114} nl={114}>  <span className="tok-k">async</span> <span className="tok-f">push</span>(batch: <span className="tok-t">Batch</span>) {'{'}</Line>
      <Line ol={115} nl={115}>    <span className="tok-k">this</span>.inFlight++;</Line>
      <Line ol={116} nl={116}>    <span className="tok-k">try</span> {'{'}</Line>
      <Line ol={117} nl={117}>      <span className="tok-k">await</span> <span className="tok-f">retryUpload</span>(batch);</Line>
      <Line kind="add" nl={118} highlight={target === 118}>
        {'    '}{'}'}  <span className="tok-k">catch</span> (<span className="tok-p">err</span>) {'{'}
      </Line>
      <Line kind="add" nl={119}>      logger.<span className="tok-f">warn</span>(<span className="tok-s">&apos;upload failed&apos;</span>, {'{'} err {'}'});</Line>
      <Line kind="add" nl={120}>      <span className="tok-k">return</span>; <span className="tok-c">{'// inFlight stays incremented'}</span></Line>
      <Thread
        severity="warning" line={118} active={target === 118} confidence={0.87}
        title="`inFlight` not decremented on the failure path"
        body={<>If <code>retryUpload</code> throws, the catch logs and returns — but the <code>inFlight</code> gauge stays incremented. Over time this drifts the queue&apos;s self-reported pressure and trips backpressure prematurely.</>}
        suggestion={`} catch (err) {
  logger.warn('upload failed', { err });
  this.inFlight--;          //  ← decrement on failure
  return;
}`}
      />
      <Line ol={118} nl={121}>    {'}'}</Line>
      <DiffHunk label="@@ -154,3 +162,6 @@" />
      <Line kind="add" nl={163}>  <span className="tok-k">function</span> <span className="tok-f">computeBackoff</span>(<span className="tok-p">attempt</span>: <span className="tok-t">number</span>): <span className="tok-t">number</span> {'{'} ... {'}'}</Line>
      <Thread
        severity="suggestion" line={163} confidence={0.74}
        title="Extract computeBackoff into retryPolicy.ts"
        body={<>The webhook retry work next sprint will want the same jitter behavior. Tracked in <span className="mono">LIN-3812</span>.</>}
      />
    </DiffPanel>
  );
}

function TestDiff() {
  return (
    <DiffPanel>
      <DiffHunk label="@@ -0,0 +1,42 @@" />
      <Line kind="add" nl={1}><span className="tok-k">import</span> {'{'} describe, it, expect {'}'} <span className="tok-k">from</span> <span className="tok-s">&apos;vitest&apos;</span>;</Line>
      <Line kind="add" nl={2}><span className="tok-k">import</span> {'{'} UploadWorker {'}'} <span className="tok-k">from</span> <span className="tok-s">&apos;../upload&apos;</span>;</Line>
      <Line kind="add" nl={3} />
      <Line kind="add" nl={4}><span className="tok-f">describe</span>(<span className="tok-s">&apos;UploadWorker&apos;</span>, () =&gt; {'{'}</Line>
      <Line kind="add" nl={5}>  <span className="tok-f">it</span>(<span className="tok-s">&apos;drains on flush&apos;</span>, <span className="tok-k">async</span> () =&gt; {'{'}</Line>
      <Thread
        severity="nitpick" line={5} confidence={0.58}
        title="Test name doesn't match the assertion"
        body={<>This test is titled &ldquo;drains on flush&rdquo; but actually asserts on retry count. Renaming to &ldquo;retries on transient failure&rdquo; would match what it checks.</>}
      />
      <Line kind="add" nl={6}>    <span className="tok-k">const</span> worker = <span className="tok-k">new</span> <span className="tok-f">UploadWorker</span>();</Line>
      <Line kind="add" nl={7}>    <span className="tok-k">await</span> worker.<span className="tok-f">enqueue</span>([<span className="tok-s">&apos;a&apos;</span>, <span className="tok-s">&apos;b&apos;</span>, <span className="tok-s">&apos;c&apos;</span>]);</Line>
      <Line kind="add" nl={8}>    <span className="tok-k">await</span> worker.<span className="tok-f">flush</span>();</Line>
      <Line kind="add" nl={9}>    <span className="tok-f">expect</span>(worker.retryCount).<span className="tok-f">toBe</span>(<span className="tok-n">0</span>);</Line>
      <Line kind="add" nl={10}>  {'}'});</Line>
      <Line kind="add" nl={11}>{'}'});</Line>
    </DiffPanel>
  );
}

function RetryPolicyDiff({ target }: { target: number | null }) {
  return (
    <DiffPanel>
      <DiffHunk label="@@ -1,4 +1,4 @@" />
      <Line kind="del" ol={1}><span className="tok-k">import</span> {'{'} sleep {'}'} <span className="tok-k">from</span> <span className="tok-s">&quot;../util&quot;</span>;</Line>
      <Line kind="add" nl={1}><span className="tok-k">import</span> {'{'} sleep {'}'} <span className="tok-k">from</span> <span className="tok-s">&apos;../util&apos;</span>;</Line>
      <Thread
        severity="nitpick" line={1} confidence={0.99}
        title="Inconsistent quote style"
        body={<>Rest of the file uses single quotes; Prettier config enforces single.</>}
      />
      <Line ol={2} nl={2} />
      <DiffHunk label="@@ -20,3 +20,10 @@" />
      <Line ol={20} nl={20}><span className="tok-k">export function</span> <span className="tok-f">computeBackoff</span>(attempt: <span className="tok-t">number</span>) {'{'}</Line>
      <Line ol={21} nl={21}>  <span className="tok-k">const</span> baseMs = <span className="tok-n">100</span>;</Line>
      <Line ol={22} nl={22}>  <span className="tok-k">const</span> jitter = <span className="tok-f">Math.random</span>() * <span className="tok-n">50</span>;</Line>
      <Line kind="add" nl={24} highlight={target === 24}>
        {'  '}<span className="tok-k">return</span> baseMs * <span className="tok-f">Math.pow</span>(<span className="tok-n">2</span>, attempt) + jitter;
      </Line>
      <Thread
        severity="warning" line={24} active={target === 24} confidence={0.81}
        title="Backoff multiplier can overflow Number.MAX_SAFE_INTEGER"
        body={<>Past ~52 attempts the computed delay overflows safe-integer range. Add a hard cap.</>}
        suggestion={`return Math.min(
  baseMs * Math.pow(2, attempt) + jitter,
  MAX_BACKOFF_MS
);`}
      />
      <Line kind="add" nl={41}><span className="tok-k">export type</span> <span className="tok-t">Jitter</span> = <span className="tok-s">&apos;full&apos;</span> | <span className="tok-s">&apos;none&apos;</span>;</Line>
      <Thread
        severity="suggestion" line={41} confidence={0.66}
        title="Consider exposing the jitter strategy as a config option"
        body={<>Some callers (notifications fanout) want deterministic backoff for reproducible load tests.</>}
      />
    </DiffPanel>
  );
}

function ChangelogDiff() {
  return (
    <DiffPanel>
      <DiffHunk label="@@ -1,3 +1,5 @@" />
      <Line ol={1} nl={1}># Changelog</Line>
      <Line ol={2} nl={2} />
      <Line kind="add" nl={3}>## v2.14.0</Line>
      <Line kind="add" nl={4}>- Fix: retry queue no longer swallows UploadAbortedError on flush.</Line>
    </DiffPanel>
  );
}

export function FileDiff({ path, jumpToLine }: { path: string; jumpToLine: JumpTarget | null }) {
  const target = jumpToLine && jumpToLine.file === path ? jumpToLine.line : null;

  if (path === 'src/jobs/upload.ts')               return <UploadDiff target={target} />;
  if (path === 'src/jobs/queue.ts')                return <QueueDiff target={target} />;
  if (path === 'src/jobs/__tests__/upload.test.ts') return <TestDiff />;
  if (path === 'src/lib/retryPolicy.ts')           return <RetryPolicyDiff target={target} />;
  if (path === 'CHANGELOG.md')                     return <ChangelogDiff />;
  return null;
}
