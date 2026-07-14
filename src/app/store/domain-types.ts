// ============================================================
// ExamTree Admin Prototype — Domain Types
// Future backend contract source. No SQL here.
// ============================================================

// --- Taxonomy ---
export interface ExamFamily { id: string; name: string; description: string; }
export interface Exam { id: string; code: string; name: string; familyId: string; }
export interface ExamStage { id: string; examId: string; name: string; tier: number; }
export interface Subject { id: string; name: string; }
export interface Chapter { id: string; subjectId: string; name: string; }
export interface Topic { id: string; chapterId: string; name: string; }
export interface Subtopic { id: string; topicId: string; name: string; }

// --- Coverage ---
export type CoverageNodeType = 'exam_family' | 'exam' | 'stage' | 'subject' | 'chapter' | 'topic' | 'subtopic';
export interface CoverageTarget {
  id: string;
  nodeType: CoverageNodeType;
  nodeId: string;
  nodeName: string;
  targetCount: number;
  owner?: string;
  languages: string[];
  difficultyDistribution: { easy: number; moderate: number; hard: number };
}

// --- Question Content ---
export interface QuestionTranslation {
  id: string;
  questionId: string;
  language: string;
  stem: string;
  options: { id: string; text: string }[];
  explanation: string;
  status: 'pending' | 'complete' | 'review_needed';
}

export interface QuestionVersionSnapshot {
  stem: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
}

export interface QuestionVersion {
  id: string;
  questionId: string;
  versionNumber: number;
  changedBy: string;
  changedAt: string;
  changeReason: string;
  status: 'draft' | 'approved' | 'frozen';
  fieldDiffs: { field: string; oldValue: string; newValue: string }[];
  snapshot: QuestionVersionSnapshot;
  isUsedInPublishedTest: boolean;
}

export interface ReviewComment {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface QuestionReview {
  id: string;
  questionId: string;
  reviewer: string;
  status: 'new' | 'assigned' | 'in_progress' | 'approved' | 'rejected' | 'needs_fix';
  comments: ReviewComment[];
  assignedAt?: string;
  reviewedAt?: string;
  dueDate?: string;
  slaStatus: 'on_track' | 'at_risk' | 'breached';
}

// --- Question Challenges ---
export type ChallengeType = 'wrong_answer' | 'ambiguous_wording' | 'translation_issue' | 'duplicate_options' | 'explanation_issue' | 'technical_issue';
export type ChallengeStatus = 'new' | 'investigating' | 'accepted' | 'rejected' | 'correction_required' | 'recalculation_required' | 'resolved';
export type ChallengePriority = 'low' | 'medium' | 'high' | 'critical';

export interface QuestionChallenge {
  id: string;
  questionId: string;
  questionVersion: number;
  studentId: string;
  studentName: string;
  testId: string;
  attemptId: string;
  selectedAnswer: string;
  type: ChallengeType;
  description: string;
  evidence?: string;
  priority: ChallengePriority;
  assignedReviewer?: string;
  status: ChallengeStatus;
  resolution?: string;
  createdAt: string;
  comments: ReviewComment[];
}

// --- Similarity ---
export type SimilarityMatchType = 'exact' | 'near_identical' | 'same_options' | 'same_pattern' | 'same_numerical' | 'related_variation' | 'semantic';
export type SimilarityStatus = 'pending' | 'rejected_duplicate' | 'acceptable_variation' | 'linked_variation';

export interface SimilarQuestion {
  id: string;
  questionId: string;
  similarQuestionId: string;
  similarityScore: number;
  matchType: SimilarityMatchType;
  status: SimilarityStatus;
}

// --- Generation ---
export interface DifficultyDistribution {
  easy: number;
  moderate: number;
  hard: number;
}

export type GenerationRecipeStatus = 'draft' | 'active' | 'deprecated';

export interface GenerationRecipe {
  id: string;
  name: string;
  version: number;
  exam: string;
  subject: string;
  chapter?: string;
  topic?: string;
  subtopic?: string;
  targetLanguages: string[];
  difficultyDistribution: DifficultyDistribution;
  questionCount: number;
  excludePreviousBatches: number;
  duplicateThreshold: number;
  validationProfile: string;
  assignedReviewer?: string;
  dueDate?: string;
  status: GenerationRecipeStatus;
  createdAt: string;
}

export interface GenerationRecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  changedBy: string;
  changedAt: string;
  changeReason: string;
  snapshot: Omit<GenerationRecipe, 'id' | 'createdAt' | 'version'>;
}

export type GenerationBatchStatus = 'draft' | 'queued' | 'running' | 'validation' | 'review' | 'partially_approved' | 'approved' | 'failed' | 'cancelled';

export interface GenerationValidationResult {
  status: 'passed' | 'warning' | 'failed';
  issues: { id: string; severity: 'error' | 'warning' | 'info'; message: string }[];
}

export interface GenerationItem {
  id: string;
  batchId: string;
  seed: number;
  patternId: string;
  generatorVersion: string;
  stem: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  validationResult: GenerationValidationResult;
  status: 'unreviewed' | 'needs_fix' | 'approved' | 'rejected';
  reviewer?: string;
  questionBankId?: string;
  originalStem?: string;
  originalOptions?: { id: string; text: string }[];
  originalExplanation?: string;
}

