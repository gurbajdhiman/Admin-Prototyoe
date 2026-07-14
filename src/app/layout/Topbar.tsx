import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Sun, Moon, ChevronDown, User, Settings, LogOut, CheckCircle2, AlertTriangle, FileText, Check } from 'lucide-react';
import { useTheme } from '@/app/theme/ThemeProvider';
import { SidebarCollapseToggle } from '@/app/layout/Sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { PROTOTYPE_ROLES } from '@/app/store/persistence';
import { showToast } from '@/components/shared/toast';

interface TopbarProps { onToggleSidebar: () => void; onOpenMobile: () => void }

const NOTIFICATIONS = [
  { id: 1, icon: AlertTriangle, color: 'text-warning', title: '18 questions awaiting review', desc: 'SSC CGL batch assigned to you', time: '12m ago' },
  { id: 2, icon: FileText, color: 'text-info', title: 'SSC CGL Mock Test 7 published', desc: 'Now live for enrolled students', time: '1h ago' },
  { id: 3, icon: CheckCircle2, color: 'text-success', title: 'Payment reconciliation completed', desc: '47 orders verified for yesterday', time: '3h ago' },
];

export function Topbar({ onToggleSidebar, onOpenMobile }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { activeRole, setRole, activeAdminName, hasPermission } = usePrototypeStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = activeAdminName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSwitchRole = (roleName: string) => {
    if (roleName === activeRole) return;
    setRole(roleName);
    showToast.success('Role switched', `Now viewing as ${roleName}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button onClick={onOpenMobile} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <SidebarCollapseToggle collapsed={false} onToggle={onToggleSidebar} />

      <div className="relative ml-1 hidden flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <button type="button" onClick={() => { const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }); window.dispatchEvent(ev); }} className="h-9 w-full max-w-md cursor-text rounded-md border bg-muted/50 pl-9 pr-16 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/70">
          Search questions, tests, students, orders…
        </button>
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:block">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Badge variant="outline" className="hidden border-warning/40 bg-warning/10 text-warning sm:inline-flex">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-warning" /> Prototype Mode
        </Badge>

        <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen((o) => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right animate-scale-in rounded-lg border bg-popover p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm font-semibold">Notifications</span>
                <Badge variant="secondary" className="text-[10px]">3 new</Badge>
              </div>
              {NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex gap-3 rounded-md p-2.5 transition-colors hover:bg-accent">
                  <n.icon className={cn('mt-0.5 h-5 w-5 shrink-0', n.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{n.time}</p>
                  </div>
                </div>
              ))}
              <button className="mt-1 w-full rounded-md py-2 text-center text-xs font-medium text-primary hover:bg-primary/10">View all notifications</button>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-semibold">{activeAdminName}</p>
              <p className="text-[10px] text-muted-foreground">{activeRole}</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right animate-scale-in rounded-lg border bg-popover p-1.5 shadow-xl">
              <div className="border-b px-2 py-2">
                <p className="text-sm font-semibold">{activeAdminName}</p>
                <p className="text-xs text-muted-foreground">{activeRole}</p>
              </div>
              <button className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"><User className="h-4 w-4" /> My Profile</button>
              <button onClick={() => navigate('/settings/roles')} disabled={!hasPermission('settings.manage')} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"><Settings className="h-4 w-4" /> Account Settings</button>
              <div className="my-1 border-t" />
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prototype Role</p>
              </div>
              <div className="max-h-52 overflow-y-auto pr-0.5">
                {PROTOTYPE_ROLES.map((role) => {
          const isActive = role.name === activeRole;
          return (
                    <button
                      key={role.name}
                      onClick={() => handleSwitchRole(role.name)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent',
                        isActive && 'bg-accent font-medium'
                      )}
                    >
                      <span className="truncate text-left">{role.name}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <div className="my-1 border-t" />
              <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
