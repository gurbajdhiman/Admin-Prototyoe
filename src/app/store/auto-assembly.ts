import type { Question } from '@/data/questions';
import type { AutoAssemblyRule, AutoAssemblyResult } from './types';

export function runAutoAssembly(
  allQuestions: Question[],
  rule: AutoAssemblyRule,
  recentlyUsedIds: string[] = [],
): AutoAssemblyResult {
  const shortages: { constraint: string; needed: number; available: number }[] = [];
  const unmetConstraints: string[] = [];

  let eligible = allQuestions.filter((q) => {
    if (rule.onlyApproved && q.status !== 'Approved') return false;
    if (q.validationScore < rule.minQualityScore) return false;
    if (rule.requiredLanguages.length > 0 && !rule.requiredLanguages.every((lang) => q.language.includes(lang))) return false;
    return true;
  });

  if (rule.excludeRecentlyUsed) {
    const recentSet = new Set(recentlyUsedIds);
    eligible = eligible.filter((q) => !recentSet.has(q.id));
  }

  const totalQ = rule.questionCount;
  const pyTarget = Math.round((totalQ * rule.previousYearPercent) / 100);
  const pyQuestions = eligible.filter((q) => q.source === 'Previous Year');
  const nonPyQuestions = eligible.filter((q) => q.source !== 'Previous Year');

  const easyTarget = Math.round((totalQ * rule.difficultyDistribution.Easy) / 100);
  const modTarget = Math.round((totalQ * rule.difficultyDistribution.Moderate) / 100);
  const hardTarget = Math.round((totalQ * rule.difficultyDistribution.Hard) / 100);

  if (pyQuestions.length < pyTarget) {
    shortages.push({ constraint: 'Previous Year questions', needed: pyTarget, available: pyQuestions.length });
  }
  const easyEligible = eligible.filter((q) => q.difficulty === 'Easy');
  if (easyEligible.length < easyTarget) {
    shortages.push({ constraint: 'Easy questions', needed: easyTarget, available: easyEligible.length });
  }
  const modEligible = eligible.filter((q) => q.difficulty === 'Moderate');
  if (modEligible.length < modTarget) {
    shortages.push({ constraint: 'Moderate questions', needed: modTarget, available: modEligible.length });
  }
  const hardEligible = eligible.filter((q) => q.difficulty === 'Hard');
  if (hardEligible.length < hardTarget) {
    shortages.push({ constraint: 'Hard questions', needed: hardTarget, available: hardEligible.length });
  }

  if (eligible.length < totalQ) {
    shortages.push({ constraint: 'Total eligible questions', needed: totalQ, available: eligible.length });
    unmetConstraints.push(`Need ${totalQ} questions but only ${eligible.length} are eligible.`);
  }

  const selected: Question[] = [];
  const subtopicCount: Record<string, number> = {};

  const tryAdd = (q: Question): boolean => {
    if (selected.length >= totalQ) return false;
    if (subtopicCount[q.subtopic] >= rule.maxPerSubtopic) return false;
    if (q.usageCount > rule.maxReuse) return false;
    selected.push(q);
    subtopicCount[q.subtopic] = (subtopicCount[q.subtopic] ?? 0) + 1;
    return true;
  };

  const pyPool = [...pyQuestions].sort((a, b) => a.usageCount - b.usageCount);
  for (const q of pyPool) {
    if (selected.filter((s) => s.source === 'Previous Year').length >= pyTarget) break;
    tryAdd(q);
  }

  const difficultyOrder: [string, number][] = [
    ['Easy', easyTarget],
    ['Moderate', modTarget],
    ['Hard', hardTarget],
  ];

  for (const [diff, target] of difficultyOrder) {
    const pool = nonPyQuestions.filter((q) => q.difficulty === diff).sort((a, b) => a.usageCount - b.usageCount);
    const haveForDiff = selected.filter((s) => s.difficulty === diff).length;
    for (const q of pool) {
      if (selected.filter((s) => s.difficulty === diff).length - haveForDiff >= target - haveForDiff) break;
      tryAdd(q);
    }
  }

  if (selected.length < totalQ) {
    const remaining = eligible.filter((q) => !selected.includes(q)).sort((a, b) => a.usageCount - b.usageCount);
    for (const q of remaining) {
      if (selected.length >= totalQ) break;
      tryAdd(q);
    }
  }

  if (selected.length < totalQ) {
    unmetConstraints.push(`Only ${selected.length} of ${totalQ} questions could be assembled.`);
  }
  if (rule.maxPerSubtopic > 0) {
    const overSubtopics = Object.entries(subtopicCount).filter(([, c]) => c >= rule.maxPerSubtopic);
    if (overSubtopics.length > 0) {
      unmetConstraints.push(`Max per subtopic (${rule.maxPerSubtopic}) reached for: ${overSubtopics.map(([s]) => s).join(', ')}.`);
    }
  }

  return {
    selectedIds: selected.map((q) => q.id),
    shortages,
    unmetConstraints,
  };
}

export function explainShortages(result: AutoAssemblyResult): string[] {
  return result.shortages.map((s) => `${s.constraint}: need ${s.needed}, only ${s.available} available.`);
}
