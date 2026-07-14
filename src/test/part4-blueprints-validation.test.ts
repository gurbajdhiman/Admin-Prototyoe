import { describe, it, expect } from 'vitest';
import { validateBlueprint, canActivateBlueprint, compareBlueprints } from '@/app/store/blueprint-validation';
import { runAutoAssembly, explainShortages } from '@/app/store/auto-assembly';
import { validateDraft, canPublish, validateDraftComprehensive, classifyIssues, hasBlockingErrors } from '@/app/store/validation';
import type { Blueprint, BlueprintSection } from '@/data/tests';
import type { TestDraft, AutoAssemblyRule } from '@/app/store/types';
import type { Question } from '@/data/questions';

const mockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'Q-1001', stem: 'Test stem', stemPunjabi: undefined,
  options: [{ id: 'A', text: 'Option A' }, { id: 'B', text: 'Option B' }, { id: 'C', text: 'Option C' }, { id: 'D', text: 'Option D' }],
  correctOption: 'A', explanation: 'Test explanation',
  subject: 'Quantitative Aptitude', chapter: 'Algebra', topic: 'Linear', subtopic: 'Basic',
  difficulty: 'Moderate', language: ['English'], exam: 'SSC_CGL', type: 'MCQ Single',
  status: 'Approved', source: 'In-house', author: 'Test', reviewer: null,
  validationStatus: 'Passed', validationScore: 85, usageCount: 0, studentAccuracy: 0, avgResponseSec: 0,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
  ...overrides,
});

const mockBlueprint = (overrides: Partial<Blueprint> = {}): Blueprint => ({
  id: 'BP-TEST', name: 'Test Blueprint', exam: 'SSC_CGL_T1', examName: 'SSC CGL Tier 1',
  stage: 'Tier 1', version: 1,
  sections: [
    { name: 'Quant', subject: 'Quantitative Aptitude', questions: 25, marks: 50, duration: 0 },
    { name: 'Reasoning', subject: 'Reasoning Ability', questions: 25, marks: 50, duration: 0 },
  ],
  totalQuestions: 50, totalMarks: 100, durationMin: 60, negativeMarking: 0.25,
  languages: ['English', 'Hindi'], sectionTiming: 'shared',
  navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false },
  translationRequirements: ['Hindi'], previousYearTarget: 15, repetitionLimit: 3,
  effectiveDate: '2024-09-01', status: 'Draft', patternVersion: 'v1.0',
  createdAt: '2024-09-01', updatedAt: '2024-09-01',
  ...overrides,
});

const mockDraft = (overrides: Partial<TestDraft> = {}): TestDraft => ({
  basicInfo: {
    name: 'Test Mock', examCode: 'SSC_CGL_T1', testType: 'Full Mock',
    language: 'English', access: 'Free', difficulty: 'Moderate', description: '',
  },
  pattern: {
    totalQuestions: 50, totalMarks: 100, durationMinutes: 60,
    marksPerQuestion: 2, negativeMarks: 0.25, sectionTiming: 'shared',
    navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false },
  },
  sections: [
    { id: 's1', name: 'Quant', subject: 'Quantitative Aptitude', questions: 25, marks: 50, duration: 0 },
    { id: 's2', name: 'Reasoning', subject: 'Reasoning Ability', questions: 25, marks: 50, duration: 0 },
  ],
  selectedQuestionIds: [],
  schedule: { mode: 'draft' },
  ...overrides,
});

const mockRule = (overrides: Partial<AutoAssemblyRule> = {}): AutoAssemblyRule => ({
  questionCount: 10,
  difficultyDistribution: { Easy: 30, Moderate: 50, Hard: 20 },
  requiredLanguages: ['English'],
  maxReuse: 5,
  excludeRecentlyUsed: false,
  previousYearPercent: 20,
  minQualityScore: 70,
  onlyApproved: true,
  maxPerSubtopic: 3,
  ...overrides,
});

