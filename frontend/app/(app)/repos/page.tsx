'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, RefreshCw, Check, BookOpen } from 'lucide-react';
import { REPOS } from '@/lib/data';
import { RepoRow } from '@/components/repos/repo-row';
import { RepoRowSkeleton } from '@/components/repos/repo-row-skeleton';

type FilterVal = 'all' | 'connected' | 'available';

const FILTER_LABEL: Record<FilterVal, string> = {
  all: 'All repositories',
  connected: 'Connected',
  available: 'Not connected',
};

export default function ReposPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterVal>('all');
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1300);
  };

  const connectedCount = REPOS.filter(r => r.connected).length;
  const availableCount = REPOS.filter(r => !r.connected).length;

  const filtered = useMemo(() => {
    let list = REPOS;
    if (filter === 'connected') list = list.filter(r => r.connected);
    if (filter === 'available') list = list.filter(r => !r.connected);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.org.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.lang.toLowerCase().includes(q)
      );
    }
    if (filter === 'all') list = [...list].sort((a, b) => Number(b.connected) - Number(a.connected));
    return list;
  }, [query, filter]);

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Your repositories</h1>
          <p className="page-sub">{REPOS.length} repositories visible · {connectedCount} connected for review</p>
        </div>
      </div>

      <div className="repo-toolbar">
        <div className="search inline-search">
          <Search size={14} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search repositories…"
          />
          {query && (
            <button
              className="icon-btn"
              style={{ width: 22, height: 22 }}
              onClick={() => setQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="dropdown-wrap">
          <button
            className={`btn ${filterOpen ? 'is-open' : ''}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <Filter size={12} />
            {FILTER_LABEL[filter]}
            <ChevronDown size={12} />
          </button>
          {filterOpen && (
            <>
              <div className="dropdown-scrim" onClick={() => setFilterOpen(false)} />
              <div className="dropdown-menu">
                {(
                  [
                    { v: 'all',       label: 'All repositories', count: REPOS.length },
                    { v: 'connected', label: 'Connected',        count: connectedCount },
                    { v: 'available', label: 'Not connected',    count: availableCount },
                  ] as { v: FilterVal; label: string; count: number }[]
                ).map(opt => (
                  <button
                    key={opt.v}
                    className={`dropdown-item ${filter === opt.v ? 'active' : ''}`}
                    onClick={() => { setFilter(opt.v); setFilterOpen(false); }}
                  >
                    <span className="check">{filter === opt.v && <Check size={12} />}</span>
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
          <RefreshCw size={14} />
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
            <div className="icon-wrap"><BookOpen size={20} /></div>
            <h3>No repositories found</h3>
            <p>
              {query
                ? `Nothing matches "${query}". Try a different search term, or refresh from GitHub.`
                : "GitHub didn't return any repositories for your account."}
            </p>
            <button className="btn primary" style={{ marginTop: 8 }} onClick={refresh}>
              <RefreshCw size={13} /> Refresh from GitHub
            </button>
          </div>
        )}

        {!loading && filtered.map(r => (
          <RepoRow key={r.id} repo={r} highlight={query} />
        ))}
      </div>
    </div>
  );
}
