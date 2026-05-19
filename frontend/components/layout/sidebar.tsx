'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Bell, History, User, SlidersHorizontal,
  Settings, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { id: 'repos',     label: 'Repositories', href: '/repos', Icon: BookOpen, count: 12 },
  { id: 'inbox',     label: 'Inbox',  href: '/inbox',  Icon: Bell, count: 3 },
  { id: 'history',   label: 'History', href: '/history', Icon: History },
];

const TEAM_ITEMS = [
  { id: 'team',     label: 'Team',         href: '/team',     Icon: User },
  { id: 'rules',    label: 'Review rules', href: '/rules',    Icon: SlidersHorizontal },
  { id: 'settings', label: 'Settings',     href: '/settings', Icon: Settings },
];

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/repos') return pathname.startsWith('/repos');
    return pathname === href;
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
        <ChevronDown size={14} />
      </button>

      <div className="sidebar-section">
        {NAV_ITEMS.map(({ id, label, href, Icon, count }) => (
          <Link
            key={id}
            href={href}
            className={`nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={16} className="ico" />
            <span className="nav-label">{label}</span>
            {count != null && <span className="count">{count}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="nav-section-title">Workspace</div>
        {TEAM_ITEMS.map(({ id, label, href, Icon }) => (
          <Link
            key={id}
            href={href}
            className={`nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={16} className="ico" />
            <span className="nav-label">{label}</span>
          </Link>
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
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft  size={12} />}
      </button>
    </aside>
  );
}
