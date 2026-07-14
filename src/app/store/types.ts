import type { Question } from '@/data/questions';
export type { Question };
import type { Test, TestSeries, Blueprint } from '@/data/tests';
export type { Test, TestSeries };
export type { Blueprint, BlueprintStatus, BlueprintSection } from '@/data/tests';
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

export type BatchStatus =
  | 'Draft' | 'Queued' | 'Running' | 'Validation' | 'Review'
  | 'Partially Approved' | 'Approved' | 'Failed' | 'Cancelled';

export type GeneratedItemStatus =
  | 'Unreviewed' | 'Needs Fix' | 'Approved' | 'Rejected';

export interface GeneratedBatch {
  id: string;
  createdAt: string;
  exam: string;
  subject: string;
  difficulty: string;
  count: number;
  seed: number;
  questions: GeneratedQuestion[];
  status: BatchStatus;
  recipeId?: string;
  priority?: 'Low' | 'Normal' | 'High';
  reviewer?: string;
  dueDate?: string;
  generatorVersion?: string;
  runtimeMs?: number;
  costMock?: number;
  logs?: BatchLogEntry[];
}

export interface BatchLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface GeneratedQuestion {
  id: string;
  batchId: string;
  seed: number;
  stem: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  status: GeneratedItemStatus;
  patternId?: string;
  generatorVersion?: string;
  validationScore?: number;
  validationResult?: 'Passed' | 'Issues' | 'Pending';
  reviewer?: string;
  questionBankId?: string;
  duplicateOf?: string;
  originalStem?: string;
  originalOptions?: { id: string; text: string }[];
  originalExplanation?: string;
}

export interface QuestionVersion {
  id: string;
  questionId: string;
  versionNumber: number;
  sourceVersionId?: string;
  snapshot: Question;
  changedFields: string[];
  changedBy: string;
  changedAt: string;
  reason: string;
  reviewStatus: string;
  frozenUsageCount: number;
  usedInPublishedTest: boolean;
}

export type SimilaritySignal =
  | 'exact-normalized' | 'near-identical' | 'matching-options'
  | 'same-topic-pattern' | 'same-numerical-structure'
  | 'related-variation' | 'simulated-semantic';

export interface SimilarityResult {
  id: string;
  questionId: string;
  similarQuestionId: string;
  signals: SimilaritySignal[];
  score: number;
  action: 'none' | 'rejected-duplicate' | 'acceptable-variation' | 'linked-related';
}

export interface GenerationRecipe {
  id: string;
  name: string;
  description: string;
  version: number;
  exam: string;
  stage?: string;
  subject: string;
  chapter?: string;
  topic?: string;
  subtopic?: string;
  languages: string[];
  difficultyDistribution: { Easy: number; Moderate: number; Hard: number; Expert?: number };
  questionCount: number;
  questionType: string;
  patternSelection: string[];
  excludePreviousBatch: boolean;
  similarityThreshold: number;
  validationProfile: string;
  assignedReviewer?: string;
  dueDate?: string;
  priority: 'Low' | 'Normal' | 'High';
  seed?: number;
  generatorVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface TestVersion {
  id: string;
  testId: string;
  versionNumber: number;
  snapshot: Test;
  publishedBy: string;
  publishedAt: string;
  reason: string;
  isLive: boolean;
  frozenSections: TestDraftSection[];
  frozenQuestionIds: string[];
  frozenInstructions: string;
  frozenMarkingRules: { marksPerQuestion: number; negativeMarks: number };
}

export interface TestQAComment {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface AutoAssemblyRule {
  questionCount: number;
  difficultyDistribution: { Easy: number; Moderate: number; Hard: number };
  requiredLanguages: string[];
  maxReuse: number;
  excludeRecentlyUsed: boolean;
  previousYearPercent: number;
  minQualityScore: number;
  onlyApproved: boolean;
  maxPerSubtopic: number;
}

export interface AutoAssemblyResult {
  selectedIds: string[];
  shortages: { constraint: string; needed: number; available: number }[];
  unmetConstraints: string[];
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
  lockedQuestionIds?: string[];
  autoAssemblyRule?: AutoAssemblyRule;
  schedule: {
    mode: 'draft' | 'qa' | 'publish-now' | 'scheduled';
    reviewerId?: string;
    publishAt?: string;
  };
  lastSaved?: string;
}

export interface SavedViewFilter {
  key: string;
  value: string;
}

export interface SavedViewState {
  filters: SavedViewFilter[];
  sort?: { key: string; dir: 'asc' | 'desc' };
  visibleColumns: string[];
  columnOrder: string[];
  pageSize: number;
}

export interface SavedView {
  id: string;
  name: string;
  page: string;
  scope: 'private' | 'shared';
  ownerId: string;
  state: SavedViewState;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageNode {
  id: string;
  level: 'family' | 'exam' | 'stage' | 'subject' | 'chapter' | 'topic' | 'subtopic';
  label: string;
  examCode?: string;
  targetCount: number;
  totalCount: number;
  generated: number;
  underReview: number;
  needsFix: number;
  approved: number;
  rejected: number;
  used: number;
  unused: number;
  englishCount: number;
  hindiCount: number;
  punjabiCount: number;
  easyCount: number;
  moderateCount: number;
  hardCount: number;
  coveragePercentage: number;
  gapCount: number;
  children: CoverageNode[];
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
  savedViews: SavedView[];
  questionVersions: Record<string, QuestionVersion[]>;
  similarityResults: SimilarityResult[];
  generationRecipes: GenerationRecipe[];
  reviewComments: Record<string, ReviewComment[]>;
  blueprints: Blueprint[];
  testVersions: Record<string, TestVersion[]>;
  testQAComments: Record<string, TestQAComment[]>;
  branding: BrandingSettings;
  prototypeSettings: PrototypeSettings;
  activeRole: string;
}
