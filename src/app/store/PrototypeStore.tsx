import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type {
  PrototypeState, Question, Test, Package, Order, Coupon, Entitlement,
  Student, SupportRequest, NotificationCampaign, AuditEntry, EntityType,
  StudentNote, SupportComment, GeneratedBatch, TestDraft, BrandingSettings, PrototypeSettings,
} from './types';
import {
  loadState, saveState, createDefaultState, createAuditEntry,
  getRolePermissions, hasPermission, STORAGE_KEY,
} from './persistence';

type Action =
  | { type: 'SET_STATE'; state: PrototypeState }
  | { type: 'RESET' }
  | { type: 'SET_ROLE'; role: string }
  | { type: 'SET_BRANDING'; branding: Partial<BrandingSettings> }
  | { type: 'SET_PROTOTYPE_SETTINGS'; settings: Partial<PrototypeSettings> }
  | { type: 'ADD_AUDIT'; entry: AuditEntry }
  | { type: 'UPDATE_QUESTION'; question: Question; audit?: AuditEntry }
  | { type: 'UPDATE_QUESTIONS'; questions: Question[]; audit?: AuditEntry }
  | { type: 'ADD_QUESTION'; question: Question; audit?: AuditEntry }
  | { type: 'UPDATE_TEST'; test: Test; audit?: AuditEntry }
  | { type: 'ADD_TEST'; test: Test; audit?: AuditEntry }
  | { type: 'UPDATE_PACKAGE'; pkg: Package; audit?: AuditEntry }
  | { type: 'UPDATE_ORDER'; order: Order; audit?: AuditEntry }
  | { type: 'ADD_COUPON'; coupon: Coupon; audit?: AuditEntry }
  | { type: 'UPDATE_COUPON'; coupon: Coupon; audit?: AuditEntry }
  | { type: 'UPDATE_ENTITLEMENT'; entitlement: Entitlement; audit?: AuditEntry }
  | { type: 'ADD_ENTITLEMENT'; entitlement: Entitlement; audit?: AuditEntry }
  | { type: 'UPDATE_STUDENT'; student: Student; audit?: AuditEntry }
  | { type: 'ADD_STUDENT_NOTE'; studentId: string; note: StudentNote }
  | { type: 'UPDATE_SUPPORT'; support: SupportRequest; audit?: AuditEntry }
  | { type: 'ADD_SUPPORT_COMMENT'; supportId: string; comment: SupportComment }
  | { type: 'UPDATE_NOTIFICATION'; notification: NotificationCampaign; audit?: AuditEntry }
  | { type: 'ADD_GENERATED_BATCH'; batch: GeneratedBatch; audit?: AuditEntry }
  | { type: 'UPDATE_GENERATED_BATCH'; batch: GeneratedBatch }
  | { type: 'SAVE_TEST_DRAFT'; key: string; draft: TestDraft }
  | { type: 'DELETE_TEST_DRAFT'; key: string };

function reducer(state: PrototypeState, action: Action): PrototypeState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state;

    case 'RESET':
      return createDefaultState();

    case 'SET_ROLE':
      return { ...state, activeRole: action.role };

    case 'SET_BRANDING':
      return { ...state, branding: { ...state.branding, ...action.branding } };

    case 'SET_PROTOTYPE_SETTINGS':
      return { ...state, prototypeSettings: { ...state.prototypeSettings, ...action.settings } };

    case 'ADD_AUDIT': {
      if (state.auditLogs.some((a) => a.id === action.entry.id)) return state;
      return { ...state, auditLogs: [action.entry, ...state.auditLogs] };
    }

    case 'UPDATE_QUESTION': {
      const exists = state.questions.some((q) => q.id === action.question.id);
      const questions = exists
        ? state.questions.map((q) => (q.id === action.question.id ? action.question : q))
        : [...state.questions, action.question];
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, questions, auditLogs };
    }

    case 'UPDATE_QUESTIONS': {
      const map = new Map(state.questions.map((q) => [q.id, q]));
      for (const uq of action.questions) map.set(uq.id, uq);
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, questions: Array.from(map.values()), auditLogs };
    }

    case 'ADD_QUESTION': {
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, questions: [action.question, ...state.questions], auditLogs };
    }

    case 'UPDATE_TEST': {
      const tests = state.tests.map((t) => (t.id === action.test.id ? action.test : t));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, tests, auditLogs };
    }

    case 'ADD_TEST': {
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, tests: [action.test, ...state.tests], auditLogs };
    }

    case 'UPDATE_PACKAGE': {
      const packages = state.packages.map((p) => (p.id === action.pkg.id ? action.pkg : p));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, packages, auditLogs };
    }

    case 'UPDATE_ORDER': {
      const orders = state.orders.map((o) => (o.id === action.order.id ? action.order : o));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, orders, auditLogs };
    }

    case 'ADD_COUPON': {
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, coupons: [action.coupon, ...state.coupons], auditLogs };
    }

    case 'UPDATE_COUPON': {
      const coupons = state.coupons.map((c) => (c.id === action.coupon.id ? action.coupon : c));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, coupons, auditLogs };
    }

    case 'UPDATE_ENTITLEMENT': {
      const entitlements = state.entitlements.map((e) => (e.id === action.entitlement.id ? action.entitlement : e));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, entitlements, auditLogs };
    }

    case 'ADD_ENTITLEMENT': {
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, entitlements: [action.entitlement, ...state.entitlements], auditLogs };
    }

    case 'UPDATE_STUDENT': {
      const students = state.students.map((s) => (s.id === action.student.id ? action.student : s));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, students, auditLogs };
    }

    case 'ADD_STUDENT_NOTE':
      return {
        ...state,
        studentNotes: {
          ...state.studentNotes,
          [action.studentId]: [...(state.studentNotes[action.studentId] ?? []), action.note],
        },
      };

    case 'UPDATE_SUPPORT': {
      const supportRequests = state.supportRequests.map((s) => (s.id === action.support.id ? action.support : s));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, supportRequests, auditLogs };
    }

    case 'ADD_SUPPORT_COMMENT':
      return {
        ...state,
        supportComments: {
          ...state.supportComments,
          [action.supportId]: [...(state.supportComments[action.supportId] ?? []), action.comment],
        },
      };

    case 'UPDATE_NOTIFICATION': {
      const notifications = state.notifications.map((n) => (n.id === action.notification.id ? action.notification : n));
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, notifications, auditLogs };
    }

    case 'ADD_GENERATED_BATCH': {
      const auditLogs = action.audit ? [action.audit, ...state.auditLogs] : state.auditLogs;
      return { ...state, generatedBatches: [action.batch, ...state.generatedBatches], auditLogs };
    }

    case 'UPDATE_GENERATED_BATCH': {
      const generatedBatches = state.generatedBatches.map((b) => (b.id === action.batch.id ? action.batch : b));
      return { ...state, generatedBatches };
    }

    case 'SAVE_TEST_DRAFT':
      return {
        ...state,
        testDrafts: { ...state.testDrafts, [action.key]: { ...action.draft, lastSaved: new Date().toISOString() } },
      };

    case 'DELETE_TEST_DRAFT': {
      const drafts = { ...state.testDrafts };
      delete drafts[action.key];
      return { ...state, testDrafts: drafts };
    }

    default:
      return state;
  }
}