describe('blueprint validation', () => {
  it('passes a valid blueprint', () => {
    const issues = validateBlueprint(mockBlueprint());
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('detects empty name', () => {
    const issues = validateBlueprint(mockBlueprint({ name: '' }));
    expect(issues.some((i) => i.id === 'bp-name')).toBe(true);
  });

  it('detects missing exam', () => {
    const issues = validateBlueprint(mockBlueprint({ exam: '' }));
    expect(issues.some((i) => i.id === 'bp-exam')).toBe(true);
  });

  it('detects section question mismatch', () => {
    const sections: BlueprintSection[] = [
      { name: 'Quant', subject: 'Quant', questions: 20, marks: 50, duration: 0 },
      { name: 'Reasoning', subject: 'Reasoning', questions: 20, marks: 50, duration: 0 },
    ];
    const issues = validateBlueprint(mockBlueprint({ sections, totalQuestions: 50 }));
    expect(issues.some((i) => i.id === 'bp-q-mismatch')).toBe(true);
  });

  it('detects negative repetition limit', () => {
    const issues = validateBlueprint(mockBlueprint({ repetitionLimit: -1 }));
    expect(issues.some((i) => i.id === 'bp-rep-limit')).toBe(true);
  });

  it('canActivateBlueprint returns false for invalid', () => {
    expect(canActivateBlueprint(mockBlueprint({ name: '' }))).toBe(false);
    expect(canActivateBlueprint(mockBlueprint())).toBe(true);
  });

  it('compareBlueprints finds differences', () => {
    const bp1 = mockBlueprint();
    const bp2 = mockBlueprint({ totalQuestions: 60, durationMin: 90 });
    const diffs = compareBlueprints(bp1, bp2);
    expect(diffs.some((d) => d.field === 'totalQuestions')).toBe(true);
    expect(diffs.some((d) => d.field === 'durationMin')).toBe(true);
    expect(diffs.some((d) => d.field === 'name')).toBe(false);
  });
});

describe('auto-assembly', () => {
  it('selects questions up to the requested count', () => {
    const questions = Array.from({ length: 20 }).map((_, i) =>
      mockQuestion({ id: `Q-${i}`, subtopic: `sub-${i % 5}` }),
    );
    const result = runAutoAssembly(questions, mockRule({ questionCount: 10 }));
    expect(result.selectedIds.length).toBe(10);
  });

  it('respects onlyApproved filter', () => {
    const questions = [
      mockQuestion({ id: 'Q-1', status: 'Approved' }),
      mockQuestion({ id: 'Q-2', status: 'Draft' }),
    ];
    const result = runAutoAssembly(questions, mockRule({ questionCount: 1, onlyApproved: true }));
    expect(result.selectedIds).toContain('Q-1');
    expect(result.selectedIds).not.toContain('Q-2');
  });

  it('respects minQualityScore filter', () => {
    const questions = [
      mockQuestion({ id: 'Q-1', validationScore: 90 }),
      mockQuestion({ id: 'Q-2', validationScore: 50 }),
    ];
    const result = runAutoAssembly(questions, mockRule({ questionCount: 1, minQualityScore: 70 }));
    expect(result.selectedIds).toContain('Q-1');
    expect(result.selectedIds).not.toContain('Q-2');
  });

  it('reports shortages when not enough questions', () => {
    const questions = Array.from({ length: 5 }).map((_, i) =>
      mockQuestion({ id: `Q-${i}`, subtopic: `sub-${i}` }),
    );
    const result = runAutoAssembly(questions, mockRule({ questionCount: 20 }));
    expect(result.shortages.length).toBeGreaterThan(0);
    expect(result.unmetConstraints.length).toBeGreaterThan(0);
  });

  it('explainShortages returns human-readable strings', () => {
    const result = runAutoAssembly([], mockRule({ questionCount: 5 }));
    const explanations = explainShortages(result);
    expect(explanations.length).toBeGreaterThan(0);
    expect(explanations[0]).toContain('need');
    expect(explanations[0]).toContain('available');
  });

  it('respects maxPerSubtopic limit', () => {
    const questions = Array.from({ length: 10 }).map((_, i) =>
      mockQuestion({ id: `Q-${i}`, subtopic: 'same-subtopic', usageCount: 0 }),
    );
    const result = runAutoAssembly(questions, mockRule({ questionCount: 10, maxPerSubtopic: 2 }));
    expect(result.selectedIds.length).toBeLessThanOrEqual(2);
  });

  it('excludes recently used when configured', () => {
    const questions = [
      mockQuestion({ id: 'Q-1' }),
      mockQuestion({ id: 'Q-2' }),
    ];
    const result = runAutoAssembly(questions, mockRule({ questionCount: 1, excludeRecentlyUsed: true }), ['Q-1']);
    expect(result.selectedIds).toContain('Q-2');
    expect(result.selectedIds).not.toContain('Q-1');
  });
});

describe('comprehensive validation', () => {
  it('detects missing question text', () => {
    const questions = [mockQuestion({ id: 'Q-1', stem: '' })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    expect(issues.some((i) => i.id === 'missing-stem-Q-1')).toBe(true);
  });

  it('detects duplicate options', () => {
    const questions = [mockQuestion({ id: 'Q-1', options: [
      { id: 'A', text: 'Same' }, { id: 'B', text: 'Same' }, { id: 'C', text: 'C' }, { id: 'D', text: 'D' },
    ] })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    expect(issues.some((i) => i.id === 'dup-options-Q-1')).toBe(true);
  });

  it('detects invalid correct answer', () => {
    const questions = [mockQuestion({ id: 'Q-1', correctOption: 'Z' })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    expect(issues.some((i) => i.id === 'invalid-correct-Q-1')).toBe(true);
  });

  it('detects rejected question selected', () => {
    const questions = [mockQuestion({ id: 'Q-1', status: 'Rejected' })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    expect(issues.some((i) => i.id === 'bad-status-Q-1')).toBe(true);
  });

  it('detects missing explanation as warning', () => {
    const questions = [mockQuestion({ id: 'Q-1', explanation: '' })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    const explIssue = issues.find((i) => i.id === 'missing-explanation-Q-1');
    expect(explIssue).toBeDefined();
    expect(explIssue!.severity).toBe('warning');
  });

  it('detects blueprint deviation', () => {
    const bp = mockBlueprint({ totalQuestions: 100, durationMin: 120 });
    const draft = mockDraft({ pattern: { ...mockDraft().pattern, totalQuestions: 50, durationMinutes: 60 } });
    const issues = validateDraftComprehensive(draft, [], bp);
    expect(issues.some((i) => i.id === 'bp-q-deviation')).toBe(true);
    expect(issues.some((i) => i.id === 'bp-d-deviation')).toBe(true);
  });

  it('detects excessive question reuse', () => {
    const questions = [mockQuestion({ id: 'Q-1', usageCount: 10 })];
    const draft = mockDraft({ selectedQuestionIds: ['Q-1'] });
    const issues = validateDraftComprehensive(draft, questions);
    expect(issues.some((i) => i.id === 'excessive-reuse')).toBe(true);
  });
});

describe('validation classification', () => {
  it('classifyIssues separates by severity', () => {
    const draft = mockDraft({
      basicInfo: { ...mockDraft().basicInfo, name: '' },
      sections: [],
    });
    const issues = validateDraft(draft);
    const classified = classifyIssues(issues);
    expect(classified.errors.length).toBeGreaterThan(0);
    expect(classified.errors.every((i) => i.severity === 'error')).toBe(true);
  });

  it('hasBlockingErrors returns true when errors exist', () => {
    const draft = mockDraft({ basicInfo: { ...mockDraft().basicInfo, name: '' } });
    const issues = validateDraft(draft);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it('hasBlockingErrors returns false when only warnings', () => {
    const draft = mockDraft({
      sections: [
        { id: 's1', name: 'A', subject: 'X', questions: 10, marks: 20, duration: 0 },
        { id: 's2', name: 'A', subject: 'Y', questions: 10, marks: 20, duration: 0 },
      ],
    });
    const issues = validateDraft(draft);
    expect(hasBlockingErrors(issues)).toBe(false);
  });
});

describe('hard validation blocking', () => {
  it('canPublish returns false for empty name', () => {
    const draft = mockDraft({ basicInfo: { ...mockDraft().basicInfo, name: '' } });
    expect(canPublish(draft)).toBe(false);
  });

  it('canPublish returns false for no sections', () => {
    const draft = mockDraft({ sections: [] });
    expect(canPublish(draft)).toBe(false);
  });

  it('canPublish returns true for valid draft', () => {
    expect(canPublish(mockDraft())).toBe(true);
  });

  it('canPublish returns false for past scheduled date', () => {
    const draft = mockDraft({
      schedule: { mode: 'scheduled', publishAt: '2020-01-01' },
    });
    expect(canPublish(draft)).toBe(false);
  });
});

describe('warning handling', () => {
  it('section question sum mismatch is a warning, not error', () => {
    const draft = mockDraft({
      sections: [{ id: 's1', name: 'Quant', subject: 'Quant', questions: 30, marks: 60, duration: 0 }],
    });
    const issues = validateDraft(draft);
    const sumIssue = issues.find((i) => i.id === 'section-q-sum');
    expect(sumIssue).toBeDefined();
    expect(sumIssue!.severity).toBe('warning');
  });

  it('duplicate section name is a warning', () => {
    const draft = mockDraft({
      sections: [
        { id: 's1', name: 'Quant', subject: 'X', questions: 25, marks: 50, duration: 0 },
        { id: 's2', name: 'Quant', subject: 'Y', questions: 25, marks: 50, duration: 0 },
      ],
    });
    const issues = validateDraft(draft);
    const dupIssue = issues.find((i) => i.id === 'section-dup-Quant');
    expect(dupIssue).toBeDefined();
    expect(dupIssue!.severity).toBe('warning');
  });
});
