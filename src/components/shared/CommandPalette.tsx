import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, CornerDownLeft, FileQuestion, Sparkles, ClipboardCheck,
  FileText, ListChecks, Users, ShoppingCart, LifeBuoy,
  Plus, Package, Flag, KeyRound, Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { NAV_GROUPS } from '@/app/nav/navigation';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useQuestions, useTests, useStudents, useOrders, usePackages, useGeneratedBatches, useSupportRequests } from '@/app/store/selectors';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  action: () => void;
  group: string;
  permission?: string;
}

interface EntityResult {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  action: () => void;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { hasPermission } = usePrototypeStore();
  const questions = useQuestions();
  const tests = useTests();
  const students = useStudents();
  const orders = useOrders();
  const packages = usePackages();
  const batches = useGeneratedBatches();
  const support = useSupportRequests();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navItems = useMemo(() => {
    const items: CommandItem[] = [];
    const navPermissions: Record<string, string> = {
      '/content/questions': 'content.view',
      '/content/studio': 'studio.use',
      '/content/review': 'content.view',
      '/content/coverage': 'coverage.view',
      '/tests': 'tests.view',
      '/tests/builder': 'tests.view',
      '/users/students': 'users.view',
      '/commerce/orders': 'commerce.view',
      '/users/support': 'support.view',
      '/settings/audit-logs': 'audit.view',
      '/settings/integrations': 'featureflags.view',
    };
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const perm = navPermissions[item.path];
        if (perm && !hasPermission(perm)) continue;
        items.push({
          id: `nav-${item.path}`,
          label: item.label,
          hint: group.label,
          icon: item.icon,
          group: 'Navigate',
          action: () => { navigate(item.path); setOpen(false); },
        });
      }
    }
    return items;
  }, [hasPermission, navigate]);

  const quickActions = useMemo(() => {
    const actions: CommandItem[] = [
      { id: 'qa-create-question', label: 'Create Question', icon: Plus, group: 'Quick Actions', permission: 'questions.create',
        action: () => { navigate('/content/studio'); setOpen(false); } },
      { id: 'qa-generate-batch', label: 'Generate Batch', icon: Zap, group: 'Quick Actions', permission: 'generation.use',
        action: () => { navigate('/content/studio'); setOpen(false); } },
      { id: 'qa-create-test', label: 'Create Test', icon: ListChecks, group: 'Quick Actions', permission: 'tests.create',
        action: () => { navigate('/tests/builder'); setOpen(false); } },
      { id: 'qa-review-queue', label: 'Open Review Queue', icon: ClipboardCheck, group: 'Quick Actions', permission: 'content.view',
        action: () => { navigate('/content/review'); setOpen(false); } },
      { id: 'qa-grant-entitlement', label: 'Grant Entitlement', icon: KeyRound, group: 'Quick Actions', permission: 'entitlements.manage',
        action: () => { navigate('/commerce/entitlements'); setOpen(false); } },
      { id: 'qa-open-jobs', label: 'Open Failed Jobs', icon: LifeBuoy, group: 'Quick Actions', permission: 'jobs.view',
        action: () => { navigate('/analytics/system-health'); setOpen(false); } },
      { id: 'qa-create-package', label: 'Create Package', icon: Package, group: 'Quick Actions', permission: 'packages.manage',
        action: () => { navigate('/commerce/packages'); setOpen(false); } },
      { id: 'qa-feature-flags', label: 'Open Feature Flags', icon: Flag, group: 'Quick Actions', permission: 'featureflags.view',
        action: () => { navigate('/settings/integrations'); setOpen(false); } },
    ];
    return actions.filter((a) => !a.permission || hasPermission(a.permission));
  }, [hasPermission, navigate]);

  const entityResults = useMemo<EntityResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: EntityResult[] = [];
    const limit = 5;

    for (const item of questions) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q) || item.stem.toLowerCase().includes(q)) {
        results.push({
          id: `q-${item.id}`, label: item.id, sublabel: item.stem.slice(0, 60),
          icon: FileQuestion, group: 'Questions',
          action: () => { navigate(`/content/questions/${item.id}`); setOpen(false); },
        });
      }
    }

    for (const item of tests) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)) {
        results.push({
          id: `t-${item.id}`, label: item.id, sublabel: item.name,
          icon: FileText, group: 'Tests',
          action: () => { navigate(`/tests/${item.id}`); setOpen(false); },
        });
      }
    }

    for (const item of students) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)) {
        results.push({
          id: `s-${item.id}`, label: item.name, sublabel: item.id,
          icon: Users, group: 'Students',
          action: () => { navigate(`/users/students/${item.id}`); setOpen(false); },
        });
      }
    }

    for (const item of orders) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q)) {
        results.push({
          id: `o-${item.id}`, label: item.id, sublabel: `${item.studentName} - Rs ${item.amount}`,
          icon: ShoppingCart, group: 'Orders',
          action: () => { navigate(`/commerce/orders/${item.id}`); setOpen(false); },
        });
      }
    }

    for (const item of packages) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)) {
        results.push({
          id: `p-${item.id}`, label: item.name, sublabel: item.id,
          icon: Package, group: 'Packages',
          action: () => { navigate(`/commerce/packages/${item.id}`); setOpen(false); },
        });
      }
    }

    for (const item of batches) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q)) {
        results.push({
          id: `b-${item.id}`, label: item.id, sublabel: `${item.exam} - ${item.count} questions`,
          icon: Sparkles, group: 'Generation Batches',
          action: () => { navigate('/content/studio'); setOpen(false); },
        });
      }
    }

    for (const item of support) {
      if (results.length >= limit) break;
      if (item.id.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)) {
        results.push({
          id: `sr-${item.id}`, label: item.id, sublabel: item.type,
          icon: LifeBuoy, group: 'Support',
          action: () => { navigate(`/users/support/${item.id}`); setOpen(false); },
        });
      }
    }

    return results;
  }, [query, questions, tests, students, orders, packages, batches, support, navigate]);

  const allItems = useMemo(() => {
    const nav = navItems.filter((i) =>
      !query || i.label.toLowerCase().includes(query.toLowerCase()) || i.hint?.toLowerCase().includes(query.toLowerCase())
    );
    const actions = quickActions.filter((i) =>
      !query || i.label.toLowerCase().includes(query.toLowerCase())
    );
    const entities = entityResults;
    return [...nav, ...actions, ...entities];
  }, [navItems, quickActions, entityResults, query]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => Math.min(p + 1, allItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); allItems[activeIndex]?.action(); }
  }, [allItems, activeIndex]);

  let currentGroup = '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, entities, or quick actions..."
            className="flex h-14 w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No results found</div>
          ) : (
            allItems.map((item, idx) => {
              const showGroup = item.group !== currentGroup;
              currentGroup = item.group;
              const active = idx === activeIndex;
              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.group}
                    </div>
                  )}
                  <button
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.action}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
                    )}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.label}</p>
                      {'sublabel' in item && item.sublabel && (
                        <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                      )}
                    </div>
                    {'hint' in item && item.hint && (
                      <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>
                    )}
                    {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border bg-muted px-1 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd> select</span>
          </div>
          <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Navigate to filtered lists</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