interface StoreContextValue {
  state: PrototypeState;
  dispatch: React.Dispatch<Action>;
  activeRole: string;
  activePermissions: string[];
  activeAdminName: string;
  hasPermission: (permission: string) => boolean;
  audit: (action: string, entityType: EntityType, entityId: string, entityName: string, oldValue: string, newValue: string, reason: string) => AuditEntry;
  resetData: () => void;
  setRole: (role: string) => void;
  setBranding: (branding: Partial<BrandingSettings>) => void;
  setPrototypeSettings: (settings: Partial<PrototypeSettings>) => void;
  saveTestDraft: (key: string, draft: TestDraft) => void;
  deleteTestDraft: (key: string) => void;
  getTestDraft: (key: string) => TestDraft | undefined;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const ROLE_ADMIN_MAP: Record<string, string> = {
  'Super Admin': 'Ravneet Thind',
  'Content Manager': 'Harpreet Kaur',
  'Question Author': 'Arjun Mehta',
  'Reviewer': 'Simran Singh',
  'Test Manager': 'Manpreet Gill',
  'Support Agent': 'Karan Bedi',
  'Finance Admin': 'Deepak Sharma',
  'Marketing Admin': 'Neha Verma',
  'Analyst': 'Rohit Khanna',
  'Read-only Auditor': 'Anjali Bansal',
};

export function PrototypeStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeRole = state.activeRole;
  const activePermissions = useMemo(() => getRolePermissions(activeRole), [activeRole]);
  const activeAdminName = ROLE_ADMIN_MAP[activeRole] ?? 'Prototype Admin';

  const audit = useCallback(
    (action: string, entityType: EntityType, entityId: string, entityName: string, oldValue: string, newValue: string, reason: string): AuditEntry => {
      const entry = createAuditEntry(activeAdminName, activeRole, action, entityType, entityId, entityName, oldValue, newValue, reason);
      dispatch({ type: 'ADD_AUDIT', entry });
      return entry;
    },
    [activeAdminName, activeRole],
  );

  const resetData = useCallback(() => {
    const reason = 'Prototype data reset to defaults';
    dispatch({ type: 'RESET' });
    const entry = createAuditEntry(activeAdminName, activeRole, 'DATA_RESET', 'audit' as EntityType, STORAGE_KEY, 'Prototype Data', 'modified', 'default', reason);
    setTimeout(() => dispatch({ type: 'ADD_AUDIT', entry }), 0);
  }, [activeAdminName, activeRole]);

  const setRole = useCallback((role: string) => {
    dispatch({ type: 'SET_ROLE', role });
  }, []);

  const setBranding = useCallback((branding: Partial<BrandingSettings>) => {
    dispatch({ type: 'SET_BRANDING', branding });
  }, []);

  const setPrototypeSettings = useCallback((settings: Partial<PrototypeSettings>) => {
    dispatch({ type: 'SET_PROTOTYPE_SETTINGS', settings });
  }, []);

  const saveTestDraft = useCallback((key: string, draft: TestDraft) => {
    dispatch({ type: 'SAVE_TEST_DRAFT', key, draft });
  }, []);

  const deleteTestDraft = useCallback((key: string) => {
    dispatch({ type: 'DELETE_TEST_DRAFT', key });
  }, []);

  const getTestDraft = useCallback((key: string) => state.testDrafts[key], [state.testDrafts]);

  const checkPermission = useCallback((permission: string) => hasPermission(activePermissions, permission), [activePermissions]);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      dispatch,
      activeRole,
      activePermissions,
      activeAdminName,
      hasPermission: checkPermission,
      audit,
      resetData,
      setRole,
      setBranding,
      setPrototypeSettings,
      saveTestDraft,
      deleteTestDraft,
      getTestDraft,
    }),
    [state, activeRole, activePermissions, activeAdminName, checkPermission, audit, resetData, setRole, setBranding, setPrototypeSettings, saveTestDraft, deleteTestDraft, getTestDraft],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePrototypeStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('usePrototypeStore must be used within PrototypeStoreProvider');
  return ctx;
}
