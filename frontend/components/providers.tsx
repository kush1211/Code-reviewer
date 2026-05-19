'use client';

import { ThemeProvider } from '@/contexts/theme-context';
import { SidebarProvider } from '@/contexts/sidebar-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </ThemeProvider>
  );
}
