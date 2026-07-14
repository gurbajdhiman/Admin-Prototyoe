import { describe, it, expect } from 'vitest';
import { createVersion, diffFields, hasContentChanges, getNextVersionNumber, isFrozen, restoreFromVersion, compareVersions, shouldCreateVersion } from '@/app/store/versioning';
import type { QuestionVersion } from '@/app/store/types';
import type { Question } from '@/data/questions';

const mockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'Q-1001', stem: 'Test stem', stemPunjabi: undefined,
  options: [{ id: 'A', text: 'Option A' }, { id: 'B', text: 'Option B' }, { id: 'C', text: 'Option C' }, { id: 'D', text: 'Option D' }],
  correctOption: 'A', explanation: 'Test explanation',
  subject: 'Quant', chapter: 'Algebra', topic: 'Linear', subtopic: 'Basic',
  difficulty: 'Moderate', language: ['English'], exam: 'SSC_CGL', type: 'MCQ Single',
  status: 'Draft', source: 'In-house', author: 'Test', reviewer: null,
  validationStatus: 'Pending', validationScore: 50, usageCount: 0, studentAccuracy: 0, avgResponseSec: 0,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
  ...overrides,
});

describe('versioning', () => {
  it('diffFields detects changed fields', () => {
    const old = mockQuestion();
    const updated = mockQuestion({ stem: 'New stem', difficulty: 'Hard' });
    const diff = diffFields(old, updated);
    expect(diff).toContain('stem');
    expect(diff).toContain('difficulty');
    expect(diff).not.toContain('explanation');
  });

  it('hasContentChanges detects content field changes only', () => {
    const old = mockQuestion();
    const contentChanged = mockQuestion({ stem: 'New stem' });
    const statusOnly = mockQuestion({ status: 'Approved' });
    expect(hasContentChanges(old, contentChanged)).toBe(true);
    expect(hasContentChanges(old, statusOnly)).toBe(false);
  });

  it('shouldCreateVersion returns true only for content changes', () => {
    const old = mockQuestion();
    expect(shouldCreateVersion(old, mockQuestion({ stem: 'New' }))).toBe(true);
    expect(shouldCreateVersion(old, mockQuestion({ status: 'Approved' }))).toBe(false);
  });

  it('createVersion creates a version with correct fields', () => {
    const q = mockQuestion();
    const version = createVersion(q, null, 1, 'Admin', 'Initial creation', false, 0);
    expect(version.versionNumber).toBe(1);
    expect(version.questionId).toBe('Q-1001');
    expect(version.changedBy).toBe('Admin');
    expect(version.reason).toBe('Initial creation');
    expect(version.changedFields).toContain('initial');
    expect(version.snapshot.id).toBe('Q-1001');
  });

  it('createVersion with previous version detects changed fields', () => {
    const old = mockQuestion();
    const updated = mockQuestion({ stem: 'New stem' });
    const version = createVersion(updated, old, 2, 'Admin', 'Fixed stem', false, 0);
    expect(version.changedFields).toContain('stem');
    expect(version.versionNumber).toBe(2);
  });

  it('getNextVersionNumber returns 1 for empty versions', () => {
    expect(getNextVersionNumber([])).toBe(1);
  });

  it('getNextVersionNumber returns max + 1', () => {
    const versions: QuestionVersion[] = [
      { id: 'v1', questionId: 'Q-1', versionNumber: 1, snapshot: mockQuestion(), changedFields: [], changedBy: 'A', changedAt: '2024-01-01', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false },
      { id: 'v3', questionId: 'Q-1', versionNumber: 3, snapshot: mockQuestion(), changedFields: [], changedBy: 'A', changedAt: '2024-01-02', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false },
      { id: 'v2', questionId: 'Q-1', versionNumber: 2, snapshot: mockQuestion(), changedFields: [], changedBy: 'A', changedAt: '2024-01-03', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false },
    ];
    expect(getNextVersionNumber(versions)).toBe(4);
  });

  it('isFrozen returns true when used in published test with frozen usage', () => {
    const frozen: QuestionVersion = { id: 'v1', questionId: 'Q-1', versionNumber: 1, snapshot: mockQuestion(), changedFields: [], changedBy: 'A', changedAt: '2024-01-01', reason: 'r', reviewStatus: 'Approved', frozenUsageCount: 5, usedInPublishedTest: true };
    const notFrozen: QuestionVersion = { id: 'v2', questionId: 'Q-1', versionNumber: 2, snapshot: mockQuestion(), changedFields: [], changedBy: 'A', changedAt: '2024-01-01', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false };
    expect(isFrozen(frozen)).toBe(true);
    expect(isFrozen(notFrozen)).toBe(false);
  });

  it('restoreFromVersion returns a question with updated date', () => {
    const version: QuestionVersion = { id: 'v1', questionId: 'Q-1001', versionNumber: 1, snapshot: mockQuestion({ stem: 'Old stem' }), changedFields: [], changedBy: 'A', changedAt: '2024-01-01', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false };
    const restored = restoreFromVersion(version);
    expect(restored.stem).toBe('Old stem');
    expect(restored.id).toBe('Q-1001');
  });

  it('compareVersions returns only differing fields', () => {
    const v1: QuestionVersion = { id: 'v1', questionId: 'Q-1', versionNumber: 1, snapshot: mockQuestion({ stem: 'A', difficulty: 'Easy' }), changedFields: [], changedBy: 'A', changedAt: '2024-01-01', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false };
    const v2: QuestionVersion = { id: 'v2', questionId: 'Q-1', versionNumber: 2, snapshot: mockQuestion({ stem: 'B', difficulty: 'Easy' }), changedFields: ['stem'], changedBy: 'A', changedAt: '2024-01-02', reason: 'r', reviewStatus: 'Draft', frozenUsageCount: 0, usedInPublishedTest: false };
    const diff = compareVersions(v1, v2);
    expect(diff.some((d) => d.field === 'stem')).toBe(true);
    expect(diff.some((d) => d.field === 'difficulty')).toBe(false);
  });
});
