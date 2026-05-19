import type { Severity } from './types';

export interface Suggestion {
  id: string;
  severity: Severity;
  file: string;
  line: number;
  title: string;
  body: React.ReactNode;
  suggestion?: string;
  confidence: number;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 's1', severity: 'critical', file: 'src/jobs/upload.ts', line: 43,
    title: "Don't swallow UploadAbortedError",
    body: (
      <>
        The new <code>await retryUpload()</code> bubbles a rejected promise out of{' '}
        <code>flush()</code>. Its caller at <code>worker.ts:88</code> still has no{' '}
        <code>catch</code>, so a single transient 503 will kill the entire job runner.
        Wrap it, or escalate to the supervisor.
      </>
    ),
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
    body: (
      <>
        If <code>retryUpload</code> throws, the catch logs and returns — but the{' '}
        <code>inFlight</code> gauge stays incremented. Over time this drifts the queue&apos;s
        self-reported pressure and trips backpressure prematurely.
      </>
    ),
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
    body: (
      <>
        Past ~52 attempts the computed delay overflows safe integer range. Add a hard cap or
        switch to <code>BigInt</code>; the public retry budget allows up to 200 attempts.
      </>
    ),
    suggestion: `const delay = Math.min(
  baseMs * Math.pow(2, attempt) + jitter(),
  MAX_BACKOFF_MS
);`,
    confidence: 0.81,
  },
  {
    id: 's4', severity: 'suggestion', file: 'src/jobs/queue.ts', line: 162,
    title: 'Extract computeBackoff into retryPolicy.ts',
    body: (
      <>
        The webhook retry work next sprint will want the same jitter behavior. Tracked in{' '}
        <span className="mono">LIN-3812</span> — low priority but worth doing now to avoid
        duplication.
      </>
    ),
    confidence: 0.74,
  },
  {
    id: 's5', severity: 'suggestion', file: 'src/lib/retryPolicy.ts', line: 41,
    title: 'Consider exposing the jitter strategy as a config option',
    body: (
      <>
        Some callers (notifications fanout) want deterministic backoff for reproducible load
        tests. A <code>{'jitter: \'full\' | \'none\' | (attempt) => number'}</code> field would
        cover both cases without forking the helper.
      </>
    ),
    confidence: 0.66,
  },
  {
    id: 's6', severity: 'nitpick', file: 'src/jobs/__tests__/upload.test.ts', line: 12,
    title: "Test name doesn't match the assertion",
    body: (
      <>
        The test is titled &ldquo;drains on flush&rdquo; but actually asserts on retry count.
        Renaming to &ldquo;retries on transient failure&rdquo; would match what it checks.
      </>
    ),
    confidence: 0.58,
  },
  {
    id: 's7', severity: 'nitpick', file: 'src/lib/retryPolicy.ts', line: 8,
    title: 'Inconsistent quote style',
    body: (
      <>
        The rest of the file uses single quotes; this import uses double. Project Prettier
        config enforces single.
      </>
    ),
    confidence: 0.99,
  },
];

export const SEVERITY_ORDER: Severity[] = ['critical', 'warning', 'suggestion', 'nitpick'];
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  suggestion: 'Suggestion',
  nitpick: 'Nitpick',
};
