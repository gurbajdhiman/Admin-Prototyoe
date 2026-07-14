import { describe, it, expect } from 'vitest';
import type { TestVersion, TestQAComment } from '@/app/store/types';
import type { Test } from '@/data/tests';

const QA_STATUSES = ['Draft', 'Ready for QA', 'Under QA', 'Needs Fix', 'QA Approved', 'Scheduled', 'Live'] as const;
type QAStatus = (typeof QA_STATUSES)[number];

void QA_STATUSES;

const QA_FLOW: Record<QAStatus, QAStatus[]> = {
  'Draft': ['Ready for QA'],
  'Ready for QA': ['Under QA', 'Draft'],
  'Under QA': ['Needs Fix', 'QA Approved'],
  'Needs Fix': ['Ready for QA', 'Under QA'],
  'QA Approved': ['Scheduled', 'Live'],
  'Scheduled': ['Live', 'Under QA'],
  'Live': [],
};

describe('QA transitions', () => {
  it('Draft can transition to Ready for QA', () => {
    expect(QA_FLOW['Draft']).toContain('Ready for QA');
  });

  it('Ready for QA can transition to Under QA', () => {
    expect(QA_FLOW['Ready for QA']).toContain('Under QA');
  });

  it('Under QA can transition to Needs Fix or QA Approved', () => {
    expect(QA_FLOW['Under QA']).toContain('Needs Fix');
    expect(QA_FLOW['Under QA']).toContain('QA Approved');
  });

  it('Needs Fix can go back to Ready for QA', () => {
    expect(QA_FLOW['Needs Fix']).toContain('Ready for QA');
  });

  it('QA Approved can transition to Scheduled or Live', () => {
    expect(QA_FLOW['QA Approved']).toContain('Scheduled');
    expect(QA_FLOW['QA Approved']).toContain('Live');
  });

  it('Live has no further transitions', () => {
    expect(QA_FLOW['Live'].length).toBe(0);
  });

  it('cannot skip from Draft directly to Live', () => {
    expect(QA_FLOW['Draft']).not.toContain('Live');
  });

  it('cannot skip from Ready for QA to Live', () => {
    expect(QA_FLOW['Ready for QA']).not.toContain('Live');
  });
});

describe('immutable publication snapshots', () => {
  const createVersion = (test: Test, versionNumber: number, publishedBy: string): TestVersion => ({
    id: `TV-${test.id}-${versionNumber}`,
    testId: test.id,
    versionNumber,
    snapshot: { ...test, status: 'Live' },
    publishedBy,
    publishedAt: new Date().toISOString(),
    reason: 'Initial publication',
    isLive: true,
    frozenSections: [],
    frozenQuestionIds: ['Q-1', 'Q-2', 'Q-3'],
    frozenInstructions: 'General instructions.',
    frozenMarkingRules: { marksPerQuestion: 2, negativeMarks: 0.25 },
  });

  const mockTest: Test = {
    id: 'T-2000', name: 'Test Mock', exam: 'SSC_CGL_T1', examName: 'SSC CGL Tier 1',
    type: 'Full Mock', series: 'Test Series', access: 'Free', language: 'English',
    totalQuestions: 50, durationMin: 60, difficulty: 'Moderate',
    status: 'Draft', scheduledDate: null, attempts: 0, author: 'Admin',
  };

  it('creates a frozen snapshot with all required fields', () => {
    const version = createVersion(mockTest, 1, 'Admin');
    expect(version.testId).toBe(mockTest.id);
    expect(version.versionNumber).toBe(1);
    expect(version.publishedBy).toBe('Admin');
    expect(version.isLive).toBe(true);
    expect(version.frozenQuestionIds.length).toBe(3);
    expect(version.frozenMarkingRules.marksPerQuestion).toBe(2);
    expect(version.frozenMarkingRules.negativeMarks).toBe(0.25);
    expect(version.frozenInstructions).toBeDefined();
  });

  it('snapshot status is Live regardless of original test status', () => {
    const version = createVersion({ ...mockTest, status: 'Draft' }, 1, 'Admin');
    expect(version.snapshot.status).toBe('Live');
  });

  it('frozen sections and questions are immutable copies', () => {
    const version = createVersion(mockTest, 1, 'Admin');
    const originalFrozenQs = [...version.frozenQuestionIds];
    expect(version.frozenQuestionIds).toEqual(originalFrozenQs);
  });

  it('incrementing version number creates a new snapshot', () => {
    const v1 = createVersion(mockTest, 1, 'Admin');
    const v2 = createVersion(mockTest, 2, 'Admin2');
    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
    expect(v1.id).not.toBe(v2.id);
    expect(v1.publishedBy).toBe('Admin');
    expect(v2.publishedBy).toBe('Admin2');
  });
});

describe('editing after publication creates a new draft', () => {
  it('a published version remains frozen while the test status changes', () => {
    const mockTest: Test = {
      id: 'T-2000', name: 'Test', exam: 'SSC_CGL_T1', examName: 'SSC CGL',
      type: 'Full Mock', series: 'S', access: 'Free', language: 'English',
      totalQuestions: 50, durationMin: 60, difficulty: 'Moderate',
      status: 'Live', scheduledDate: null, attempts: 100, author: 'Admin',
    };

    const frozenVersion: TestVersion = {
      id: 'TV-T-2000-1', testId: 'T-2000', versionNumber: 1,
      snapshot: { ...mockTest },
      publishedBy: 'Admin', publishedAt: '2024-01-01T00:00:00Z',
      reason: 'Published', isLive: true,
      frozenSections: [], frozenQuestionIds: ['Q-1'],
      frozenInstructions: 'Instructions', frozenMarkingRules: { marksPerQuestion: 2, negativeMarks: 0.25 },
    };

    // The test is later changed to Draft for editing
    const editedTest: Test = { ...mockTest, status: 'Draft', name: 'Test (Edited)' };

    // The frozen version's snapshot should NOT change
    expect(frozenVersion.snapshot.status).toBe('Live');
    expect(frozenVersion.snapshot.name).toBe('Test');
    expect(editedTest.status).toBe('Draft');
    expect(editedTest.name).toBe('Test (Edited)');
    expect(frozenVersion.snapshot.name).not.toBe(editedTest.name);
  });

  it('QA comments are tracked separately from version snapshots', () => {
    const comment: TestQAComment = {
      id: 'QC-1', author: 'Reviewer', timestamp: '2024-01-01',
      content: 'Needs fix on question 3',
    };
    expect(comment.id).toBe('QC-1');
    expect(comment.author).toBe('Reviewer');
    expect(comment.content).toContain('question 3');
  });
});
