import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PrototypeStoreProvider, usePrototypeStore } from '@/app/store/PrototypeStore';
import { canTransitionBatch, GENERATION_BATCH_TRANSITIONS } from '@/app/store/status-machines';
import type { GenerationRecipe, QuestionVersion, SimilarityResult, GeneratedBatch } from '@/app/store/types';

const wrapper = ({ children }: { children: React.ReactNode }) => <PrototypeStoreProvider>{children}</PrototypeStoreProvider>;

function genRecipe(id: string): GenerationRecipe {
  return {
    id, name: `Recipe ${id}`, description: 'Test recipe', version: 1,
    exam: 'SSC_CGL', subject: 'Quantitative Aptitude', languages: ['English'],
    difficultyDistribution: { Easy: 30, Moderate: 50, Hard: 20 },
    questionCount: 10, questionType: 'MCQ Single', patternSelection: ['standard'],
    excludePreviousBatch: false, similarityThreshold: 70, validationProfile: 'default',
    priority: 'Normal', generatorVersion: 'v1.0', createdAt: '2024-01-01', updatedAt: '2024-01-01',
  };
}

describe('recipe persistence', () => {
  it('creates a recipe via addRecipe', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => { result.current.addRecipe(genRecipe('r1')); });
    expect(result.current.state.generationRecipes.length).toBe(1);
    expect(result.current.state.generationRecipes[0].id).toBe('r1');
  });

  it('updates a recipe via updateRecipe', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => { result.current.addRecipe(genRecipe('r2')); });
    act(() => {
      const r = result.current.state.generationRecipes.find((x) => x.id === 'r2')!;
      result.current.updateRecipe({ ...r, name: 'Updated' });
    });
    expect(result.current.state.generationRecipes.find((x) => x.id === 'r2')?.name).toBe('Updated');
  });

  it('deletes a recipe via deleteRecipe', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => { result.current.addRecipe(genRecipe('r3')); });
    act(() => { result.current.deleteRecipe('r3'); });
    expect(result.current.state.generationRecipes.find((x) => x.id === 'r3')).toBeUndefined();
  });

  it('creates exactly one audit entry per recipe action', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const before = result.current.state.auditLogs.length;
    act(() => { result.current.addRecipe(genRecipe('r-audit')); });
    expect(result.current.state.auditLogs.length - before).toBe(1);
  });
});

describe('generation status transitions', () => {
  it('allows Draft → Queued', () => {
    expect(canTransitionBatch('Draft', 'Queued')).toBe(true);
  });

  it('allows Queued → Running', () => {
    expect(canTransitionBatch('Queued', 'Running')).toBe(true);
  });

  it('allows Running → Validation', () => {
    expect(canTransitionBatch('Running', 'Validation')).toBe(true);
  });

  it('allows Validation → Review', () => {
    expect(canTransitionBatch('Validation', 'Review')).toBe(true);
  });

  it('allows Review → Approved', () => {
    expect(canTransitionBatch('Review', 'Approved')).toBe(true);
  });

  it('allows Review → Partially Approved', () => {
    expect(canTransitionBatch('Review', 'Partially Approved')).toBe(true);
  });

  it('allows Failed → Draft (retry)', () => {
    expect(canTransitionBatch('Failed', 'Draft')).toBe(true);
  });

  it('allows Failed → Queued (retry)', () => {
    expect(canTransitionBatch('Failed', 'Queued')).toBe(true);
  });

  it('allows Cancelled → Draft', () => {
    expect(canTransitionBatch('Cancelled', 'Draft')).toBe(true);
  });

  it('blocks Approved → Draft', () => {
    expect(canTransitionBatch('Approved', 'Draft')).toBe(false);
  });

  it('blocks Draft → Approved (must go through lifecycle)', () => {
    expect(canTransitionBatch('Draft', 'Approved')).toBe(false);
  });

  it('blocks Approved → any other status', () => {
    expect(GENERATION_BATCH_TRANSITIONS['Approved']).toEqual([]);
  });
});

