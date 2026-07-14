import {
  LayoutDashboard, FileQuestion, Sparkles, ClipboardCheck, Network, Layers,
  Image as ImageIcon, FileText, ListChecks, Box, CalendarClock, ShoppingCart,
  Ticket, KeyRound, Users, ShieldCheck, LifeBuoy, Bell, TrendingUp, BarChart3,
  Activity, HeartPulse, Settings, Languages, Lock, Palette, ScrollText, Plug, Target,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem { label: string; path: string; icon: LucideIcon; badge?: string }
export interface NavGroup { id: string; label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview', label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'content', label: 'Content',
    items: [
      { label: 'Question Bank', path: '/content/questions', icon: FileQuestion, badge: '23' },
      { label: 'Question Studio', path: '/content/studio', icon: Sparkles },
      { label: 'Content Review', path: '/content/review', icon: ClipboardCheck, badge: '18' },
      { label: 'Coverage Planner', path: '/content/coverage', icon: Target },
      { label: 'Sections & Topics', path: '/content/taxonomy', icon: Network },
      { label: 'DI & Passage Sets', path: '/content/sets', icon: Layers },
      { label: 'Media Library', path: '/content/media', icon: ImageIcon },
    ],
  },
  {
    id: 'tests', label: 'Tests',
    items: [
      { label: 'Tests', path: '/tests', icon: FileText },
      { label: 'Test Builder', path: '/tests/builder', icon: ListChecks },
      { label: 'Test Series', path: '/tests/series', icon: Box },
      { label: 'Exam Blueprints', path: '/tests/blueprints', icon: CalendarClock },
      { label: 'Publishing Calendar', path: '/tests/calendar', icon: CalendarClock },
    ],
  },
  {
    id: 'commerce', label: 'Commerce',
    items: [
      { label: 'Packages', path: '/commerce/packages', icon: Box },
      { label: 'Orders & Payments', path: '/commerce/orders', icon: ShoppingCart },
      { label: 'Coupons', path: '/commerce/coupons', icon: Ticket },
      { label: 'Entitlements', path: '/commerce/entitlements', icon: KeyRound },
    ],
  },
  {
    id: 'users', label: 'Users',
    items: [
      { label: 'Students', path: '/users/students', icon: Users },
      { label: 'Admin Team', path: '/users/team', icon: ShieldCheck },
      { label: 'Support Requests', path: '/users/support', icon: LifeBuoy, badge: '7' },
      { label: 'Notifications', path: '/users/notifications', icon: Bell },
    ],
  },
  {
    id: 'analytics', label: 'Analytics',
    items: [
      { label: 'Business Analytics', path: '/analytics/business', icon: TrendingUp },
      { label: 'Test Analytics', path: '/analytics/tests', icon: BarChart3 },
      { label: 'Question Analytics', path: '/analytics/questions', icon: BarChart3 },
      { label: 'Content Quality', path: '/analytics/content-quality', icon: Activity },
      { label: 'System Health', path: '/analytics/system-health', icon: HeartPulse },
    ],
  },
  {
    id: 'settings', label: 'Settings',
    items: [
      { label: 'Exam Configuration', path: '/settings/exam-config', icon: Settings },
      { label: 'Languages', path: '/settings/languages', icon: Languages },
      { label: 'Roles & Permissions', path: '/settings/roles', icon: Lock },
      { label: 'Branding', path: '/settings/branding', icon: Palette },
      { label: 'Audit Logs', path: '/settings/audit-logs', icon: ScrollText },
      { label: 'Integrations', path: '/settings/integrations', icon: Plug },
    ],
  },
];

export const NAV_LOOKUP: Record<string, NavItem> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.path, i]))
);
