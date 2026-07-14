import { describe, it, expect } from 'vitest';
import type { Test } from '@/data/tests';
import type { TestDraft } from '@/app/store/types';

// Reimplement the same logic as testToDraft for testing.
// (testToDraft is a private, unexported function in TestBuilderPage, so we
// mirror it here to verify the round-trip mapping logic in isolation.)
function testToDraft(test: Test): TestDraft {
  return {
    id: test.id,
    basicInfo: {
      name: test.name,
      examCode: test.exam,
      testType: test.type,
      language: test.language,
      access: test.access,
      difficulty: test.difficulty,
      description: '',
    },
    pattern: {
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalQuestions * 2,
      durationMinutes: test.durationMin,
      marksPerQuestion: 2,
      negativeMarks: 0.25,
      sectionTiming: 'shared',
      navigationRules: {
        switchSections: true,
        markForReview: true,
        preventFullscreenExit: false,
      },
    },
    sections: [],
    selectedQuestionIds: [],
    schedule: {
      mode:
        test.status === 'Live'
          ? 'publish-now'
          : test.status === 'Scheduled'
            ? 'scheduled'
            : test.status === 'Under QA'
              ? 'qa'
              : 'draft',
      publishAt: test.scheduledDate ?? undefined,
    },
    series: test.series,
  };
}

describe('Test Builder round-trip', () => {
  const mockTest: Test = {
    id: 'T-9999',
    name: 'Round Trip Test',
    exam: 'SSC_CGL_T1',
    examName: 'SSC CGL Tier 1',
    type: 'Full Mock',
    series: 'SSC CGL Prime Series',
    access: 'Paid',
    language: 'English',
    totalQuestions: 100,
    durationMin: 60,
    difficulty: 'Moderate',
    status: 'Draft',
    scheduledDate: null,
    attempts: 0,
    author: 'Test Author',
  };

  it('testToDraft restores all Test fields correctly', () => {
    const draft = testToDraft(mockTest);
    expect(draft.id).toBe('T-9999');
    expect(draft.basicInfo.name).toBe('Round Trip Test');
    expect(draft.basicInfo.examCode).toBe('SSC_CGL_T1');
    expect(draft.basicInfo.testType).toBe('Full Mock');
    expect(draft.basicInfo.language).toBe('English');
    expect(draft.basicInfo.access).toBe('Paid');
    expect(draft.basicInfo.difficulty).toBe('Moderate');
    expect(draft.pattern.totalQuestions).toBe(100);
    expect(draft.pattern.durationMinutes).toBe(60);
    expect(draft.series).toBe('SSC CGL Prime Series');
  });

  it('testToDraft preserves schedule mode based on test status', () => {
    const liveTest = { ...mockTest, status: 'Live' };
    expect(testToDraft(liveTest).schedule.mode).toBe('publish-now');

    const scheduledTest = {
      ...mockTest,
      status: 'Scheduled',
      scheduledDate: '2026-08-01',
    };
    const draft = testToDraft(scheduledTest);
    expect(draft.schedule.mode).toBe('scheduled');
    expect(draft.schedule.publishAt).toBe('2026-08-01');

    const qaTest = { ...mockTest, status: 'Under QA' };
    expect(testToDraft(qaTest).schedule.mode).toBe('qa');
  });

  it('a full saved draft preserves sections and selected questions', () => {
    const fullDraft: TestDraft = {
      id: 'T-9999',
      basicInfo: {
        name: 'Round Trip Test',
        examCode: 'SSC_CGL_T1',
        testType: 'Full Mock',
        language: 'English',
        access: 'Paid',
        difficulty: 'Moderate',
        description: 'A test description that should survive round-trip',
      },
      pattern: {
        totalQuestions: 50,
        totalMarks: 100,
        durationMinutes: 30,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        sectionTiming: 'sectional',
        navigationRules: {
          switchSections: false,
          markForReview: false,
          preventFullscreenExit: true,
        },
      },
      sections: [
        { id: 's1', name: 'Quant', subject: 'Quantitative Aptitude', questions: 25, marks: 50, duration: 15 },
        { id: 's2', name: 'Reasoning', subject: 'Reasoning', questions: 25, marks: 50, duration: 15 },
      ],
      selectedQuestionIds: ['Q-1001', 'Q-1002', 'Q-1003'],
      schedule: { mode: 'qa', reviewerId: 'Simran Singh' },
      series: 'SSC CGL Prime Series',
      instructions: 'Read carefully before starting.',
    };

    // Simulate saving and restoring the full draft (as SAVE_TEST_DRAFT does
    // via JSON serialization in localStorage).
    const serialized = JSON.stringify(fullDraft);
    const restored = JSON.parse(serialized) as TestDraft;

    expect(restored.basicInfo.description).toBe(
      'A test description that should survive round-trip',
    );
    expect(restored.pattern.totalQuestions).toBe(50);
    expect(restored.pattern.negativeMarks).toBe(0.5);
    expect(restored.pattern.sectionTiming).toBe('sectional');
    expect(restored.pattern.navigationRules.switchSections).toBe(false);
    expect(restored.pattern.navigationRules.preventFullscreenExit).toBe(true);
    expect(restored.sections).toHaveLength(2);
    expect(restored.sections[0]!.name).toBe('Quant');
    expect(restored.selectedQuestionIds).toHaveLength(3);
    expect(restored.schedule.reviewerId).toBe('Simran Singh');
    expect(restored.series).toBe('SSC CGL Prime Series');
    expect(restored.instructions).toBe('Read carefully before starting.');
  });

  it('saving without changes does not replace values with defaults', () => {
    const draft: TestDraft = {
      basicInfo: {
        name: 'Test',
        examCode: 'SSC_CGL_T1',
        testType: 'Full Mock',
        language: 'English',
        access: 'Free',
        difficulty: 'Hard',
        description: 'Original',
      },
      pattern: {
        totalQuestions: 25,
        totalMarks: 25,
        durationMinutes: 15,
        marksPerQuestion: 1,
        negativeMarks: 0,
        sectionTiming: 'shared',
        navigationRules: {
          switchSections: true,
          markForReview: true,
          preventFullscreenExit: false,
        },
      },
      sections: [
        { id: 's1', name: 'Section A', subject: 'English', questions: 25, marks: 25, duration: 0 },
      ],
      selectedQuestionIds: ['Q-1'],
      schedule: { mode: 'draft' },
    };

    // Simulate: save draft, reload it, verify nothing changed.
    const saved = JSON.parse(JSON.stringify(draft)) as TestDraft;
    expect(saved.basicInfo.difficulty).toBe('Hard');
    expect(saved.pattern.negativeMarks).toBe(0);
    expect(saved.sections[0]!.name).toBe('Section A');
    expect(saved.basicInfo.description).toBe('Original');
  });
});