describe('batch retry and cancel', () => {
  it('setBatchStatus updates batch status', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const batch: GeneratedBatch = {
      id: 'BAT-TEST', createdAt: '2024-01-01', exam: 'SSC_CGL', subject: 'Quant',
      difficulty: 'Moderate', count: 5, seed: 123, questions: [], status: 'Draft',
    };
    act(() => { result.current.dispatch({ type: 'ADD_GENERATED_BATCH', batch }); });
    act(() => { result.current.setBatchStatus('BAT-TEST', 'Queued'); });
    const updated = result.current.state.generatedBatches.find((b) => b.id === 'BAT-TEST');
    expect(updated?.status).toBe('Queued');
  });

  it('setBatchStatus creates exactly one audit entry', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const batch: GeneratedBatch = {
      id: 'BAT-AUDIT', createdAt: '2024-01-01', exam: 'SSC_CGL', subject: 'Quant',
      difficulty: 'Moderate', count: 5, seed: 123, questions: [], status: 'Draft',
    };
    act(() => { result.current.dispatch({ type: 'ADD_GENERATED_BATCH', batch }); });
    const before = result.current.state.auditLogs.length;
    act(() => { result.current.setBatchStatus('BAT-AUDIT', 'Cancelled'); });
    expect(result.current.state.auditLogs.length - before).toBe(1);
  });
});

describe('version creation and restore', () => {
  it('addQuestionVersion stores a version', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const version: QuestionVersion = {
      id: 'ver-1', questionId: 'Q-1000', versionNumber: 1,
      snapshot: result.current.state.questions[0], changedFields: ['initial'],
      changedBy: 'Test', changedAt: '2024-01-01', reason: 'Initial', reviewStatus: 'Draft',
      frozenUsageCount: 0, usedInPublishedTest: false,
    };
    act(() => { result.current.addQuestionVersion('Q-1000', version); });
    expect(result.current.state.questionVersions['Q-1000']?.length).toBe(1);
  });

  it('addQuestionVersion creates exactly one audit entry', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const before = result.current.state.auditLogs.length;
    const version: QuestionVersion = {
      id: 'ver-2', questionId: 'Q-1000', versionNumber: 1,
      snapshot: result.current.state.questions[0], changedFields: ['initial'],
      changedBy: 'Test', changedAt: '2024-01-01', reason: 'Initial', reviewStatus: 'Draft',
      frozenUsageCount: 0, usedInPublishedTest: false,
    };
    act(() => { result.current.addQuestionVersion('Q-1000', version); });
    expect(result.current.state.auditLogs.length - before).toBe(1);
  });

  it('restoreQuestionVersion restores the snapshot and audits', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const originalQ = result.current.state.questions[0];
    const version: QuestionVersion = {
      id: 'ver-restore', questionId: originalQ.id, versionNumber: 1,
      snapshot: { ...originalQ, stem: 'Old restored stem' }, changedFields: ['stem'],
      changedBy: 'Test', changedAt: '2024-01-01', reason: 'Restore test', reviewStatus: 'Draft',
      frozenUsageCount: 0, usedInPublishedTest: false,
    };
    act(() => { result.current.addQuestionVersion(originalQ.id, version); });
    const before = result.current.state.auditLogs.length;
    act(() => { result.current.restoreQuestionVersion(originalQ.id, 'ver-restore'); });
    const restored = result.current.state.questions.find((q) => q.id === originalQ.id);
    expect(restored?.stem).toBe('Old restored stem');
    expect(result.current.state.auditLogs.length - before).toBe(1);
  });
});

describe('similarity result actions', () => {
  it('updateSimilarityResult updates a result and audits', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const simResult: SimilarityResult = {
      id: 'sim-1', questionId: 'Q-1', similarQuestionId: 'Q-2',
      signals: ['exact-normalized'], score: 80, action: 'none',
    };
    act(() => { result.current.setSimilarityResults([simResult]); });
    const before = result.current.state.auditLogs.length;
    act(() => { result.current.updateSimilarityResult({ ...simResult, action: 'rejected-duplicate' }); });
    expect(result.current.state.similarityResults[0].action).toBe('rejected-duplicate');
    expect(result.current.state.auditLogs.length - before).toBe(1);
  });
});
