import type { Question } from '@/data/questions';
import type { SimilarityResult, SimilaritySignal } from './types';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u0A00-\u0A7F\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarityRatio(a: string, b: string): number {
  const na = normalizeText(a), nb = normalizeText(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

function optionsText(q: Question): string {
  return q.options.map((o) => o.text).join(' ');
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+\.?\d*/g);
  return matches ? matches.map(Number) : [];
}

function numbersMatch(a: number[], b: number[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  return a.every((n, i) => n === b[i]);
}

export function computeSimilarity(target: Question, candidates: Question[]): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const candidate of candidates) {
    if (candidate.id === target.id) continue;

    const signals: SimilaritySignal[] = [];
    let score = 0;

    const stemSim = similarityRatio(target.stem, candidate.stem);
    if (stemSim === 1) {
      signals.push('exact-normalized');
      score += 40;
    } else if (stemSim >= 0.85) {
      signals.push('near-identical');
      score += 25;
    }

    const optSim = similarityRatio(optionsText(target), optionsText(candidate));
    if (optSim >= 0.8) {
      signals.push('matching-options');
      score += 20;
    }

    if (target.topic === candidate.topic && target.type === candidate.type) {
      signals.push('same-topic-pattern');
      score += 10;
    }

    const targetNums = extractNumbers(target.stem);
    const candidateNums = extractNumbers(candidate.stem);
    if (numbersMatch(targetNums, candidateNums) && targetNums.length > 0) {
      signals.push('same-numerical-structure');
      score += 15;
    }

    if (target.subject === candidate.subject && target.chapter === candidate.chapter && stemSim >= 0.5) {
      signals.push('related-variation');
      score += 5;
    }

    const semanticScore = Math.round((stemSim * 0.5 + optSim * 0.3 + (target.topic === candidate.topic ? 0.2 : 0)) * 100);
    if (semanticScore >= 40) {
      signals.push('simulated-semantic');
      score += Math.round(semanticScore * 0.1);
    }

    if (signals.length > 0 && score > 0) {
      results.push({
        id: `sim-${target.id}-${candidate.id}`,
        questionId: target.id,
        similarQuestionId: candidate.id,
        signals,
        score: Math.min(100, score),
        action: 'none',
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function computeAllSimilarities(questions: Question[]): SimilarityResult[] {
  const all: SimilarityResult[] = [];
  for (const q of questions) {
    const results = computeSimilarity(q, questions);
    all.push(...results.filter((r) => !all.some((existing) =>
      (existing.questionId === r.similarQuestionId && existing.similarQuestionId === r.questionId)
    )));
  }
  return all.sort((a, b) => b.score - a.score);
}

export function getPotentialDuplicates(results: SimilarityResult[]): SimilarityResult[] {
  return results.filter((r) => r.score >= 50 && (r.signals.includes('exact-normalized') || r.signals.includes('near-identical')));
}

export function getSimilarForQuestion(questionId: string, results: SimilarityResult[]): SimilarityResult[] {
  return results.filter((r) => r.questionId === questionId || r.similarQuestionId === questionId);
}

export const SIGNAL_LABELS: Record<SimilaritySignal, string> = {
  'exact-normalized': 'Exact text match',
  'near-identical': 'Near-identical text',
  'matching-options': 'Matching options',
  'same-topic-pattern': 'Same topic & pattern',
  'same-numerical-structure': 'Same numerical structure',
  'related-variation': 'Related variation',
  'simulated-semantic': 'Simulated semantic similarity',
};
