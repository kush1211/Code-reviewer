export type Privacy = 'private' | 'public';
export type PRState = 'open' | 'draft' | 'merged' | 'closed';
export type ReviewStatus = 'reviewed' | 'reviewing' | 'failed' | 'pending';
export type ReviewState = 'approved' | 'changes' | 'commented' | 'pending';
export type Severity = 'critical' | 'warning' | 'suggestion' | 'nitpick';
export type Verdict = 'approved' | 'changes' | 'comments';

export interface Repo {
  id: string;
  name: string;
  org: string;
  desc: string;
  lang: string;
  stars?: number;
  openPRs?: number;
  reviewed?: number;
  findings?: number;
  lastReview?: string;
  updated: string;
  privacy: Privacy;
  connected: boolean;
}

export interface SevCounts {
  critical: number;
  warning: number;
  suggestion: number;
  nitpick: number;
}

export interface PR {
  id: number;
  title: string;
  branch: string;
  base: string;
  author: string;
  authorName: string;
  state: PRState;
  sevCounts: SevCounts;
  reviewState: ReviewState;
  reviewStatus: ReviewStatus;
  summary: string;
  additions: number;
  deletions: number;
  files: number;
  opened: string;
  checks: 'pass' | 'fail' | 'pending';
}

export interface FileChange {
  path: string;
  adds: number;
  dels: number;
  findings: { critical: number; warning: number; suggestion: number; nitpick: number };
}

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
