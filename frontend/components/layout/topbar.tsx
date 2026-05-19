'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { REPOS, PR_LIST } from '@/lib/data';
import { useTheme } from '@/contexts/theme-context';

export function TopBar() {
  const pathname = usePathname();
  const params = useParams<{ repoId?: string; prId?: string }>();
  const { theme, setTheme } = useTheme();

  const crumbs = buildCrumbs(pathname, params);

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <ChevronRight size={12} className="sep" />}
            {c.href
              ? <Link href={c.href} className="crumb">{c.label}</Link>
              : <span className="crumb current">{c.label}</span>}
          </span>
        ))}
      </div>

      <div className="search">
        <Search size={14} />
        <input placeholder="Search repos, PRs, files…" readOnly />
        <span className="kbd">⌘K</span>
      </div>

      <button className="icon-btn" title="Notifications">
        <Bell size={16} />
        <span className="dot" />
      </button>

      <button
        className="icon-btn"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        style={{ fontSize: 13 }}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>

      <div className="avatar" style={{ cursor: 'pointer' }}>MK</div>
    </header>
  );
}

function buildCrumbs(pathname: string, params: { repoId?: string; prId?: string }) {
  if (pathname === '/repos') return [{ label: 'Repositories' }];

  if (pathname.startsWith('/repos/') && params.repoId) {
    const repo = REPOS.find(r => r.id === params.repoId);
    const repoLabel = repo ? `${repo.org}/${repo.name}` : params.repoId;

    if (params.prId) {
      const prId = Number(params.prId);
      const pr = PR_LIST.find(p => p.id === prId);
      return [
        { label: 'Repositories', href: '/repos' },
        { label: repoLabel,      href: `/repos/${params.repoId}` },
        { label: pr ? `#${pr.id}` : `#${params.prId}` },
      ];
    }
    return [
      { label: 'Repositories', href: '/repos' },
      { label: repoLabel },
    ];
  }

  const labelMap: Record<string, string> = {
    '/dashboard': 'Dashboard', '/inbox': 'Inbox',
    '/history': 'History',    '/team': 'Team',
    '/rules': 'Review rules', '/settings': 'Settings',
  };
  if (labelMap[pathname]) return [{ label: labelMap[pathname] }];

  return [];
}
