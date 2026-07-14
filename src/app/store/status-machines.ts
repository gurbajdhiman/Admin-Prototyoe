// ============================================================
// ExamTree Admin Prototype — Status Machines
// Defines valid transitions and prevents invalid state changes
// ============================================================

// --- Questions ---
export type QuestionStatus = 'Draft' | 'Generated' | 'Under Review' | 'Needs Fix' | 'Approved' | 'Rejected' | 'Archived';
export const QUESTION_STATUS: QuestionStatus[] = ['Draft', 'Generated', 'Under Review', 'Needs Fix', 'Approved', 'Rejected', 'Archived'];
export const QUESTION_TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  'Draft': ['Generated', 'Under Review', 'Archived'],
  'Generated': ['Under Review', 'Archived'],
  'Under Review': ['Needs Fix', 'Approved', 'Rejected', 'Archived'],
  'Needs Fix': ['Under Review', 'Rejected', 'Archived'],
  'Approved': ['Under Review', 'Archived'],
  'Rejected': ['Under Review', 'Archived'],
  'Archived': ['Under Review'],
};
export function canTransitionQuestion(from: QuestionStatus, to: QuestionStatus): boolean {
  return QUESTION_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Tests ---
export type TestStatus = 'Draft' | 'Content Ready' | 'Under QA' | 'Needs Fix' | 'QA Approved' | 'Scheduled' | 'Live' | 'Completed' | 'Archived';
export const TEST_STATUS: TestStatus[] = ['Draft', 'Content Ready', 'Under QA', 'Needs Fix', 'QA Approved', 'Scheduled', 'Live', 'Completed', 'Archived'];
export const TEST_TRANSITIONS: Record<TestStatus, TestStatus[]> = {
  'Draft': ['Content Ready', 'Under QA', 'Archived'],
  'Content Ready': ['Under QA', 'Draft', 'Archived'],
  'Under QA': ['Needs Fix', 'QA Approved', 'Draft', 'Archived'],
  'Needs Fix': ['Under QA', 'Draft', 'Archived'],
  'QA Approved': ['Scheduled', 'Live', 'Archived'],
  'Scheduled': ['Live', 'QA Approved', 'Archived'],
  'Live': ['Completed', 'Archived'],
  'Completed': ['Archived'],
  'Archived': ['Draft'],
};
export function canTransitionTest(from: TestStatus, to: TestStatus): boolean {
  return TEST_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Generation Batches ---
export type GenerationBatchStatus = 'Draft' | 'Queued' | 'Running' | 'Validation' | 'Review' | 'Partially Approved' | 'Approved' | 'Failed' | 'Cancelled';
export const GENERATION_BATCH_STATUS: GenerationBatchStatus[] = ['Draft', 'Queued', 'Running', 'Validation', 'Review', 'Partially Approved', 'Approved', 'Failed', 'Cancelled'];
export const GENERATION_BATCH_TRANSITIONS: Record<GenerationBatchStatus, GenerationBatchStatus[]> = {
  'Draft': ['Queued', 'Cancelled'],
  'Queued': ['Running', 'Cancelled'],
  'Running': ['Validation', 'Failed', 'Cancelled'],
  'Validation': ['Review', 'Failed'],
  'Review': ['Partially Approved', 'Approved', 'Failed'],
  'Partially Approved': ['Approved', 'Failed'],
  'Approved': [],
  'Failed': ['Draft', 'Queued'],
  'Cancelled': ['Draft'],
};
export function canTransitionBatch(from: GenerationBatchStatus, to: GenerationBatchStatus): boolean {
  return GENERATION_BATCH_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Challenges ---
export type ChallengeStatus = 'New' | 'Investigating' | 'Accepted' | 'Rejected' | 'Correction Required' | 'Recalculation Required' | 'Resolved';
export const CHALLENGE_STATUS: ChallengeStatus[] = ['New', 'Investigating', 'Accepted', 'Rejected', 'Correction Required', 'Recalculation Required', 'Resolved'];
export const CHALLENGE_TRANSITIONS: Record<ChallengeStatus, ChallengeStatus[]> = {
  'New': ['Investigating', 'Accepted', 'Rejected', 'Resolved'],
  'Investigating': ['Accepted', 'Rejected', 'Correction Required', 'Recalculation Required', 'Resolved'],
  'Accepted': ['Correction Required', 'Recalculation Required', 'Resolved'],
  'Rejected': ['Resolved'],
  'Correction Required': ['Recalculation Required', 'Resolved'],
  'Recalculation Required': ['Resolved'],
  'Resolved': [],
};
export function canTransitionChallenge(from: ChallengeStatus, to: ChallengeStatus): boolean {
  return CHALLENGE_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Corrections ---
export type CorrectionStatus = 'Draft' | 'Impact Calculated' | 'Awaiting Approval' | 'Approved' | 'Running' | 'Completed' | 'Failed' | 'Rejected';
export const CORRECTION_STATUS: CorrectionStatus[] = ['Draft', 'Impact Calculated', 'Awaiting Approval', 'Approved', 'Running', 'Completed', 'Failed', 'Rejected'];
export const CORRECTION_TRANSITIONS: Record<CorrectionStatus, CorrectionStatus[]> = {
  'Draft': ['Impact Calculated', 'Rejected'],
  'Impact Calculated': ['Awaiting Approval', 'Rejected'],
  'Awaiting Approval': ['Approved', 'Rejected'],
  'Approved': ['Running'],
  'Running': ['Completed', 'Failed'],
  'Completed': [],
  'Failed': ['Running'],
  'Rejected': [],
};
export function canTransitionCorrection(from: CorrectionStatus, to: CorrectionStatus): boolean {
  return CORRECTION_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Orders ---
export type OrderStatus = 'Created' | 'Pending' | 'Paid' | 'Failed' | 'Partially Refunded' | 'Refunded';
export const ORDER_STATUS: OrderStatus[] = ['Created', 'Pending', 'Paid', 'Failed', 'Partially Refunded', 'Refunded'];
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'Created': ['Pending', 'Failed'],
  'Pending': ['Paid', 'Failed'],
  'Paid': ['Partially Refunded', 'Refunded'],
  'Failed': ['Pending'],
  'Partially Refunded': ['Refunded'],
  'Refunded': [],
};
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Generic helper ---
export function getValidTransitions<T extends string>(machine: Record<T, T[]>, current: T): T[] {
  return machine[current] ?? [];
}
