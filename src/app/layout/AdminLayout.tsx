import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/app/layout/Sidebar';
import { Topbar } from '@/app/layout/Topbar';
import { Breadcrumbs } from '@/app/layout/Breadcrumbs';
import { CommandPalette } from '@/components/shared/CommandPalette';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const key = useMemo(() => location.pathname, [location.pathname]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-fade-in">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} onOpenMobile={() => setMobileOpen(true)} />
        <Breadcrumbs />
        <main key={key} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 animate-fade-in">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
