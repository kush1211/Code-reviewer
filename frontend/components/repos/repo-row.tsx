'use client';

import { useRouter } from 'next/navigation';
import { Shield, BookOpen, Eye, Clock, GitPullRequest, Bot, Settings, Plus } from 'lucide-react';
import { LangDot } from '@/components/ui/lang-dot';
import type { Repo } from '@/lib/types';

function highlightText(text: string, q: string) {
  if (!q.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.trim().toLowerCase();
  const i = lower.indexOf(ql);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{text.slice(i, i + ql.length)}</mark>
      {text.slice(i + ql.length)}
    </>
  );
}

export function RepoRow({ repo, highlight = '' }: { repo: Repo; highlight?: string }) {
  const router = useRouter();

  const handleClick = () => {
    if (repo.connected) router.push(`/repos/${repo.id}`);
  };

  return (
    <div className="repo-row" onClick={handleClick} role="button">
      <div className="repo-row-icon">
        {repo.privacy === 'private'
          ? <Shield size={15} />
          : <BookOpen size={15} />}
      </div>

      <div className="repo-row-main">
        <div className="repo-row-name-line">
          <span className="repo-org">{repo.org}/</span>
          <span className="repo-name">{highlightText(repo.name, highlight)}</span>
          {repo.connected && (repo.findings ?? 0) > 0 && (
            <span className="badge accent" style={{ marginLeft: 6 }}>
              <Bot size={10} />
              {repo.findings} findings
            </span>
          )}
        </div>
        <p className="repo-desc">{repo.desc}</p>
        <div className="repo-meta">
          <span className="meta-chip"><LangDot lang={repo.lang} />{repo.lang}</span>
          <span className="meta-chip">
            {repo.privacy === 'private' ? <Shield size={11} /> : <Eye size={11} />}
            {repo.privacy === 'private' ? 'Private' : 'Public'}
          </span>
          <span className="meta-chip"><Clock size={11} />Updated {repo.updated}</span>
          {repo.connected && repo.openPRs != null && (
            <span className="meta-chip"><GitPullRequest size={11} />{repo.openPRs} open</span>
          )}
        </div>
      </div>

      <div className="repo-row-right" onClick={e => e.stopPropagation()}>
        {repo.connected ? (
          <>
            <span className="badge success"><span className="dot" /> Connected</span>
            <button className="btn sm"><Settings size={11} /> Manage</button>
          </>
        ) : (
          <>
            <span className="badge"><span className="dot" style={{ background: 'var(--fg-faint)' }} /> Not connected</span>
            <button className="btn sm primary"><Plus size={11} /> Connect</button>
          </>
        )}
      </div>
    </div>
  );
}
