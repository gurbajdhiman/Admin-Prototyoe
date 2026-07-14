import { describe, it, expect } from 'vitest';
import { calculateCoverageTree, flattenCoverage, getCoverageGaps, getCoverageWarnings } from '@/app/store/coverage';
import { QUESTIONS } from '@/data/questions';
import { EXAMS } from '@/data/exams';

describe('coverage calculations', () => {
  it('builds a tree from real question data', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    expect(tree.length).toBeGreaterThan(0);
    const family = tree[0];
    expect(family.level).toBe('family');
    expect(family.children.length).toBeGreaterThan(0);
    expect(family.totalCount).toBeGreaterThan(0);
  });

  it('accumulates status counts correctly at family level', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    for (const family of tree) {
      const familyQuestions = QUESTIONS.filter((q) => {
        const exam = EXAMS.find((e) => e.code === q.exam);
        return exam?.family === family.label;
      });
      const expectedApproved = familyQuestions.filter((q) => q.status === 'Approved').length;
      expect(family.approved).toBe(expectedApproved);
      expect(family.totalCount).toBe(familyQuestions.length);
    }
  });

  it('counts language breakdowns correctly', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    const family = tree[0];
    const familyQuestions = QUESTIONS.filter((q) => {
      const exam = EXAMS.find((e) => e.code === q.exam);
      return exam?.family === family.label;
    });
    const expectedEnglish = familyQuestions.filter((q) => q.language.includes('English')).length;
    expect(family.englishCount).toBe(expectedEnglish);
  });

  it('calculates coverage percentage from approved vs target', () => {
    const tree = calculateCoverageTree(QUESTIONS, {});
    const flat = flattenCoverage(tree);
    for (const node of flat) {
      if (node.targetCount > 0) {
        expect(node.coveragePercentage).toBe(Math.round((node.approved / node.targetCount) * 100));
      }
    }
  });

  it('computes gap count as target minus approved', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    const flat = flattenCoverage(tree);
    for (const node of flat) {
      expect(node.gapCount).toBe(Math.max(0, node.targetCount - node.approved));
    }
  });

  it('identifies coverage gaps correctly', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    const gaps = getCoverageGaps(tree);
    for (const g of gaps) {
      expect(g.gapCount).toBeGreaterThan(0);
    }
  });

  it('identifies coverage warnings (< 70%)', () => {
    const tree = calculateCoverageTree(QUESTIONS);
    const warnings = getCoverageWarnings(tree);
    for (const w of warnings) {
      expect(w.coveragePercentage).toBeLessThan(70);
    }
  });

  it('handles empty question list', () => {
    const tree = calculateCoverageTree([]);
    expect(tree).toEqual([]);
  });

  it('handles custom targets', () => {
    const tree = calculateCoverageTree(QUESTIONS, {});
    const flat = flattenCoverage(tree);
    const subtopic = flat.find((n) => n.level === 'subtopic');
    if (subtopic) {
      const customTree = calculateCoverageTree(QUESTIONS, { [subtopic.id]: 999 });
      const customFlat = flattenCoverage(customTree);
      const customSub = customFlat.find((n) => n.id === subtopic.id);
      expect(customSub?.targetCount).toBe(999);
      expect(customSub?.gapCount).toBe(999 - customSub!.approved);
    }
  });
});
