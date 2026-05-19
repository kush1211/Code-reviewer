'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useSidebar } from '@/contexts/sidebar-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ minWidth: 0 }}>
        <TopBar />
        {children}
      </main>
    </div>
  );
}
