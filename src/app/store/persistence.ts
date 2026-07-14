import type { PrototypeState } from './types';
import { QUESTIONS } from '@/data/questions';
import { TESTS, TEST_SERIES } from '@/data/tests';
import { PACKAGES, ORDERS, COUPONS, ENTITLEMENTS } from '@/data/commerce';
import { STUDENTS, ADMIN_TEAM, SUPPORT_REQUESTS } from '@/data/users';
import { NOTIFICATIONS, AUDIT_LOGS } from '@/data/auxiliary';
import { ADMIN_ROLES } from '@/data/users';
import type { AuditEntry } from './types';

export const STORAGE_KEY = 'examtree-prototype-v1';
export const SCHEMA_VERSION = 1;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['all'],
  'Content Manager': [
    'content.view', 'questions.view', 'questions.create', 'questions.edit', 'questions.review',
    'questions.approve', 'questions.archive', 'generation.use', 'generation.manage',
    'taxonomy.manage', 'coverage.view', 'coverage.manage', 'challenges.view', 'challenges.manage',
    'imports.manage', 'review.approve', 'review.reject', 'review.comment',
    'tests.view', 'tests.create', 'tests.edit',
  ],
  'Question Author': [
    'content.view', 'questions.view', 'questions.create', 'questions.edit',
    'generation.use', 'studio.use',
  ],
  'Reviewer': [
    'content.view', 'questions.view', 'questions.review', 'questions.approve',
    'review.approve', 'review.reject', 'review.comment', 'challenges.view',
  ],
  'Test Manager': [
    'tests.view', 'tests.create', 'tests.edit', 'tests.qa', 'tests.publish',
    'series.manage', 'blueprints.manage', 'corrections.view', 'corrections.manage',
    'recalculation.manage', 'coverage.view', 'content.view',
  ],
  'Support Agent': [
    'support.view', 'support.manage', 'users.view', 'notifications.send',
    'challenges.view', 'challenges.manage',
  ],
  'Finance Admin': [
    'commerce.view', 'payments.manage', 'refunds.request', 'refunds.approve',
    'entitlements.manage', 'coupons.manage', 'packages.manage',
  ],
  'Marketing Admin': [
    'notifications.send', 'packages.manage', 'coupons.manage', 'branding.manage',
  ],
  'Analyst': [
    'analytics.view', 'reports.export', 'content.view', 'coverage.view',
    'challenges.view', 'corrections.view', 'audit.view',
  ],
  'Read-only Auditor': [
    'audit.view', 'analytics.view', 'content.view', 'coverage.view',
    'challenges.view', 'corrections.view', 'jobs.view', 'featureflags.view',
  ],
};

export const PROTOTYPE_ROLES: { name: string; permissions: string[] }[] = ADMIN_ROLES.map((name) => ({
  name,
  permissions: ROLE_PERMISSIONS[name] ?? [],
}));

export const ALL_PERMISSIONS = [
  // Content
  'content.view', 'questions.view', 'questions.create', 'questions.edit', 'questions.review',
  'questions.approve', 'questions.archive', 'generation.use', 'generation.manage',
  'taxonomy.manage', 'coverage.view', 'coverage.manage', 'challenges.view', 'challenges.manage',
  'imports.manage', 'studio.use', 'review.approve', 'review.reject', 'review.comment',
  // Tests
  'tests.view', 'tests.create', 'tests.edit', 'tests.qa', 'tests.publish',
  'corrections.view', 'corrections.manage', 'recalculation.manage',
  'series.manage', 'blueprints.manage',
  // Commerce
  'commerce.view', 'payments.manage', 'refunds.request', 'refunds.approve',
  'entitlements.manage', 'packages.manage', 'coupons.manage',
  // Users
  'users.view', 'users.manage', 'support.view', 'support.manage', 'notifications.send',
  // Operations
  'jobs.view', 'jobs.manage', 'featureflags.view', 'featureflags.manage',
  // System
  'analytics.view', 'reports.export', 'settings.manage', 'branding.manage',
  'audit.view', 'roles.manage',
];

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(perms: string[], permission: string): boolean {
  return perms.includes('all') || perms.includes(permission);
}

export function createDefaultState(): PrototypeState {
  return {
    version: SCHEMA_VERSION,
    questions: QUESTIONS.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) })),
    tests: TESTS.map((t) => ({ ...t })),
    testSeries: TEST_SERIES.map((ts) => ({ ...ts })),
    packages: PACKAGES.map((p) => ({ ...p, series: [...p.series] })),
    orders: ORDERS.map((o) => ({ ...o })),
    coupons: COUPONS.map((c) => ({ ...c, eligiblePackages: [...c.eligiblePackages] })),
    entitlements: ENTITLEMENTS.map((e) => ({ ...e })),
    students: STUDENTS.map((s) => ({ ...s })),
    adminTeam: ADMIN_TEAM.map((a) => ({ ...a, permissions: [...a.permissions] })),
    supportRequests: SUPPORT_REQUESTS.map((s) => ({ ...s })),
    notifications: NOTIFICATIONS.map((n) => ({ ...n })),
    auditLogs: AUDIT_LOGS.map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      admin: a.admin,
      role: 'Super Admin',
      action: a.action,
      entityType: 'audit' as const,
      entityId: a.entity,
      entityName: a.entity,
      oldValue: a.oldValue,
      newValue: a.newValue,
      reason: a.reason,
      sessionId: 'session-init',
      approvalStatus: a.approvalStatus,
    })),
    studentNotes: {},
    supportComments: {},
    generatedBatches: [],
    testDrafts: {},
    branding: {
      platformName: 'ExamTree',
      tagline: 'Master Your Exam Preparation',
      primaryColor: '160 84% 33%',
      darkModeDefault: false,
    },
    prototypeSettings: {
      simulateSlow: false,
      simulateFailure: false,
      showEmptyStates: false,
    },
    activeRole: 'Super Admin',
  };
}

export function loadState(): PrototypeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as PrototypeState;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== SCHEMA_VERSION) {
      return createDefaultState();
    }
    if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.tests)) {
      return createDefaultState();
    }
    return parsed;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: PrototypeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — silently ignore in prototype
  }
}

export function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

let auditCounter = 0;
export function generateAuditId(): string {
  auditCounter += 1;
  return `AL-${Date.now()}-${auditCounter}`;
}

let sessionId: string | null = null;
export function getSessionId(): string {
  if (!sessionId) {
    const stored = sessionStorage.getItem('examtree-session-id');
    if (stored) {
      sessionId = stored;
    } else {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('examtree-session-id', sessionId);
    }
  }
  return sessionId;
}

export function createAuditEntry(
  admin: string,
  role: string,
  action: string,
  entityType: AuditEntry['entityType'],
  entityId: string,
  entityName: string,
  oldValue: string,
  newValue: string,
  reason: string,
): AuditEntry {
  return {
    id: generateAuditId(),
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    admin,
    role,
    action,
    entityType,
    entityId,
    entityName,
    oldValue,
    newValue,
    reason,
    sessionId: getSessionId(),
    approvalStatus: 'Auto',
  };
}
