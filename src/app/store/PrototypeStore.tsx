import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type {
  PrototypeState, Question, Test, Package, Order, Coupon, Entitlement,
  Student, SupportRequest, NotificationCampaign, AuditEntry, EntityType,
  StudentNote, SupportComment, GeneratedBatch, TestDraft, BrandingSettings, PrototypeSettings,
  SavedView, QuestionVersion, SimilarityResult, GenerationRecipe, ReviewComment,
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
  | { type: 'DELETE_TEST_DRAFT'; key: string }
  | { type: 'ADD_SAVED_VIEW'; view: SavedView; audit?: AuditEntry }
  | { type: 'UPDATE_SAVED_VIEW'; view: SavedView; audit?: AuditEntry }
  | { type: 'DELETE_SAVED_VIEW'; id: string; audit?: AuditEntry }
  | { type: 'SET_DEFAULT_SAVED_VIEW'; page: string; id: string; audit?: AuditEntry }
  | { type: 'ADD_QUESTION_VERSION'; questionId: string; version: QuestionVersion; audit?: AuditEntry }
  | { type: 'RESTORE_QUESTION_VERSION'; questionId: string; versionId: string; audit?: AuditEntry }
  | { type: 'SET_SIMILARITY_RESULTS'; results: SimilarityResult[]; audit?: AuditEntry }
  | { type: 'UPDATE_SIMILARITY_RESULT'; result: SimilarityResult; audit?: AuditEntry }
  | { type: 'ADD_RECIPE'; recipe: GenerationRecipe; audit?: AuditEntry }
  | { type: 'UPDATE_RECIPE'; recipe: GenerationRecipe; audit?: AuditEntry }
  | { type: 'DELETE_RECIPE'; id: string; audit?: AuditEntry }
  | { type: 'ADD_REVIEW_COMMENT'; questionId: string; comment: ReviewComment }
  | { type: 'SET_BATCH_STATUS'; batchId: string; status: GeneratedBatch['status']; audit?: AuditEntry };

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

    case 'ADD_SAVED_VIEW': {
      const views = action.view.isDefault
        ? state.savedViews.map((v) => v.page === action.view.page ? { ...v, isDefault: false } : v)
        : state.savedViews;
      return { ...state, savedViews: [...views, action.view] };
    }

    case 'UPDATE_SAVED_VIEW': {
      const savedViews = state.savedViews.map((v) => v.id === action.view.id ? action.view : v);
      return { ...state, savedViews };
    }

    case 'DELETE_SAVED_VIEW': {
      const savedViews = state.savedViews.filter((v) => v.id !== action.id);
      return { ...state, savedViews };
    }

    case 'SET_DEFAULT_SAVED_VIEW': {
      const savedViews = state.savedViews.map((v) =>
        v.page === action.page ? { ...v, isDefault: v.id === action.id } : v
      );
      return { ...state, savedViews };
    }

    case 'ADD_QUESTION_VERSION': {
      const existing = state.questionVersions[action.questionId] ?? [];
      const versions = [action.version, ...existing];
      return { ...state, questionVersions: { ...state.questionVersions, [action.questionId]: versions } };
    }

    case 'RESTORE_QUESTION_VERSION': {
      const versions = state.questionVersions[action.questionId] ?? [];
      const target = versions.find((v) => v.id === action.versionId);
      if (!target) return state;
      const questions = state.questions.map((q) =>
        q.id === action.questionId ? { ...target.snapshot, updatedAt: new Date().toISOString().slice(0, 10) } : q
      );
      return { ...state, questions };
    }

    case 'SET_SIMILARITY_RESULTS': {
      return { ...state, similarityResults: action.results };
    }

    case 'UPDATE_SIMILARITY_RESULT': {
      const similarityResults = state.similarityResults.map((r) =>
        r.id === action.result.id ? action.result : r
      );
      return { ...state, similarityResults };
    }

    case 'ADD_RECIPE': {
      return { ...state, generationRecipes: [action.recipe, ...state.generationRecipes] };
    }

    case 'UPDATE_RECIPE': {
      const generationRecipes = state.generationRecipes.map((r) =>
        r.id === action.recipe.id ? action.recipe : r
      );
      return { ...state, generationRecipes };
    }

    case 'DELETE_RECIPE': {
      const generationRecipes = state.generationRecipes.filter((r) => r.id !== action.id);
      return { ...state, generationRecipes };
    }

    case 'ADD_REVIEW_COMMENT':
      return {
        ...state,
        reviewComments: {
          ...state.reviewComments,
          [action.questionId]: [...(state.reviewComments[action.questionId] ?? []), action.comment],
        },
      };

    case 'SET_BATCH_STATUS': {
      const generatedBatches = state.generatedBatches.map((b) =>
        b.id === action.batchId ? { ...b, status: action.status } : b
      );
      return { ...state, generatedBatches };
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
  addSavedView: (view: SavedView) => void;
  updateSavedView: (view: SavedView) => void;
  deleteSavedView: (id: string) => void;
  setDefaultSavedView: (page: string, id: string) => void;
  addQuestionVersion: (questionId: string, version: QuestionVersion) => void;
  restoreQuestionVersion: (questionId: string, versionId: string) => void;
  setSimilarityResults: (results: SimilarityResult[]) => void;
  updateSimilarityResult: (result: SimilarityResult) => void;
  addRecipe: (recipe: GenerationRecipe) => void;
  updateRecipe: (recipe: GenerationRecipe) => void;
  deleteRecipe: (id: string) => void;
  addReviewComment: (questionId: string, comment: ReviewComment) => void;
  setBatchStatus: (batchId: string, status: GeneratedBatch['status']) => void;
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

  const addSavedView = useCallback((view: SavedView) => {
    const entry = audit('SAVED_VIEW_CREATED', 'audit' as EntityType, view.id, view.name, '', view.name, `Saved view created for ${view.page}`);
    dispatch({ type: 'ADD_SAVED_VIEW', view, audit: entry });
  }, [audit]);

  const updateSavedView = useCallback((view: SavedView) => {
    const entry = audit('SAVED_VIEW_UPDATED', 'audit' as EntityType, view.id, view.name, '', view.name, `Saved view updated`);
    dispatch({ type: 'UPDATE_SAVED_VIEW', view, audit: entry });
  }, [audit]);

  const deleteSavedView = useCallback((id: string) => {
    const entry = audit('SAVED_VIEW_DELETED', 'audit' as EntityType, id, id, '', '', `Saved view deleted`);
    dispatch({ type: 'DELETE_SAVED_VIEW', id, audit: entry });
  }, [audit]);

  const setDefaultSavedView = useCallback((page: string, id: string) => {
    const entry = audit('SAVED_VIEW_DEFAULT', 'audit' as EntityType, id, page, '', id, `Default saved view set for ${page}`);
    dispatch({ type: 'SET_DEFAULT_SAVED_VIEW', page, id, audit: entry });
  }, [audit]);

  const addQuestionVersion = useCallback((questionId: string, version: QuestionVersion) => {
    const entry = audit('VERSION_CREATED', 'question', questionId, `v${version.versionNumber}`, '', `v${version.versionNumber}`, `Version ${version.versionNumber} created for ${questionId}`);
    dispatch({ type: 'ADD_QUESTION_VERSION', questionId, version, audit: entry });
  }, [audit]);

  const restoreQuestionVersion = useCallback((questionId: string, versionId: string) => {
    const entry = audit('VERSION_RESTORED', 'question', questionId, versionId, '', versionId, `Version restored for ${questionId}`);
    dispatch({ type: 'RESTORE_QUESTION_VERSION', questionId, versionId, audit: entry });
  }, [audit]);

  const setSimilarityResults = useCallback((results: SimilarityResult[]) => {
    dispatch({ type: 'SET_SIMILARITY_RESULTS', results });
  }, []);

  const updateSimilarityResult = useCallback((result: SimilarityResult) => {
    const entry = audit('SIMILARITY_ACTION', 'question', result.questionId, result.id, '', result.action, `Similarity action: ${result.action}`);
    dispatch({ type: 'UPDATE_SIMILARITY_RESULT', result, audit: entry });
  }, [audit]);

  const addRecipe = useCallback((recipe: GenerationRecipe) => {
    const entry = audit('RECIPE_CREATED', 'audit' as EntityType, recipe.id, recipe.name, '', recipe.name, `Recipe created: ${recipe.name}`);
    dispatch({ type: 'ADD_RECIPE', recipe, audit: entry });
  }, [audit]);

  const updateRecipe = useCallback((recipe: GenerationRecipe) => {
    const entry = audit('RECIPE_UPDATED', 'audit' as EntityType, recipe.id, recipe.name, '', recipe.name, `Recipe updated: ${recipe.name}`);
    dispatch({ type: 'UPDATE_RECIPE', recipe, audit: entry });
  }, [audit]);

  const deleteRecipe = useCallback((id: string) => {
    const entry = audit('RECIPE_DELETED', 'audit' as EntityType, id, id, '', '', `Recipe deleted`);
    dispatch({ type: 'DELETE_RECIPE', id, audit: entry });
  }, [audit]);

  const addReviewComment = useCallback((questionId: string, comment: ReviewComment) => {
    dispatch({ type: 'ADD_REVIEW_COMMENT', questionId, comment });
  }, []);

  const setBatchStatus = useCallback((batchId: string, status: GeneratedBatch['status']) => {
    const entry = audit('BATCH_STATUS_CHANGED', 'audit' as EntityType, batchId, batchId, '', status, `Batch status changed to ${status}`);
    dispatch({ type: 'SET_BATCH_STATUS', batchId, status, audit: entry });
  }, [audit]);

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
      addSavedView,
      updateSavedView,
      deleteSavedView,
      setDefaultSavedView,
      addQuestionVersion,
      restoreQuestionVersion,
      setSimilarityResults,
      updateSimilarityResult,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      addReviewComment,
      setBatchStatus,
    }),
    [state, activeRole, activePermissions, activeAdminName, checkPermission, audit, resetData, setRole, setBranding, setPrototypeSettings, saveTestDraft, deleteTestDraft, getTestDraft, addSavedView, updateSavedView, deleteSavedView, setDefaultSavedView, addQuestionVersion, restoreQuestionVersion, setSimilarityResults, updateSimilarityResult, addRecipe, updateRecipe, deleteRecipe, addReviewComment, setBatchStatus],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePrototypeStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('usePrototypeStore must be used within PrototypeStoreProvider');
  return ctx;
}
