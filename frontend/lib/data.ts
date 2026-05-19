import type { Repo, PR, FileChange } from './types';

export const REPOS: Repo[] = [
  {
    id: 'api', name: 'api', org: 'linear-labs',
    desc: 'Public API gateway, billing, and webhooks for the Linear Labs platform.',
    lang: 'TypeScript', stars: 1280, openPRs: 14, reviewed: 312, findings: 47,
    lastReview: '2 minutes ago', updated: '4 minutes ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'web', name: 'web', org: 'linear-labs',
    desc: 'Customer-facing dashboard, marketing site, and authentication flows.',
    lang: 'TypeScript', stars: 842, openPRs: 9, reviewed: 528, findings: 32,
    lastReview: '8 minutes ago', updated: '12 minutes ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'pipelines', name: 'pipelines', org: 'linear-labs',
    desc: 'ETL jobs and warehouse sync for analytics, with retry semantics.',
    lang: 'Python', stars: 96, openPRs: 3, reviewed: 188, findings: 12,
    lastReview: '1 hour ago', updated: '2 hours ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'cli', name: 'cli', org: 'linear-labs',
    desc: 'Local developer toolchain — scaffolds, deploys, tails logs.',
    lang: 'Go', stars: 412, openPRs: 2, reviewed: 96, findings: 4,
    lastReview: '3 hours ago', updated: '5 hours ago',
    privacy: 'public', connected: true,
  },
  {
    id: 'edge', name: 'edge', org: 'linear-labs',
    desc: 'Edge worker runtime for low-latency rules — Rust + WASM.',
    lang: 'Rust', stars: 64, openPRs: 1, reviewed: 41, findings: 2,
    lastReview: '1 day ago', updated: '1 day ago',
    privacy: 'private', connected: true,
  },
  {
    id: 'docs', name: 'docs', org: 'linear-labs',
    desc: 'Public documentation site and SDK reference, rebuilt nightly.',
    lang: 'TypeScript', stars: 28, openPRs: 0, reviewed: 22, findings: 0,
    lastReview: '2 days ago', updated: '2 days ago',
    privacy: 'public', connected: true,
  },
  {
    id: 'experiments', name: 'experiments', org: 'linear-labs',
    desc: 'Quick prototypes and spike branches — not actively deployed.',
    lang: 'TypeScript', updated: '6 hours ago', privacy: 'private', connected: false,
  },
  {
    id: 'design-tokens', name: 'design-tokens', org: 'linear-labs',
    desc: 'Shared color, type, and spacing tokens — published to npm nightly.',
    lang: 'TypeScript', updated: '1 day ago', privacy: 'public', connected: false,
  },
  {
    id: 'mobile-ios', name: 'mobile-ios', org: 'linear-labs',
    desc: 'iOS application source — SwiftUI screens and shared models.',
    lang: 'Swift', updated: '3 days ago', privacy: 'private', connected: false,
  },
  {
    id: 'mobile-android', name: 'mobile-android', org: 'linear-labs',
    desc: 'Android application source — Kotlin, Jetpack Compose.',
    lang: 'Go', updated: '4 days ago', privacy: 'private', connected: false,
  },
  {
    id: 'support-bot', name: 'support-bot', org: 'linear-labs',
    desc: 'Slack-based help-center automations and triage routing.',
    lang: 'Python', updated: '1 week ago', privacy: 'private', connected: false,
  },
];

