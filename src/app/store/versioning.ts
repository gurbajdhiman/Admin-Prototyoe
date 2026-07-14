import type { Question } from '@/data/questions';
import type { QuestionVersion } from './types';

const TRACKED_FIELDS: (keyof Question)[] = [
  'stem', 'stemPunjabi', 'options', 'correctOption', 'explanation',
  'difficulty', 'subject', 'chapter', 'topic', 'subtopic', 'type', 'status',
];

function genId(): string {
  return `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diffFields(oldQ: Question, newQ: Question): string[] {
  const changed: string[] = [];
  for (const field of TRACKED_FIELDS) {
    const oldVal = oldQ[field];
    const newVal = newQ[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.push(field);
    }
  }
  return changed;
}

export function hasContentChanges(oldQ: Question, newQ: Question): boolean {
  const contentFields: (keyof Question)[] = ['stem', 'stemPunjabi', 'options', 'correctOption', 'explanation'];
  return contentFields.some((f) => JSON.stringify(oldQ[f]) !== JSON.stringify(newQ[f]));
}

export function createVersion(
  question: Question,
  previousVersion: Question | null,
  versionNumber: number,
  changedBy: string,
  reason: string,
  usedInPublishedTest: boolean,
  frozenUsageCount: number,
): QuestionVersion {
  const changedFields = previousVersion ? diffFields(previousVersion, question) : ['initial'];
  return {
    id: genId(),
    questionId: question.id,
    versionNumber,
    sourceVersionId: undefined,
    snapshot: { ...question },
    changedFields,
    changedBy,
    changedAt: today(),
    reason,
    reviewStatus: question.status,
    frozenUsageCount,
    usedInPublishedTest,
  };
}

export function getNextVersionNumber(versions: QuestionVersion[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
}

export function isFrozen(version: QuestionVersion): boolean {
  return version.usedInPublishedTest && version.frozenUsageCount > 0;
}

export function restoreFromVersion(version: QuestionVersion): Question {
  return { ...version.snapshot, updatedAt: today() };
}

export function compareVersions(v1: QuestionVersion, v2: QuestionVersion): { field: string; v1Value: unknown; v2Value: unknown; differs: boolean }[] {
  const s1 = v1.snapshot, s2 = v2.snapshot;
  const allFields = new Set<keyof Question>([...TRACKED_FIELDS, 'exam', 'language', 'author', 'reviewer', 'source', 'validationStatus', 'validationScore', 'usageCount', 'studentAccuracy', 'avgResponseSec'] as (keyof Question)[]);

  const results: { field: string; v1Value: unknown; v2Value: unknown; differs: boolean }[] = [];
  for (const field of allFields) {
    const val1 = s1[field];
    const val2 = s2[field];
    results.push({
      field: String(field),
      v1Value: val1,
      v2Value: val2,
      differs: JSON.stringify(val1) !== JSON.stringify(val2),
    });
  }
  return results.filter((r) => r.differs);
}

export function shouldCreateVersion(oldQ: Question, newQ: Question): boolean {
  return hasContentChanges(oldQ, newQ);
}
