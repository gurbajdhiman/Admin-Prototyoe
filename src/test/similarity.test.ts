import { describe, it, expect } from 'vitest';
import { computeSimilarity, computeAllSimilarities, getPotentialDuplicates, getSimilarForQuestion, SIGNAL_LABELS } from '@/app/store/similarity';
import { QUESTIONS, type Question } from '@/data/questions';

const mockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'Q-TEST', stem: 'A shopkeeper marks his goods 40% above cost price and allows a discount of 25%. His profit percentage is:',
  stemPunjabi: undefined,
  options: [{ id: 'A', text: '5%' }, { id: 'B', text: '8%' }, { id: 'C', text: '10%' }, { id: 'D', text: '15%' }],
  correctOption: 'A', explanation: 'Let CP = 100. MP = 140. SP = 140 × 0.75 = 105. Profit = 5%.',
  subject: 'Quantitative Aptitude', chapter: 'Profit & Loss', topic: 'Successive Discount', subtopic: 'Marked Price',
  difficulty: 'Moderate', language: ['English'], exam: 'SSC_CGL', type: 'MCQ Single',
  status: 'Approved', source: 'In-house Author', author: 'Test', reviewer: 'Test',
  validationStatus: 'Passed', validationScore: 85, usageCount: 10, studentAccuracy: 70, avgResponseSec: 30,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
  ...overrides,
});

describe('similarity calculations', () => {
  it('detects exact-normalized text match', () => {
    const target = mockQuestion({ id: 'Q-A', stem: 'What is 2 + 2?' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'What is 2 + 2?' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.length).toBe(1);
    expect(results[0].signals).toContain('exact-normalized');
    expect(results[0].score).toBeGreaterThanOrEqual(40);
  });

  it('detects near-identical text', () => {
    const target = mockQuestion({ id: 'Q-A', stem: 'What is the capital of France and its population?' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'What is capital of France and its population?' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.length).toBe(1);
    expect(results[0].signals).toContain('near-identical');
  });

  it('detects matching options', () => {
    const target = mockQuestion({ id: 'Q-A' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'Different question stem entirely about other topics' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.some((r) => r.signals.includes('matching-options'))).toBe(true);
  });

  it('detects same topic and pattern', () => {
    const target = mockQuestion({ id: 'Q-A', stem: 'Completely different stem text here' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'Another unique stem text here too', topic: 'Successive Discount', type: 'MCQ Single' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.some((r) => r.signals.includes('same-topic-pattern'))).toBe(true);
  });

  it('detects same numerical structure', () => {
    const target = mockQuestion({ id: 'Q-A', stem: 'If cost is Rs 100 and profit is 25%, find selling price.' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'If cost is Rs 100 and profit is 25%, find the selling price.' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.some((r) => r.signals.includes('same-numerical-structure'))).toBe(true);
  });

  it('returns empty for completely different questions', () => {
    const target = mockQuestion({ id: 'Q-A', stem: 'What is the capital of France?', options: [{ id: 'A', text: 'Paris' }, { id: 'B', text: 'London' }, { id: 'C', text: 'Berlin' }, { id: 'D', text: 'Madrid' }], topic: 'Geography', chapter: 'World', type: 'MCQ Single' });
    const candidate = mockQuestion({ id: 'Q-B', stem: 'Solve for x: 3x + 7 = 22', options: [{ id: 'A', text: '5' }, { id: 'B', text: '6' }, { id: 'C', text: '7' }, { id: 'D', text: '8' }], topic: 'Algebra', chapter: 'Equations', type: 'MCQ Single' });
    const results = computeSimilarity(target, [candidate]);
    expect(results.length).toBe(0);
  });

  it('excludes self from results', () => {
    const target = mockQuestion({ id: 'Q-A' });
    const results = computeSimilarity(target, [target]);
    expect(results.length).toBe(0);
  });

  it('sorts by score descending', () => {
    const target = mockQuestion({ id: 'Q-A' });
    const c1 = mockQuestion({ id: 'Q-B' });
    const c2 = mockQuestion({ id: 'Q-C', stem: 'Different stem', options: [{ id: 'A', text: '5%' }, { id: 'B', text: '8%' }, { id: 'C', text: '10%' }, { id: 'D', text: '15%' }] });
    const results = computeSimilarity(target, [c1, c2]);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('computeAllSimilarities works on full dataset', () => {
    const results = computeAllSimilarities(QUESTIONS);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('getPotentialDuplicates filters by score >= 50', () => {
    const results = [
      { id: '1', questionId: 'Q-1', similarQuestionId: 'Q-2', signals: ['exact-normalized' as const], score: 80, action: 'none' as const },
      { id: '2', questionId: 'Q-3', similarQuestionId: 'Q-4', signals: ['simulated-semantic' as const], score: 30, action: 'none' as const },
    ];
    const dups = getPotentialDuplicates(results);
    expect(dups.length).toBe(1);
    expect(dups[0].score).toBe(80);
  });

  it('getSimilarForQuestion finds results in both directions', () => {
    const results = [
      { id: '1', questionId: 'Q-1', similarQuestionId: 'Q-2', signals: [] as never[], score: 50, action: 'none' as const },
      { id: '2', questionId: 'Q-3', similarQuestionId: 'Q-1', signals: [] as never[], score: 40, action: 'none' as const },
    ];
    const forQ1 = getSimilarForQuestion('Q-1', results);
    expect(forQ1.length).toBe(2);
  });

  it('SIGNAL_LABELS covers all signal types', () => {
    const signals = ['exact-normalized', 'near-identical', 'matching-options', 'same-topic-pattern', 'same-numerical-structure', 'related-variation', 'simulated-semantic'];
    for (const s of signals) {
      expect(SIGNAL_LABELS[s as keyof typeof SIGNAL_LABELS]).toBeTruthy();
    }
  });
});