export const PR_LIST: PR[] = [
  {
    id: 482, title: 'Refactor upload retry queue to await flush', branch: 'feat/await-flush', base: 'main',
    author: 'jrowe', authorName: 'Jordan Rowe', state: 'open',
    sevCounts: { critical: 1, warning: 2, suggestion: 4, nitpick: 3 },
    reviewState: 'changes', reviewStatus: 'reviewed',
    summary: "Tight refactor — but the new await bubbles UploadAbortedError into a caller that doesn't catch it.",
    additions: 84, deletions: 32, files: 6, opened: '12 minutes ago', checks: 'pass',
  },
  {
    id: 481, title: 'Add billing webhook handler for failed renewals', branch: 'billing/failed-renewals', base: 'main',
    author: 'mira', authorName: 'Mira Kapoor', state: 'open',
    sevCounts: { critical: 0, warning: 0, suggestion: 2, nitpick: 1 },
    reviewState: 'approved', reviewStatus: 'reviewed',
    summary: 'Clean handler. Two suggestions around idempotency keys and one nit on log shape.',
    additions: 218, deletions: 14, files: 11, opened: '38 minutes ago', checks: 'pass',
  },
  {
    id: 480, title: 'Bump pg client to 8.11 and pin sub-deps', branch: 'chore/pg-bump', base: 'main',
    author: 'depbot', authorName: 'dependabot', state: 'open',
    sevCounts: { critical: 0, warning: 1, suggestion: 0, nitpick: 0 },
    reviewState: 'commented', reviewStatus: 'reviewing',
    summary: 'Reviewing changelog and breaking-change notes for 8.10 → 8.11…',
    additions: 12, deletions: 12, files: 2, opened: '2 hours ago', checks: 'pending',
  },
  {
    id: 479, title: 'Idempotent invoice generation under retry storms', branch: 'fix/invoice-idempotency', base: 'main',
    author: 'kgoh', authorName: 'Kenji Goh', state: 'open',
    sevCounts: { critical: 2, warning: 3, suggestion: 1, nitpick: 0 },
    reviewState: 'changes', reviewStatus: 'reviewed',
    summary: 'Two critical races around the locking primitive — needs a transaction wrap before merge.',
    additions: 312, deletions: 88, files: 14, opened: '4 hours ago', checks: 'fail',
  },
  {
    id: 478, title: 'Draft: rewrite payments adapter with typed errors', branch: 'draft/payments-typed', base: 'main',
    author: 'jrowe', authorName: 'Jordan Rowe', state: 'draft',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'pending', reviewStatus: 'failed',
    summary: 'Review skipped — draft PRs are not auto-reviewed. Mark ready for review to run.',
    additions: 0, deletions: 0, files: 0, opened: 'yesterday', checks: 'pending',
  },
  {
    id: 477, title: 'Inline preview for embeds in customer dashboard', branch: 'feat/inline-embed-preview', base: 'main',
    author: 'avale', authorName: 'Ana Valenti', state: 'open',
    sevCounts: { critical: 0, warning: 0, suggestion: 1, nitpick: 4 },
    reviewState: 'approved', reviewStatus: 'reviewed',
    summary: 'Solid feature work. One suggestion around the SSR fallback, four nits in markdown copy.',
    additions: 96, deletions: 22, files: 5, opened: 'yesterday', checks: 'pass',
  },
  {
    id: 476, title: 'Move retry budget to per-tenant config table', branch: 'feat/retry-budget', base: 'main',
    author: 'mira', authorName: 'Mira Kapoor', state: 'merged',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'approved', reviewStatus: 'reviewed',
    summary: 'Approved cleanly. Migration is reversible and the rollout plan is documented.',
    additions: 142, deletions: 38, files: 8, opened: '2 days ago', checks: 'pass',
  },
  {
    id: 475, title: 'Fix: invoice PDF rendering on Safari < 16', branch: 'fix/safari-pdf', base: 'main',
    author: 'kgoh', authorName: 'Kenji Goh', state: 'closed',
    sevCounts: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 },
    reviewState: 'pending', reviewStatus: 'reviewed',
    summary: 'Approved, but author closed in favor of #481 which subsumes the same fix.',
    additions: 18, deletions: 6, files: 2, opened: '3 days ago', checks: 'pass',
  },
  {
    id: 474, title: 'Telemetry: tag retries with parent span ID', branch: 'feat/telemetry-retry-spans', base: 'main',
    author: 'avale', authorName: 'Ana Valenti', state: 'merged',
    sevCounts: { critical: 0, warning: 1, suggestion: 2, nitpick: 1 },
    reviewState: 'approved', reviewStatus: 'reviewed',
    summary: 'Warning about span cardinality blowup if user IDs leak into tag values.',
    additions: 64, deletions: 8, files: 4, opened: '4 days ago', checks: 'pass',
  },
];

export const FILES: FileChange[] = [
  { path: 'src/jobs/upload.ts', adds: 8, dels: 3, findings: { critical: 1, warning: 0, suggestion: 0, nitpick: 0 } },
  { path: 'src/jobs/queue.ts', adds: 14, dels: 6, findings: { critical: 0, warning: 1, suggestion: 1, nitpick: 0 } },
  { path: 'src/jobs/__tests__/upload.test.ts', adds: 42, dels: 0, findings: { critical: 0, warning: 0, suggestion: 0, nitpick: 1 } },
  { path: 'src/lib/retryPolicy.ts', adds: 18, dels: 4, findings: { critical: 0, warning: 1, suggestion: 1, nitpick: 1 } },
  { path: 'CHANGELOG.md', adds: 2, dels: 0, findings: { critical: 0, warning: 0, suggestion: 0, nitpick: 0 } },
];

export const LANG_COLORS: Record<string, string> = {
  TypeScript: 'oklch(0.65 0.14 245)',
  JavaScript: 'oklch(0.82 0.15 90)',
  Python:     'oklch(0.68 0.13 220)',
  Go:         'oklch(0.72 0.13 195)',
  Rust:       'oklch(0.62 0.18 30)',
  Swift:      'oklch(0.68 0.18 30)',
};
