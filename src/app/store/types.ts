import type { Question } from '@/data/questions';
export type { Question };
import type { Test, TestSeries } from '@/data/tests';
export type { Test, TestSeries };
import type { Package, Order, Coupon, Entitlement } from '@/data/commerce';
export type { Package, Order, Coupon, Entitlement };
import type { Student, AdminMember, SupportRequest } from '@/data/users';
export type { Student, AdminMember, SupportRequest };
import type { NotificationCampaign } from '@/data/auxiliary';
export type { NotificationCampaign };

export type EntityType = 'question' | 'test' | 'test_series' | 'package' | 'order' | 'coupon' | 'entitlement' | 'student' | 'admin' | 'support' | 'notification' | 'audit';

export interface AuditEntry {
  id: string;
  timestamp: string;
  admin: string;
  role: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  sessionId: string;
  approvalStatus: 'Auto' | 'Approved' | 'Pending';
}

export interface PrototypeRole {
  name: string;
  permissions: string[];
}

export interface PrototypeSettings {
  simulateSlow: boolean;
  simulateFailure: boolean;
  showEmptyStates: boolean;
}

export interface BrandingSettings {
  platformName: string;
  tagline: string;
  primaryColor: string;
  darkModeDefault: boolean;
}

export interface StudentNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface SupportComment {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface GeneratedBatch {
  id: string;
  createdAt: string;
  exam: string;
  subject: string;
  difficulty: string;
  count: number;
  seed: number;
  questions: GeneratedQuestion[];
  status: 'Unreviewed' | 'In Review' | 'Approved' | 'Rejected';
}

export interface GeneratedQuestion {
  id: string;
  batchId: string;
  seed: number;
  stem: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  status: 'Unreviewed' | 'Needs Fix' | 'Approved' | 'Rejected';
  originalStem?: string;
  originalOptions?: { id: string; text: string }[];
  originalExplanation?: string;
}

export interface TestDraftSection {
  id: string;
  name: string;
  subject: string;
  questions: number;
  marks: number;
  duration: number;
}

export interface TestDraft {
  id?: string;
  blueprintId?: string;
  series?: string;
  instructions?: string;
  basicInfo: {
    name: string;
    examCode: string;
    testType: string;
    language: string;
    access: 'Free' | 'Paid';
    difficulty: string;
    description: string;
  };
  pattern: {
    totalQuestions: number;
    totalMarks: number;
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarks: number;
    sectionTiming: 'shared' | 'sectional';
    navigationRules: {
      switchSections: boolean;
      markForReview: boolean;
      preventFullscreenExit: boolean;
    };
  };
  sections: TestDraftSection[];
  selectedQuestionIds: string[];
  schedule: {
    mode: 'draft' | 'qa' | 'publish-now' | 'scheduled';
    reviewerId?: string;
    publishAt?: string;
  };
  lastSaved?: string;
}

export interface PrototypeState {
  version: number;
  questions: Question[];
  tests: Test[];
  testSeries: TestSeries[];
  packages: Package[];
  orders: Order[];
  coupons: Coupon[];
  entitlements: Entitlement[];
  students: Student[];
  adminTeam: AdminMember[];
  supportRequests: SupportRequest[];
  notifications: NotificationCampaign[];
  auditLogs: AuditEntry[];
  studentNotes: Record<string, StudentNote[]>;
  supportComments: Record<string, SupportComment[]>;
  generatedBatches: GeneratedBatch[];
  testDrafts: Record<string, TestDraft>;
  branding: BrandingSettings;
  prototypeSettings: PrototypeSettings;
  activeRole: string;
}