// --- Test Blueprints ---
export type BlueprintStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export interface TestBlueprint {
  id: string;
  name: string;
  exam: string;
  stage?: string;
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  languages: string[];
  sections: { name: string; subject: string; questions: number; marks: number; duration: number }[];
  difficultyDistribution: DifficultyDistribution;
  negativeMarking: number;
  sectionalTiming: boolean;
  navigationRules: { switchSections: boolean; markForReview: boolean; preventFullscreenExit: boolean };
  previousYearTarget: number;
  maxRepetition: number;
  effectiveDate: string;
  version: number;
  status: BlueprintStatus;
}

// --- Test Versioning & Publication ---
export interface FrozenSection {
  name: string;
  subject: string;
  questions: number;
  marks: number;
  duration: number;
  questionIds: string[];
}

export interface TestVersion {
  id: string;
  testId: string;
  versionNumber: number;
  status: 'draft' | 'live' | 'archived';
  publishedBy?: string;
  publishedAt?: string;
  changes: string;
  frozenSections: FrozenSection[];
}

export interface PublicationSnapshot {
  id: string;
  testId: string;
  testVersionId: string;
  publishedBy: string;
  publishedAt: string;
  frozenQuestionVersions: { questionId: string; versionNumber: number; snapshot: QuestionVersionSnapshot }[];
}

// --- Test QA ---
export interface TestQAReview {
  id: string;
  testId: string;
  reviewer: string;
  status: 'draft' | 'ready_for_qa' | 'under_qa' | 'needs_fix' | 'qa_approved' | 'scheduled' | 'live';
  comments: ReviewComment[];
  validationIssues: { id: string; severity: 'error' | 'warning' | 'info'; title: string; description: string }[];
  assignedAt?: string;
  reviewedAt?: string;
}

// --- Corrections & Recalculation ---
export type CorrectionType = 'correct_answer_changed' | 'question_invalidated' | 'translation_corrected' | 'explanation_corrected' | 'marks_changed' | 'negative_marks_changed';
export type CorrectionStatus = 'draft' | 'impact_calculated' | 'awaiting_approval' | 'approved' | 'running' | 'completed' | 'failed' | 'rejected';

export interface ScoreImpact {
  studentId: string;
  oldScore: number;
  newScore: number;
  rankChange: number;
}

export interface CorrectionCase {
  id: string;
  type: CorrectionType;
  questionId: string;
  testId: string;
  testVersionId: string;
  affectedAttempts: number;
  scoreImpact: ScoreImpact[];
  status: CorrectionStatus;
  proposedBy: string;
  approvedBy?: string;
  reason: string;
  createdAt: string;
  comments: ReviewComment[];
}

export interface RecalculationJob {
  id: string;
  correctionCaseId: string;
  testId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  affectedStudents: number;
}

// --- Commerce ---
export interface Product {
  id: string;
  name: string;
  type: 'test' | 'test_series' | 'package';
  price: number;
}

export interface PackageItem {
  packageId: string;
  productType: 'test' | 'test_series';
  productId: string;
  productName: string;
}

export interface PaymentEvent {
  id: string;
  orderId: string;
  event: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partial_refund';
  amount: number;
  gateway: string;
  timestamp: string;
  metadata?: string;
}

export type RefundStatus = 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string;
  requestedAt: string;
  approvedAt?: string;
}

export interface EntitlementEvent {
  id: string;
  entitlementId: string;
  event: 'granted' | 'extended' | 'revoked' | 'expired';
  actor: string;
  timestamp: string;
  reason: string;
}

// --- Background Jobs ---
export type JobType = 'generation' | 'import' | 'export' | 'test_publication' | 'result_recalculation' | 'notification_sending' | 'analytics_refresh' | 'media_processing';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface JobLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  owner: string;
  priority: JobPriority;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  error?: string;
  relatedEntityType: string;
  relatedEntityId: string;
  logs: JobLog[];
}

// --- Feature Flags ---
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: { development: boolean; staging: boolean; production: boolean };
  selectedRoles: string[];
  selectedAdmins: string[];
  selectedExams: string[];
  percentageRollout: number;
  startDate?: string;
  endDate?: string;
  updatedAt: string;
}

// --- Admin Notifications ---
export interface AdminNotification {
  id: string;
  type: 'assigned_review' | 'mention' | 'failed_job' | 'approval_request' | 'sla_warning' | 'publication_reminder';
  title: string;
  message: string;
  recipientAdmin: string;
  entityType: string;
  entityId: string;
  read: boolean;
  createdAt: string;
}

// --- Collaboration ---
export interface CollaborationComment {
  id: string;
  entityType: string;
  entityId: string;
  author: string;
  timestamp: string;
  content: string;
  mentions: string[];
}

export interface Assignment {
  id: string;
  entityType: string;
  entityId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Follower {
  id: string;
  entityType: string;
  entityId: string;
  adminName: string;
  followedAt: string;
}

// --- Import History ---
export interface ImportRecord {
  id: string;
  type: 'question_csv' | 'question_json' | 'taxonomy' | 'translations' | 'previous_year_papers' | 'test_definitions';
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  rejectedRows: number;
  status: 'pending' | 'mapping' | 'validating' | 'completed' | 'failed';
  importedBy: string;
  importedAt: string;
  jobId?: string;
}

// --- Saved Views ---
export type SavedViewEntityType = 'questions' | 'tests' | 'orders' | 'students' | 'support' | 'jobs' | 'audit' | 'challenges';

export interface SavedView {
  id: string;
  name: string;
  entityType: SavedViewEntityType;
  filters: Record<string, string>;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
}

// --- Permissions ---
export interface Permission {
  key: string;
  label: string;
  category: string;
}

export interface AdminRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}
